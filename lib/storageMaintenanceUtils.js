// lib/storageMaintenanceUtils.js
import zipLifecycleManager from './zipLifecycleManager.js';
import projectPermanentStorage from './projectPermanentStorage.js';
import { deleteZipFromCloudinary } from './cloudinary.js';
import connectDB from './mongodb.js';
import Project from '../models/project.js';
import CodeZip from '../models/codeZip.js';
import User from '../models/user.js';

/**
 * Utilities for storage cleanup, maintenance, and quota management
 */
export class StorageMaintenanceUtils {
    constructor() {
        this.defaultQuotaLimits = {
            freeUser: 500 * 1024 * 1024, // 500MB
            premiumUser: 5 * 1024 * 1024 * 1024, // 5GB
            adminUser: 50 * 1024 * 1024 * 1024, // 50GB
        };
        this.retentionPolicies = {
            cache: 30, // days
            permanent: 365, // days
            versions: 10, // max versions per project
        };
    }

    /**
     * Check and enforce user storage quotas
     * @param {string} userId - User ID to check
     * @param {Object} options - Options
     * @returns {Promise<Object>} - Quota status and actions taken
     */
    async enforceUserQuota(userId, options = {}) {
        try {
            await connectDB();
            
            const {
                dryRun = false,
                autoCleanup = true,
                notifyUser = false
            } = options;

            // Get user info
            const user = await User.findById(userId);
            if (!user) {
                throw new Error(`User not found: ${userId}`);
            }

            // Determine quota limit based on user type
            let quotaLimit = this.defaultQuotaLimits.freeUser;
            if (user.subscription === 'premium') {
                quotaLimit = this.defaultQuotaLimits.premiumUser;
            } else if (user.role === 'admin') {
                quotaLimit = this.defaultQuotaLimits.adminUser;
            }

            // Get current storage usage
            const storageStats = await zipLifecycleManager.getStorageStats(userId);
            const currentUsage = storageStats.total.storageBytes;
            const usagePercentage = Math.round((currentUsage / quotaLimit) * 100);

            const result = {
                userId,
                userEmail: user.email,
                userType: user.subscription || 'free',
                quotaLimit: this.formatBytes(quotaLimit),
                quotaLimitBytes: quotaLimit,
                currentUsage: storageStats.total.storage,
                currentUsageBytes: currentUsage,
                usagePercentage,
                overQuota: currentUsage > quotaLimit,
                actionsPerformed: [],
                recommendations: []
            };

            // If over quota, take actions
            if (currentUsage > quotaLimit) {
                const overageBytes = currentUsage - quotaLimit;
                result.overageBytes = overageBytes;
                result.overage = this.formatBytes(overageBytes);

                if (autoCleanup && !dryRun) {
                    // Perform cleanup to reduce usage
                    const cleanupResult = await this.performQuotaCleanup(userId, overageBytes);
                    result.actionsPerformed.push(...cleanupResult.actions);
                    
                    // Recalculate usage after cleanup
                    const newStats = await zipLifecycleManager.getStorageStats(userId);
                    result.afterCleanup = {
                        usage: newStats.total.storage,
                        usageBytes: newStats.total.storageBytes,
                        reducedBy: this.formatBytes(currentUsage - newStats.total.storageBytes)
                    };
                }

                // Add recommendations
                result.recommendations = this.generateQuotaRecommendations(result);
            } else {
                // Add general recommendations for near-quota users
                if (usagePercentage > 80) {
                    result.recommendations = this.generateQuotaRecommendations(result);
                }
            }

            return result;

        } catch (error) {
            console.error('Error enforcing user quota:', error);
            throw error;
        }
    }

    /**
     * Perform cleanup to reduce quota usage
     * @private
     */
    async performQuotaCleanup(userId, targetReduction) {
        const actions = [];
        let totalReduced = 0;

        try {
            // Step 1: Clean expired cache files
            const cacheCleanup = await zipLifecycleManager.runCleanup({
                cleanupExpired: false,
                cleanupOldVersions: false,
                cleanupCache: true,
                userId,
                dryRun: false,
                maxAge: 7 // More aggressive - 7 days for over-quota users
            });

            if (cacheCleanup.results.cacheCleanup?.deletedFromCache > 0) {
                actions.push({
                    type: 'cache_cleanup',
                    description: `Cleaned ${cacheCleanup.results.cacheCleanup.deletedFromCache} expired cache files`
                });
            }

            // Step 2: Clean old project versions (keep only 3 for over-quota users)
            const versionCleanup = await zipLifecycleManager.runCleanup({
                cleanupExpired: false,
                cleanupOldVersions: true,
                cleanupCache: false,
                userId,
                dryRun: false
            });

            if (versionCleanup.results.versionCleanup?.deletedVersions > 0) {
                actions.push({
                    type: 'version_cleanup',
                    description: `Removed ${versionCleanup.results.versionCleanup.deletedVersions} old project versions`
                });
            }

            // Step 3: If still over quota, remove oldest projects without recent activity
            if (totalReduced < targetReduction) {
                const oldProjectCleanup = await this.cleanupInactiveProjects(userId, targetReduction - totalReduced);
                actions.push(...oldProjectCleanup.actions);
            }

            return { actions, totalReduced };

        } catch (error) {
            console.error('Error during quota cleanup:', error);
            return { actions, totalReduced };
        }
    }

    /**
     * Clean up inactive projects for over-quota users
     * @private
     */
    async cleanupInactiveProjects(userId, targetReduction) {
        try {
            await connectDB();
            
            const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
            
            const inactiveProjects = await Project.find({
                userId,
                $or: [
                    { 'analytics.lastViewed': { $lt: cutoffDate } },
                    { 'analytics.lastViewed': { $exists: false }, updatedAt: { $lt: cutoffDate } }
                ]
            }).sort({ 'analytics.lastViewed': 1, updatedAt: 1 });

            const actions = [];
            let reducedBytes = 0;

            for (const project of inactiveProjects) {
                if (reducedBytes >= targetReduction) break;

                const projectStorage = project.getTotalStorageUsed();
                
                if (projectStorage > 0) {
                    // Delete generated files but keep project metadata
                    await projectPermanentStorage.deleteProjectVersions(project._id.toString());
                    
                    reducedBytes += projectStorage;
                    actions.push({
                        type: 'inactive_project_cleanup',
                        description: `Removed generated files from inactive project: ${project.name}`,
                        projectId: project._id,
                        freedBytes: projectStorage
                    });
                }
            }

            return { actions, reducedBytes };

        } catch (error) {
            console.error('Error cleaning inactive projects:', error);
            return { actions: [], reducedBytes: 0 };
        }
    }

    /**
     * Generate quota recommendations
     * @private
     */
    generateQuotaRecommendations(quotaResult) {
        const recommendations = [];

        if (quotaResult.usagePercentage > 90) {
            recommendations.push({
                type: 'critical',
                message: 'Your storage is critically full. Consider upgrading your plan or cleaning up old files.',
                action: 'upgrade_plan'
            });
        } else if (quotaResult.usagePercentage > 80) {
            recommendations.push({
                type: 'warning',
                message: 'You are approaching your storage limit. Consider cleaning up old project versions.',
                action: 'cleanup_versions'
            });
        }

        if (quotaResult.overQuota) {
            recommendations.push({
                type: 'urgent',
                message: 'You have exceeded your storage quota. Some features may be limited until you free up space.',
                action: 'immediate_cleanup'
            });
        }

        recommendations.push({
            type: 'info',
            message: 'Regularly clean up old project versions and cache files to optimize storage usage.',
            action: 'regular_maintenance'
        });

        return recommendations;
    }

    /**
     * Perform system-wide maintenance
     * @param {Object} options - Maintenance options
     * @returns {Promise<Object>} - Maintenance results
     */
    async performSystemMaintenance(options = {}) {
        try {
            const {
                dryRun = false,
                cleanupOrphaned = true,
                validateIntegrity = true,
                optimizeStorage = true,
                updateStats = true
            } = options;

            console.log(`🔧 Starting system maintenance (${dryRun ? 'DRY RUN' : 'LIVE'})...`);

            const results = {
                orphanedCleanup: null,
                integrityCheck: null,
                storageOptimization: null,
                statsUpdate: null,
                summary: {}
            };

            // Clean up orphaned files
            if (cleanupOrphaned) {
                results.orphanedCleanup = await this.cleanupOrphanedFiles(dryRun);
            }

            // Validate data integrity
            if (validateIntegrity) {
                results.integrityCheck = await this.validateDataIntegrity(dryRun);
            }

            // Optimize storage
            if (optimizeStorage) {
                results.storageOptimization = await this.optimizeStorage(dryRun);
            }

            // Update storage statistics
            if (updateStats) {
                results.statsUpdate = await this.updateStorageStatistics(dryRun);
            }

            // Generate summary
            results.summary = this.summarizeMaintenanceResults(results);

            console.log('✅ System maintenance completed:', results.summary);

            return results;

        } catch (error) {
            console.error('Error during system maintenance:', error);
            throw error;
        }
    }

    /**
     * Clean up orphaned files (files in Cloudinary but not in database)
     * @private
     */
    async cleanupOrphanedFiles(dryRun) {
        try {
            // This would require Cloudinary API to list all files
            // and cross-reference with database entries
            // Implementation depends on your Cloudinary setup and API limits
            
            console.log('🔍 Orphaned file cleanup not yet implemented (requires Cloudinary API integration)');
            
            return {
                checked: 0,
                orphaned: 0,
                deleted: 0,
                message: 'Orphaned file cleanup requires Cloudinary API integration'
            };

        } catch (error) {
            console.error('Error cleaning orphaned files:', error);
            return {
                checked: 0,
                orphaned: 0,
                deleted: 0,
                error: error.message
            };
        }
    }

    /**
     * Validate data integrity
     * @private
     */
    async validateDataIntegrity(dryRun) {
        try {
            await connectDB();
            
            const issues = [];
            let fixedIssues = 0;

            // Check for projects with invalid generated files references
            const projects = await Project.find({
                'generatedFiles.zipFile.cloudinaryUrl': { $exists: true }
            });

            for (const project of projects) {
                if (!project.generatedFiles.zipFile.cloudinaryPublicId) {
                    issues.push({
                        type: 'missing_public_id',
                        projectId: project._id,
                        projectName: project.name
                    });

                    if (!dryRun) {
                        // Could attempt to extract public ID from URL
                        // For now, just log the issue
                        console.log(`⚠️ Project ${project.name} has URL but no public ID`);
                    }
                }
            }

            // Check for CodeZip entries with invalid references
            const codeZips = await CodeZip.find({ status: 'active' });
            
            for (const codeZip of codeZips) {
                if (!codeZip.cloudinaryUrl || !codeZip.cloudinaryPublicId) {
                    issues.push({
                        type: 'invalid_codezip',
                        codeZipId: codeZip._id,
                        projectName: codeZip.projectName
                    });

                    if (!dryRun) {
                        codeZip.status = 'deleted';
                        await codeZip.save();
                        fixedIssues++;
                    }
                }
            }

            return {
                totalIssues: issues.length,
                fixedIssues,
                issues: dryRun ? issues : []
            };

        } catch (error) {
            console.error('Error validating data integrity:', error);
            return {
                totalIssues: 0,
                fixedIssues: 0,
                error: error.message
            };
        }
    }

    /**
     * Optimize storage usage
     * @private
     */
    async optimizeStorage(dryRun) {
        try {
            const results = await zipLifecycleManager.runCleanup({
                cleanupExpired: true,
                cleanupOldVersions: true,
                cleanupCache: true,
                dryRun,
                maxAge: this.retentionPolicies.cache
            });

            return {
                optimized: true,
                ...results.summary
            };

        } catch (error) {
            console.error('Error optimizing storage:', error);
            return {
                optimized: false,
                error: error.message
            };
        }
    }

    /**
     * Update storage statistics
     * @private
     */
    async updateStorageStatistics(dryRun) {
        try {
            const globalStats = await zipLifecycleManager.getStorageStats();
            
            if (!dryRun) {
                // Could store these stats in a separate collection for historical tracking
                console.log('📊 Global storage stats updated:', globalStats);
            }

            return {
                updated: true,
                globalStats: dryRun ? null : globalStats
            };

        } catch (error) {
            console.error('Error updating storage statistics:', error);
            return {
                updated: false,
                error: error.message
            };
        }
    }

    /**
     * Summarize maintenance results
     * @private
     */
    summarizeMaintenanceResults(results) {
        const summary = {
            tasksCompleted: 0,
            totalIssuesFound: 0,
            totalIssuesFixed: 0,
            storageOptimized: false
        };

        if (results.orphanedCleanup) {
            summary.tasksCompleted++;
            summary.orphanedFiles = results.orphanedCleanup.deleted || 0;
        }

        if (results.integrityCheck) {
            summary.tasksCompleted++;
            summary.totalIssuesFound += results.integrityCheck.totalIssues || 0;
            summary.totalIssuesFixed += results.integrityCheck.fixedIssues || 0;
        }

        if (results.storageOptimization) {
            summary.tasksCompleted++;
            summary.storageOptimized = results.storageOptimization.optimized;
        }

        if (results.statsUpdate) {
            summary.tasksCompleted++;
            summary.statsUpdated = results.statsUpdate.updated;
        }

        return summary;
    }

    /**
     * Get storage health report
     * @returns {Promise<Object>} - Health report
     */
    async getStorageHealthReport() {
        try {
            const globalStats = await zipLifecycleManager.getStorageStats();
            
            // Check for potential issues
            const issues = [];
            const recommendations = [];

            if (globalStats.total.storageBytes > 10 * 1024 * 1024 * 1024) { // > 10GB
                issues.push({
                    severity: 'medium',
                    type: 'high_storage_usage',
                    message: 'System storage usage is high',
                    value: globalStats.total.storage
                });

                recommendations.push({
                    type: 'cleanup',
                    message: 'Consider running system maintenance to clean up old files'
                });
            }

            if (globalStats.cache.expiredZips > 100) {
                issues.push({
                    severity: 'low',
                    type: 'expired_cache_files',
                    message: 'Many expired cache files detected',
                    value: globalStats.cache.expiredZips
                });

                recommendations.push({
                    type: 'cache_cleanup',
                    message: 'Run cache cleanup to remove expired files'
                });
            }

            return {
                timestamp: new Date(),
                overallHealth: issues.length === 0 ? 'healthy' : 
                             issues.some(i => i.severity === 'high') ? 'critical' :
                             issues.some(i => i.severity === 'medium') ? 'warning' : 'good',
                statistics: globalStats,
                issues,
                recommendations,
                nextMaintenanceRecommended: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            };

        } catch (error) {
            console.error('Error generating storage health report:', error);
            throw error;
        }
    }

    /**
     * Format bytes to human readable format
     * @private
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create singleton instance
const storageMaintenanceUtils = new StorageMaintenanceUtils();

export default storageMaintenanceUtils;