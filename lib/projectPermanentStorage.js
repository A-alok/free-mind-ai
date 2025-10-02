// lib/projectPermanentStorage.js
import { uploadZipToCloudinary, uploadZipFileToCloudinary, deleteZipFromCloudinary } from './cloudinary.js';
import connectDB from './mongodb.js';
import Project from '../models/project.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enhanced service for permanent storage of project-generated code zips in Cloudinary
 * Integrates with the Project model to provide permanent, organized storage
 */
export class ProjectPermanentStorage {
    constructor() {
        this.defaultExpirationDays = 365; // 1 year default
        this.maxVersionsPerProject = 10;
    }

    /**
     * Store generated code zip permanently for a project
     * @param {string} projectId - MongoDB Project ID
     * @param {Buffer|string} zipData - Zip file buffer or file path
     * @param {Object} options - Storage options
     * @returns {Promise<Object>} - Storage result
     */
    async storeProjectZip(projectId, zipData, options = {}) {
        try {
            await connectDB();

            // Get the project
            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error(`Project not found: ${projectId}`);
            }

            console.log(`📁 Storing zip for project: ${project.name} (${projectId})`);

            const {
                fileName = `${project.name}_${Date.now()}.zip`,
                versionNote = null,
                metadata = {},
                sourceFiles = [],
                expirationDays = this.defaultExpirationDays,
                replaceExisting = false,
                techStack = [],
                framework = null,
                language = null
            } = options;

            let cloudinaryResult;

            // Upload to Cloudinary
            if (Buffer.isBuffer(zipData)) {
                cloudinaryResult = await uploadZipToCloudinary(
                    zipData,
                    fileName,
                    project.userId.toString(),
                    `freemind-projects/${project.userId}/${projectId}`
                );
            } else if (typeof zipData === 'string') {
                // File path provided
                cloudinaryResult = await uploadZipFileToCloudinary(
                    zipData,
                    fileName,
                    project.userId.toString(),
                    `freemind-projects/${project.userId}/${projectId}`
                );
            } else {
                throw new Error('Invalid zip data provided. Expected Buffer or file path.');
            }

            // Prepare zip data for storage
            const zipDataForStorage = {
                cloudinaryUrl: cloudinaryResult.url,
                cloudinaryPublicId: cloudinaryResult.publicId,
                fileName: fileName,
                fileSize: cloudinaryResult.bytes,
                expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
                metadata: {
                    techStack: techStack,
                    framework: framework,
                    language: language,
                    projectStructure: metadata.projectStructure || {},
                    dependencies: metadata.dependencies || {},
                    buildInstructions: metadata.buildInstructions || '',
                    readme: metadata.readme || '',
                    generatedAt: new Date(),
                    cloudinaryFolder: cloudinaryResult.folder,
                    ...metadata
                },
                sourceFiles: sourceFiles
            };

            // Store in project
            if (replaceExisting) {
                await project.storeGeneratedCode(zipDataForStorage);
                console.log(`✅ Replaced existing zip for project: ${project.name}`);
            } else {
                await project.addGeneratedCodeVersion(zipDataForStorage, versionNote);
                console.log(`✅ Added new version for project: ${project.name}`);
            }

            // Clean up old versions if needed
            await project.cleanupOldVersions(this.maxVersionsPerProject);

            return {
                success: true,
                projectId: project._id,
                projectName: project.name,
                cloudinaryUrl: cloudinaryResult.url,
                cloudinaryPublicId: cloudinaryResult.publicId,
                fileName: fileName,
                fileSize: cloudinaryResult.bytes,
                expiresAt: zipDataForStorage.expiresAt,
                versions: project.getGeneratedCodeVersions(),
                totalStorageUsed: project.getFormattedStorageSize()
            };

        } catch (error) {
            console.error('Error storing project zip:', error);
            throw error;
        }
    }

    /**
     * Retrieve project zip information
     * @param {string} projectId - MongoDB Project ID
     * @param {string} versionNumber - Specific version (optional)
     * @returns {Promise<Object|null>} - Zip information
     */
    async getProjectZip(projectId, versionNumber = 'current') {
        try {
            await connectDB();

            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error(`Project not found: ${projectId}`);
            }

            if (versionNumber === 'current') {
                return project.getGeneratedCodeInfo();
            }

            // Get specific version
            const versions = project.getGeneratedCodeVersions();
            const requestedVersion = versions.find(v => v.versionNumber === versionNumber);

            if (!requestedVersion) {
                return null;
            }

            return {
                downloadUrl: requestedVersion.cloudinaryUrl,
                fileName: requestedVersion.fileName,
                fileSize: requestedVersion.fileSize,
                downloadCount: requestedVersion.downloadCount || 0,
                generatedAt: requestedVersion.generatedAt,
                lastDownloadedAt: requestedVersion.lastDownloadedAt,
                expiresAt: requestedVersion.expiresAt,
                versionNumber: requestedVersion.versionNumber,
                versionNote: requestedVersion.versionNote,
                metadata: project.generatedFiles?.metadata
            };

        } catch (error) {
            console.error('Error getting project zip:', error);
            throw error;
        }
    }

    /**
     * Download project zip and increment counter
     * @param {string} projectId - MongoDB Project ID
     * @param {string} versionNumber - Specific version (optional)
     * @returns {Promise<Object>} - Download information
     */
    async downloadProjectZip(projectId, versionNumber = 'current') {
        try {
            const zipInfo = await this.getProjectZip(projectId, versionNumber);
            
            if (!zipInfo || !zipInfo.downloadUrl) {
                throw new Error('No downloadable zip found for project');
            }

            // Increment download count
            await connectDB();
            const project = await Project.findById(projectId);
            if (project) {
                if (versionNumber === 'current') {
                    await project.incrementDownloadCount();
                } else {
                    // For versioned downloads, update the version's download count
                    if (project.generatedFiles && project.generatedFiles.versions) {
                        const version = project.generatedFiles.versions.find(
                            v => v.versionNumber === versionNumber
                        );
                        if (version) {
                            version.downloadCount = (version.downloadCount || 0) + 1;
                            version.lastDownloadedAt = new Date();
                            await project.save();
                        }
                    }
                }
            }

            return {
                success: true,
                downloadUrl: zipInfo.downloadUrl,
                fileName: zipInfo.fileName,
                fileSize: zipInfo.fileSize
            };

        } catch (error) {
            console.error('Error downloading project zip:', error);
            throw error;
        }
    }

    /**
     * List all versions for a project
     * @param {string} projectId - MongoDB Project ID
     * @returns {Promise<Array>} - List of versions
     */
    async listProjectVersions(projectId) {
        try {
            await connectDB();

            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error(`Project not found: ${projectId}`);
            }

            const versions = project.getGeneratedCodeVersions();
            
            return versions.map(version => ({
                versionNumber: version.versionNumber,
                fileName: version.fileName,
                fileSize: version.fileSize,
                downloadCount: version.downloadCount || 0,
                generatedAt: version.generatedAt,
                lastDownloadedAt: version.lastDownloadedAt,
                versionNote: version.versionNote,
                isCurrent: version.isCurrent || false,
                cloudinaryUrl: version.cloudinaryUrl
            }));

        } catch (error) {
            console.error('Error listing project versions:', error);
            throw error;
        }
    }

    /**
     * Restore a specific version of project code
     * @param {string} projectId - MongoDB Project ID
     * @param {string} versionNumber - Version to restore
     * @returns {Promise<Object>} - Restoration result
     */
    async restoreProjectVersion(projectId, versionNumber) {
        try {
            await connectDB();

            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error(`Project not found: ${projectId}`);
            }

            await project.restoreGeneratedCodeVersion(versionNumber);

            return {
                success: true,
                projectId: project._id,
                restoredVersion: versionNumber,
                message: `Version ${versionNumber} restored as current version`
            };

        } catch (error) {
            console.error('Error restoring project version:', error);
            throw error;
        }
    }

    /**
     * Delete a specific version or all versions for a project
     * @param {string} projectId - MongoDB Project ID
     * @param {string} versionNumber - Specific version to delete (optional, deletes all if not provided)
     * @returns {Promise<Object>} - Deletion result
     */
    async deleteProjectVersions(projectId, versionNumber = null) {
        try {
            await connectDB();

            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error(`Project not found: ${projectId}`);
            }

            const deletedPublicIds = [];

            if (versionNumber === null) {
                // Delete all versions
                if (project.generatedFiles?.zipFile?.cloudinaryPublicId) {
                    deletedPublicIds.push(project.generatedFiles.zipFile.cloudinaryPublicId);
                }

                if (project.generatedFiles?.versions) {
                    project.generatedFiles.versions.forEach(version => {
                        if (version.cloudinaryPublicId) {
                            deletedPublicIds.push(version.cloudinaryPublicId);
                        }
                    });
                }

                // Clear all generated files
                project.generatedFiles = undefined;

            } else if (versionNumber === 'current') {
                // Delete current version only
                if (project.generatedFiles?.zipFile?.cloudinaryPublicId) {
                    deletedPublicIds.push(project.generatedFiles.zipFile.cloudinaryPublicId);
                }
                project.generatedFiles.zipFile = undefined;

            } else {
                // Delete specific version
                if (project.generatedFiles?.versions) {
                    const versionIndex = project.generatedFiles.versions.findIndex(
                        v => v.versionNumber === versionNumber
                    );
                    
                    if (versionIndex !== -1) {
                        const version = project.generatedFiles.versions[versionIndex];
                        if (version.cloudinaryPublicId) {
                            deletedPublicIds.push(version.cloudinaryPublicId);
                        }
                        project.generatedFiles.versions.splice(versionIndex, 1);
                    }
                }
            }

            // Delete from Cloudinary
            const cloudinaryDeletions = await Promise.allSettled(
                deletedPublicIds.map(publicId => deleteZipFromCloudinary(publicId))
            );

            const successfulDeletions = cloudinaryDeletions.filter(result => result.status === 'fulfilled').length;
            
            // Save project changes
            await project.save();

            return {
                success: true,
                projectId: project._id,
                deletedVersions: versionNumber || 'all',
                cloudinaryDeletions: successfulDeletions,
                totalDeleted: deletedPublicIds.length,
                remainingVersions: project.getGeneratedCodeVersions().length
            };

        } catch (error) {
            console.error('Error deleting project versions:', error);
            throw error;
        }
    }

    /**
     * Get storage statistics for a user or project
     * @param {string} userId - User ID (optional)
     * @param {string} projectId - Project ID (optional)
     * @returns {Promise<Object>} - Storage statistics
     */
    async getStorageStats(userId = null, projectId = null) {
        try {
            await connectDB();

            let query = {};
            
            if (projectId) {
                query._id = projectId;
            } else if (userId) {
                query.userId = userId;
            }

            const projects = await Project.find(query);

            let totalProjects = projects.length;
            let totalStorage = 0;
            let totalVersions = 0;
            let activeProjects = 0;

            const projectStats = projects.map(project => {
                const storage = project.getTotalStorageUsed();
                const versions = project.getGeneratedCodeVersions();
                const hasActiveCode = project.hasValidGeneratedCode();

                totalStorage += storage;
                totalVersions += versions.length;
                if (hasActiveCode) activeProjects++;

                return {
                    projectId: project._id,
                    projectName: project.name,
                    storage: project.getFormattedStorageSize(),
                    storageBytes: storage,
                    versions: versions.length,
                    hasActiveCode: hasActiveCode,
                    lastGenerated: versions.length > 0 ? versions[0].generatedAt : null
                };
            });

            // Format total storage
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            return {
                totalProjects,
                activeProjects,
                totalStorage: formatBytes(totalStorage),
                totalStorageBytes: totalStorage,
                totalVersions,
                averageStoragePerProject: formatBytes(totalStorage / Math.max(totalProjects, 1)),
                projects: projectStats.sort((a, b) => b.storageBytes - a.storageBytes)
            };

        } catch (error) {
            console.error('Error getting storage stats:', error);
            throw error;
        }
    }

    /**
     * Migrate existing CodeZip entries to Project model
     * @param {string} userId - User ID to migrate (optional)
     * @returns {Promise<Object>} - Migration result
     */
    async migrateCodeZipsToProjects(userId = null) {
        try {
            await connectDB();

            // Import CodeZip model
            const { default: CodeZip } = await import('../models/codeZip.js');

            let query = { status: 'active' };
            if (userId) query.userId = userId;

            const codeZips = await CodeZip.find(query);
            const migrationResults = [];

            for (const codeZip of codeZips) {
                try {
                    // Try to find matching project
                    let project = null;
                    
                    if (codeZip.generationParameters?.projectId) {
                        project = await Project.findById(codeZip.generationParameters.projectId);
                    }

                    if (!project && codeZip.userId) {
                        // Try to find project by name similarity
                        project = await Project.findOne({
                            userId: codeZip.userId,
                            name: { $regex: codeZip.projectName, $options: 'i' }
                        }).sort({ createdAt: -1 });
                    }

                    if (project) {
                        // Migrate to existing project
                        const zipData = {
                            cloudinaryUrl: codeZip.cloudinaryUrl,
                            cloudinaryPublicId: codeZip.cloudinaryPublicId,
                            fileName: codeZip.zipFileName,
                            fileSize: codeZip.zipSize,
                            expiresAt: codeZip.expiresAt,
                            metadata: {
                                techStack: codeZip.techStack,
                                migratedFrom: 'CodeZip',
                                originalId: codeZip._id,
                                migrationDate: new Date()
                            }
                        };

                        await project.storeGeneratedCode(zipData);

                        migrationResults.push({
                            success: true,
                            codeZipId: codeZip._id,
                            projectId: project._id,
                            projectName: project.name,
                            action: 'migrated'
                        });

                    } else {
                        migrationResults.push({
                            success: false,
                            codeZipId: codeZip._id,
                            projectName: codeZip.projectName,
                            action: 'skipped',
                            reason: 'No matching project found'
                        });
                    }

                } catch (error) {
                    migrationResults.push({
                        success: false,
                        codeZipId: codeZip._id,
                        projectName: codeZip.projectName,
                        action: 'failed',
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                totalProcessed: codeZips.length,
                migrated: migrationResults.filter(r => r.success).length,
                failed: migrationResults.filter(r => !r.success).length,
                results: migrationResults
            };

        } catch (error) {
            console.error('Error migrating CodeZips:', error);
            throw error;
        }
    }
}

// Create singleton instance
const projectPermanentStorage = new ProjectPermanentStorage();

export default projectPermanentStorage;