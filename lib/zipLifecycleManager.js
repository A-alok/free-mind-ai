// lib/zipLifecycleManager.js
import projectPermanentStorage from './projectPermanentStorage.js';
import zipCacheService from './zipCacheService.js';
import { deleteZipFromCloudinary } from './cloudinary.js';
import connectDB from './mongodb.js';
import Project from '../models/project.js';
import CodeZip from '../models/codeZip.js';
import cron from 'node-cron';

/**
 * Comprehensive service for managing the complete lifecycle of generated project zips
 * Handles storage, retrieval, version management, cleanup, and maintenance
 */
export class ZipLifecycleManager {
    constructor() {
        this.cleanupScheduled = false;
        this.maxStoragePerUser = 1024 * 1024 * 1024; // 1GB default
        this.defaultExpirationDays = 365;
        this.cleanupIntervalHours = 24; // Run cleanup every 24 hours
    }

    /**
     * Initialize the lifecycle manager with automated cleanup
     */
    async initialize() {
        if (!this.cleanupScheduled) {
            // Schedule automatic cleanup every day at 2 AM
            cron.schedule('0 2 * * *', async () => {
                console.log('🧹 Running scheduled cleanup...');
                await this.runScheduledCleanup();
            });
            this.cleanupScheduled = true;
            console.log('✅ Zip lifecycle manager initialized with automated cleanup');
        }
    }

    /**
     * Store a zip file with intelligent routing between permanent and cache storage
     * @param {Object} options - Storage options
     * @returns {Promise<Object>} - Storage result
     */
    async storeZip(options = {}) {
        const {
            projectId = null,
            userId = null,
            zipData = null,
            fileName = null,
            storageType = 'auto', // 'auto', 'permanent', 'cache'
            metadata = {},
            sourceFiles = [],
            replaceExisting = false
        } = options;

        try {
            if (!zipData) {
                throw new Error('Zip data is required');
            }

            let result;

            // Determine storage type
            if (storageType === 'auto') {
                if (projectId) {
                    // If project ID is provided, use permanent storage
                    result = await this.storePermanent(projectId, zipData, {
                        fileName,
                        metadata,
                        sourceFiles,
                        replaceExisting
                    });
                } else {
                    // No project ID, use cache storage
                    result = await this.storeInCache(zipData, fileName, userId, metadata);
                }
            } else if (storageType === 'permanent') {
                if (!projectId) {
                    throw new Error('Project ID required for permanent storage');
                }
                result = await this.storePermanent(projectId, zipData, {
                    fileName,
                    metadata,
                    sourceFiles,
                    replaceExisting
                });
            } else if (storageType === 'cache') {
                result = await this.storeInCache(zipData, fileName, userId, metadata);
            } else {
                throw new Error('Invalid storage type. Use "auto", "permanent", or "cache"');
            }

            // Log storage statistics
            await this.logStorageOperation('store', {
                userId,
                projectId,
                storageType: result.storageType || storageType,
                fileSize: result.fileSize
            });

            return result;

        } catch (error) {
            console.error('Error in storeZip:', error);
            throw error;
        }
    }

    /**
     * Store zip in permanent project storage
     * @private
     */
    async storePermanent(projectId, zipData, options = {}) {
        const result = await projectPermanentStorage.storeProjectZip(projectId, zipData, options);
        return {
            ...result,
            storageType: 'permanent',
            permanentStorage: true
        };
    }

    /**
     * Store zip in cache storage
     * @private
     */
    async storeInCache(zipData, fileName, userId, metadata) {
        const result = await zipCacheService.storeZip(zipData, fileName, userId, metadata);
        return {
            ...result,
            storageType: 'cache',
            permanentStorage: false
        };
    }

    /**
     * Retrieve zip file with intelligent lookup across storage types
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object>} - Zip information
     */
    async getZip(options = {}) {
        const {
            projectId = null,
            fileName = null,
            userId = null,
            versionNumber = 'current',
            preferPermanent = true
        } = options;

        try {
            let result = null;

            // Try permanent storage first if project ID is provided
            if (projectId && preferPermanent) {
                try {
                    result = await projectPermanentStorage.getProjectZip(projectId, versionNumber);
                    if (result) {
                        result.storageType = 'permanent';
                        result.source = 'project';
                    }
                } catch (error) {
                    console.log('Project storage lookup failed, trying cache:', error.message);
                }
            }

            // Try cache storage if permanent storage failed or not preferred
            if (!result && fileName) {
                try {
                    const cached = await zipCacheService.getZip(fileName, userId);
                    if (cached.codeZip) {
                        result = {
                            downloadUrl: cached.codeZip.cloudinaryUrl,
                            fileName: cached.codeZip.zipFileName,
                            fileSize: cached.codeZip.zipSize,
                            storageType: 'cache',
                            source: 'cache',
                            codeZip: cached.codeZip
                        };
                    }
                } catch (error) {
                    console.log('Cache storage lookup failed:', error.message);
                }
            }

            // Log retrieval statistics
            if (result) {
                await this.logStorageOperation('retrieve', {
                    userId,
                    projectId,
                    storageType: result.storageType,
                    found: true
                });
            }

            return result;

        } catch (error) {
            console.error('Error in getZip:', error);
            throw error;
        }
    }

    /**
     * Download zip file with tracking
     * @param {Object} options - Download options
     * @returns {Promise<Object>} - Download result
     */
    async downloadZip(options = {}) {
        const {
            projectId = null,
            fileName = null,
            userId = null,
            versionNumber = 'current'
        } = options;

        try {
            let result = null;

            // Try permanent storage first
            if (projectId) {
                try {
                    result = await projectPermanentStorage.downloadProjectZip(projectId, versionNumber);
                    result.storageType = 'permanent';
                } catch (error) {
                    console.log('Permanent download failed, trying cache:', error.message);
                }
            }

            // Try cache storage
            if (!result && fileName) {
                const zipInfo = await zipCacheService.getZip(fileName, userId);
                if (zipInfo.codeZip) {
                    await zipInfo.codeZip.incrementDownloadCount();
                    result = {
                        success: true,
                        downloadUrl: zipInfo.codeZip.cloudinaryUrl,
                        fileName: zipInfo.codeZip.zipFileName,
                        fileSize: zipInfo.codeZip.zipSize,
                        storageType: 'cache'
                    };
                }
            }

            if (!result) {
                throw new Error('Zip file not found in any storage');
            }

            // Log download statistics
            await this.logStorageOperation('download', {
                userId,
                projectId,
                storageType: result.storageType,
                fileSize: result.fileSize
            });

            return result;

        } catch (error) {
            console.error('Error in downloadZip:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive storage statistics
     * @param {string} userId - User ID (optional)
     * @returns {Promise<Object>} - Storage statistics
     */
    async getStorageStats(userId = null) {
        try {
            const [projectStats, cacheStats] = await Promise.all([
                projectPermanentStorage.getStorageStats(userId),
                this.getCacheStorageStats(userId)
            ]);

            return {
                permanent: projectStats,
                cache: cacheStats,
                total: {
                    projects: projectStats.totalProjects + cacheStats.totalZips,
                    storage: this.formatBytes(
                        projectStats.totalStorageBytes + cacheStats.totalStorageBytes
                    ),
                    storageBytes: projectStats.totalStorageBytes + cacheStats.totalStorageBytes
                },
                breakdown: {
                    permanentPercentage: Math.round(
                        (projectStats.totalStorageBytes / 
                        (projectStats.totalStorageBytes + cacheStats.totalStorageBytes)) * 100
                    ) || 0,
                    cachePercentage: Math.round(
                        (cacheStats.totalStorageBytes / 
                        (projectStats.totalStorageBytes + cacheStats.totalStorageBytes)) * 100
                    ) || 0
                }
            };

        } catch (error) {
            console.error('Error getting storage stats:', error);
            throw error;
        }
    }

    /**
     * Get cache storage statistics
     * @private
     */
    async getCacheStorageStats(userId = null) {
        try {
            await connectDB();

            let query = { status: 'active' };
            if (userId) query.userId = userId;

            const cacheZips = await CodeZip.find(query);

            const totalZips = cacheZips.length;
            const totalStorage = cacheZips.reduce((sum, zip) => sum + (zip.zipSize || 0), 0);
            const activeZips = cacheZips.filter(zip => !zip.isExpired()).length;

            return {
                totalZips,
                activeZips,
                expiredZips: totalZips - activeZips,
                totalStorage: this.formatBytes(totalStorage),
                totalStorageBytes: totalStorage,
                averageSize: this.formatBytes(totalStorage / Math.max(totalZips, 1))
            };

        } catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                totalZips: 0,
                activeZips: 0,
                expiredZips: 0,
                totalStorage: '0 Bytes',
                totalStorageBytes: 0,
                averageSize: '0 Bytes'
            };
        }
    }

    /**
     * Run comprehensive cleanup of expired and old files
     * @param {Object} options - Cleanup options
     * @returns {Promise<Object>} - Cleanup results
     */
    async runCleanup(options = {}) {
        const {
            cleanupExpired = true,
            cleanupOldVersions = true,
            cleanupCache = true,
            dryRun = false,
            maxAge = 365, // days
            userId = null
        } = options;

        try {
            console.log(`🧹 Starting ${dryRun ? 'DRY RUN' : 'ACTUAL'} cleanup...`);

            const results = {
                expiredCleanup: null,
                versionCleanup: null,
                cacheCleanup: null,
                cloudinaryCleanup: []
            };

            // Cleanup expired files
            if (cleanupExpired) {
                results.expiredCleanup = await this.cleanupExpiredFiles(userId, dryRun);
            }

            // Cleanup old versions
            if (cleanupOldVersions) {
                results.versionCleanup = await this.cleanupOldVersions(userId, dryRun);
            }

            // Cleanup cache
            if (cleanupCache) {
                results.cacheCleanup = await this.cleanupCacheFiles(maxAge, userId, dryRun);
            }

            // Summary
            const summary = this.summarizeCleanupResults(results);
            
            console.log(`✅ Cleanup completed: ${JSON.stringify(summary, null, 2)}`);

            return {
                success: true,
                dryRun,
                results,
                summary
            };

        } catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }

    /**
     * Cleanup expired files from projects
     * @private
     */
    async cleanupExpiredFiles(userId, dryRun) {
        try {
            await connectDB();

            let query = {};
            if (userId) query.userId = userId;

            const projects = await Project.find(query);
            let expiredCount = 0;
            let deletedFromCloudinary = 0;
            const deletedPublicIds = [];

            for (const project of projects) {
                if (project.generatedFiles?.zipFile) {
                    const zipFile = project.generatedFiles.zipFile;
                    const isExpired = zipFile.expiresAt && new Date() > new Date(zipFile.expiresAt);

                    if (isExpired) {
                        expiredCount++;
                        
                        if (!dryRun) {
                            if (zipFile.cloudinaryPublicId) {
                                deletedPublicIds.push(zipFile.cloudinaryPublicId);
                                try {
                                    await deleteZipFromCloudinary(zipFile.cloudinaryPublicId);
                                    deletedFromCloudinary++;
                                } catch (error) {
                                    console.log(`Failed to delete from Cloudinary: ${zipFile.cloudinaryPublicId}`);
                                }
                            }
                            project.generatedFiles.zipFile = undefined;
                            await project.save();
                        }
                    }
                }
            }

            return {
                expiredFiles: expiredCount,
                deletedFromCloudinary,
                deletedPublicIds
            };

        } catch (error) {
            console.error('Error cleaning expired files:', error);
            return { expiredFiles: 0, deletedFromCloudinary: 0, deletedPublicIds: [] };
        }
    }

    /**
     * Cleanup old versions from projects
     * @private
     */
    async cleanupOldVersions(userId, dryRun, keepVersions = 5) {
        try {
            await connectDB();

            let query = {};
            if (userId) query.userId = userId;

            const projects = await Project.find(query);
            let cleanedProjects = 0;
            let deletedVersions = 0;

            for (const project of projects) {
                if (!dryRun) {
                    const beforeCount = project.getGeneratedCodeVersions().length;
                    await project.cleanupOldVersions(keepVersions);
                    const afterCount = project.getGeneratedCodeVersions().length;
                    const deleted = beforeCount - afterCount;
                    
                    if (deleted > 0) {
                        cleanedProjects++;
                        deletedVersions += deleted;
                    }
                } else {
                    const versions = project.getGeneratedCodeVersions();
                    if (versions.length > keepVersions) {
                        cleanedProjects++;
                        deletedVersions += versions.length - keepVersions;
                    }
                }
            }

            return {
                cleanedProjects,
                deletedVersions
            };

        } catch (error) {
            console.error('Error cleaning old versions:', error);
            return { cleanedProjects: 0, deletedVersions: 0 };
        }
    }

    /**
     * Cleanup cache files
     * @private
     */
    async cleanupCacheFiles(maxAgeDays, userId, dryRun) {
        try {
            await connectDB();

            const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
            
            let query = {
                $or: [
                    { status: 'deleted' },
                    { expiresAt: { $lt: new Date() } },
                    { createdAt: { $lt: cutoffDate } }
                ]
            };

            if (userId) {
                query.userId = userId;
            }

            const expiredZips = await CodeZip.find(query);
            let deletedFromCache = 0;
            let deletedFromCloudinary = 0;

            for (const zip of expiredZips) {
                if (!dryRun) {
                    // Delete from Cloudinary
                    try {
                        await deleteZipFromCloudinary(zip.cloudinaryPublicId);
                        deletedFromCloudinary++;
                    } catch (error) {
                        console.log(`Failed to delete from Cloudinary: ${zip.cloudinaryPublicId}`);
                    }

                    // Delete from database
                    await CodeZip.deleteOne({ _id: zip._id });
                    deletedFromCache++;
                }
            }

            // Also run the built-in cache cleanup
            const cacheCleanup = await zipCacheService.cleanupCache();

            return {
                deletedFromCache: dryRun ? expiredZips.length : deletedFromCache,
                deletedFromCloudinary,
                memoryCleared: cacheCleanup.memoryCleared
            };

        } catch (error) {
            console.error('Error cleaning cache files:', error);
            return { deletedFromCache: 0, deletedFromCloudinary: 0, memoryCleared: 0 };
        }
    }

    /**
     * Scheduled cleanup that runs automatically
     * @private
     */
    async runScheduledCleanup() {
        try {
            const results = await this.runCleanup({
                cleanupExpired: true,
                cleanupOldVersions: true,
                cleanupCache: true,
                dryRun: false,
                maxAge: 30 // Clean cache files older than 30 days
            });

            console.log('✅ Scheduled cleanup completed:', results.summary);

            return results;

        } catch (error) {
            console.error('❌ Scheduled cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Summarize cleanup results
     * @private
     */
    summarizeCleanupResults(results) {
        const summary = {
            totalExpiredFiles: 0,
            totalDeletedVersions: 0,
            totalCacheCleared: 0,
            totalCloudinaryDeletions: 0
        };

        if (results.expiredCleanup) {
            summary.totalExpiredFiles += results.expiredCleanup.expiredFiles;
            summary.totalCloudinaryDeletions += results.expiredCleanup.deletedFromCloudinary;
        }

        if (results.versionCleanup) {
            summary.totalDeletedVersions += results.versionCleanup.deletedVersions;
        }

        if (results.cacheCleanup) {
            summary.totalCacheCleared += results.cacheCleanup.deletedFromCache;
            summary.totalCloudinaryDeletions += results.cacheCleanup.deletedFromCloudinary;
        }

        return summary;
    }

    /**
     * Log storage operations for analytics
     * @private
     */
    async logStorageOperation(operation, details) {
        // This could be enhanced to log to a separate analytics collection
        console.log(`📊 Storage ${operation}:`, {
            timestamp: new Date(),
            operation,
            ...details
        });
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

    /**
     * Migrate data between storage types
     * @param {Object} options - Migration options
     * @returns {Promise<Object>} - Migration results
     */
    async migrateStorage(options = {}) {
        const {
            fromType = 'cache', // 'cache' or 'permanent'
            toType = 'permanent', // 'cache' or 'permanent'
            userId = null,
            projectId = null,
            dryRun = false
        } = options;

        try {
            if (fromType === 'cache' && toType === 'permanent') {
                return await projectPermanentStorage.migrateCodeZipsToProjects(userId);
            }

            throw new Error('Migration type not supported yet');

        } catch (error) {
            console.error('Error during storage migration:', error);
            throw error;
        }
    }
}

// Create singleton instance
const zipLifecycleManager = new ZipLifecycleManager();

// Initialize on module load
zipLifecycleManager.initialize().catch(console.error);

export default zipLifecycleManager;