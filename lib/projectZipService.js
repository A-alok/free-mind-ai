// lib/projectZipService.js
import connectDB from './mongodb.js';
import Project from '../models/project.js';
import zipCacheService from './zipCacheService.js';
import codeZipService from './codeZipService.js';

/**
 * Service to integrate project management with zip file storage
 */
export class ProjectZipService {
    
    /**
     * Store generated code for a project permanently
     * @param {string} projectId - MongoDB project ID
     * @param {Object} generatedCode - Object with file paths and contents
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Storage result
     */
    async storeProjectCode(projectId, generatedCode, options = {}) {
        try {
            await connectDB();
            
            // Find the project
            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            console.log('📁 Storing generated code for project:', project.name);

            // Use the code zip service to create and store the zip
            const zipResult = await codeZipService.processGeneratedCode({
                generatedFiles: generatedCode,
                projectName: project.name,
                projectDescription: project.description,
                userId: project.userId.toString(),
                userEmail: options.userEmail,
                techStack: options.techStack || [],
                generationParameters: {
                    projectId: projectId,
                    taskType: project.taskType,
                    ...options.generationParameters
                },
                tags: ['project-code', ...(options.tags || [])],
                isPublic: project.isPublic || false,
                expirationDays: options.expirationDays || 365 // Projects get longer expiration
            });

            if (!zipResult.success) {
                throw new Error('Failed to create zip: ' + zipResult.error);
            }

            // Extract metadata from generated code
            const metadata = this.extractCodeMetadata(generatedCode, options.techStack);

            // Store zip information in the project
            await project.storeGeneratedCode({
                cloudinaryUrl: zipResult.downloadUrl,
                cloudinaryPublicId: zipResult.codeZip.cloudinaryPublicId,
                fileName: zipResult.codeZip.zipFileName,
                fileSize: zipResult.codeZip.zipSize,
                expiresAt: zipResult.codeZip.expiresAt,
                metadata: metadata,
                sourceFiles: this.extractSourceFilesInfo(generatedCode)
            });

            console.log('✅ Successfully stored project code:', projectId);

            return {
                success: true,
                project: project,
                zipResult: zipResult,
                downloadUrl: zipResult.downloadUrl,
                fileName: zipResult.codeZip.zipFileName,
                expiresAt: zipResult.codeZip.expiresAt,
                message: 'Project code stored successfully'
            };

        } catch (error) {
            console.error('Error storing project code:', error);
            throw error;
        }
    }

    /**
     * Get project code download information
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID (for permission check)
     * @returns {Promise<Object>} - Download info or null
     */
    async getProjectCodeInfo(projectId, userId = null) {
        try {
            await connectDB();
            
            const query = { _id: projectId };
            
            // If userId provided, check ownership or public access
            if (userId) {
                query.$or = [
                    { userId: userId },
                    { isPublic: true }
                ];
            } else {
                query.isPublic = true;
            }

            const project = await Project.findOne(query);
            
            if (!project) {
                return null;
            }

            const codeInfo = project.getGeneratedCodeInfo();
            
            if (!codeInfo) {
                return null;
            }

            return {
                projectId: project._id,
                projectName: project.name,
                projectDescription: project.description,
                ...codeInfo
            };

        } catch (error) {
            console.error('Error getting project code info:', error);
            throw error;
        }
    }

    /**
     * Download project code and track the download
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID (for permission check)
     * @returns {Promise<Object>} - Download info
     */
    async downloadProjectCode(projectId, userId = null) {
        try {
            const codeInfo = await this.getProjectCodeInfo(projectId, userId);
            
            if (!codeInfo) {
                throw new Error('Project code not found or access denied');
            }

            // Update download count in project
            await connectDB();
            const project = await Project.findById(projectId);
            if (project) {
                await project.incrementDownloadCount();
            }

            return {
                downloadUrl: codeInfo.downloadUrl,
                fileName: codeInfo.fileName,
                projectName: codeInfo.projectName,
                downloadCount: codeInfo.downloadCount + 1, // Include the increment
                metadata: codeInfo.metadata
            };

        } catch (error) {
            console.error('Error downloading project code:', error);
            throw error;
        }
    }

    /**
     * List projects with generated code for a user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Projects with code info
     */
    async getUserProjectsWithCode(userId, options = {}) {
        try {
            await connectDB();
            
            const { limit = 20, skip = 0, includeExpired = false } = options;
            
            const query = { 
                userId,
                'generatedFiles.zipFile.cloudinaryUrl': { $exists: true, $ne: null }
            };

            if (!includeExpired) {
                query.$or = [
                    { 'generatedFiles.zipFile.expiresAt': { $exists: false } },
                    { 'generatedFiles.zipFile.expiresAt': null },
                    { 'generatedFiles.zipFile.expiresAt': { $gt: new Date() } }
                ];
            }

            const projects = await Project.find(query)
                .sort({ updatedAt: -1 })
                .limit(limit)
                .skip(skip)
                .lean(); // Use lean for better performance

            return projects.map(project => ({
                _id: project._id,
                name: project.name,
                description: project.description,
                taskType: project.taskType,
                status: project.status,
                isPublic: project.isPublic,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                generatedCode: project.generatedFiles ? {
                    downloadUrl: project.generatedFiles.zipFile?.cloudinaryUrl,
                    fileName: project.generatedFiles.zipFile?.fileName,
                    fileSize: project.generatedFiles.zipFile?.fileSize,
                    downloadCount: project.generatedFiles.zipFile?.downloadCount || 0,
                    generatedAt: project.generatedFiles.zipFile?.generatedAt,
                    lastDownloadedAt: project.generatedFiles.zipFile?.lastDownloadedAt,
                    expiresAt: project.generatedFiles.zipFile?.expiresAt,
                    techStack: project.generatedFiles.metadata?.techStack || [],
                    framework: project.generatedFiles.metadata?.framework,
                    language: project.generatedFiles.metadata?.language
                } : null
            }));

        } catch (error) {
            console.error('Error getting user projects with code:', error);
            throw error;
        }
    }

    /**
     * Update project code from Flask backend zip
     * @param {string} projectId - Project ID
     * @param {string} flaskZipFilename - Flask-generated zip filename
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Update result
     */
    async updateProjectFromFlaskZip(projectId, flaskZipFilename, userId) {
        try {
            await connectDB();
            
            const project = await Project.findOne({ _id: projectId, userId });
            if (!project) {
                throw new Error('Project not found or access denied');
            }

            // Check if Flask zip is cached
            const cacheResult = await zipCacheService.getZip(flaskZipFilename, userId);
            
            if (cacheResult.source === 'cache' && cacheResult.codeZip) {
                // Update project with cached zip info
                await project.storeGeneratedCode({
                    cloudinaryUrl: cacheResult.codeZip.cloudinaryUrl,
                    cloudinaryPublicId: cacheResult.codeZip.cloudinaryPublicId,
                    fileName: cacheResult.codeZip.zipFileName,
                    fileSize: cacheResult.codeZip.zipSize,
                    expiresAt: cacheResult.codeZip.expiresAt,
                    metadata: {
                        techStack: cacheResult.codeZip.techStack || [],
                        framework: 'Flask Generated',
                        language: 'Multiple'
                    }
                });

                console.log('✅ Updated project with cached Flask zip:', projectId);

                return {
                    success: true,
                    project: project,
                    downloadUrl: cacheResult.codeZip.cloudinaryUrl,
                    cached: true,
                    message: 'Project updated with cached Flask zip'
                };
            }

            return {
                success: false,
                message: 'Flask zip not found in cache',
                cached: false
            };

        } catch (error) {
            console.error('Error updating project from Flask zip:', error);
            throw error;
        }
    }

    /**
     * Extract metadata from generated code
     * @param {Object} generatedFiles - Generated file contents
     * @param {Array} providedTechStack - Provided tech stack
     * @returns {Object} - Extracted metadata
     */
    extractCodeMetadata(generatedFiles, providedTechStack = []) {
        const techStack = new Set(providedTechStack);
        let primaryLanguage = null;
        let framework = null;
        const dependencies = {};
        let readme = '';

        // Analyze files
        Object.entries(generatedFiles).forEach(([filePath, content]) => {
            const fileName = filePath.toLowerCase();
            const extension = fileName.split('.').pop();

            // Detect languages and frameworks
            if (extension === 'js' || extension === 'jsx') {
                techStack.add('JavaScript');
                if (!primaryLanguage) primaryLanguage = 'JavaScript';
                
                if (content.includes('import React') || content.includes('from \'react\'')) {
                    techStack.add('React');
                    if (!framework) framework = 'React';
                }
                if (content.includes('express')) {
                    techStack.add('Express.js');
                    if (!framework) framework = 'Express.js';
                }
            } else if (extension === 'ts' || extension === 'tsx') {
                techStack.add('TypeScript');
                if (!primaryLanguage) primaryLanguage = 'TypeScript';
            } else if (extension === 'py') {
                techStack.add('Python');
                if (!primaryLanguage) primaryLanguage = 'Python';
                
                if (content.includes('from flask') || content.includes('import flask')) {
                    techStack.add('Flask');
                    if (!framework) framework = 'Flask';
                }
                if (content.includes('django')) {
                    techStack.add('Django');
                    if (!framework) framework = 'Django';
                }
            }

            // Extract dependencies
            if (fileName === 'package.json') {
                try {
                    const packageInfo = JSON.parse(content);
                    dependencies.npm = packageInfo.dependencies || {};
                    techStack.add('Node.js');
                } catch (e) {
                    console.warn('Could not parse package.json');
                }
            } else if (fileName === 'requirements.txt') {
                dependencies.pip = content.split('\n').filter(line => line.trim());
            }

            // Extract README
            if (fileName.includes('readme')) {
                readme = content;
            }
        });

        return {
            techStack: Array.from(techStack),
            framework,
            language: primaryLanguage,
            dependencies,
            readme: readme.slice(0, 1000), // Limit README size
            projectStructure: this.analyzeProjectStructure(generatedFiles)
        };
    }

    /**
     * Extract source files information
     * @param {Object} generatedFiles - Generated files
     * @returns {Array} - Source files info
     */
    extractSourceFilesInfo(generatedFiles) {
        return Object.entries(generatedFiles).map(([filePath, content]) => ({
            fileName: filePath.split('/').pop(),
            filePath: filePath,
            fileType: filePath.split('.').pop() || 'txt',
            content: content.length > 5000 ? content.slice(0, 5000) + '...' : content, // Limit content size
            lastModified: new Date()
        }));
    }

    /**
     * Analyze project structure
     * @param {Object} generatedFiles - Generated files
     * @returns {Object} - Project structure
     */
    analyzeProjectStructure(generatedFiles) {
        const structure = {};
        const filePaths = Object.keys(generatedFiles);

        filePaths.forEach(filePath => {
            const parts = filePath.split('/');
            let current = structure;

            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    // It's a file
                    current[part] = 'file';
                } else {
                    // It's a directory
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            });
        });

        return structure;
    }

    /**
     * Get project statistics
     * @param {string} userId - User ID (optional)
     * @returns {Promise<Object>} - Statistics
     */
    async getProjectCodeStatistics(userId = null) {
        try {
            await connectDB();
            
            const matchQuery = userId ? { userId } : {};
            const pipeline = [
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalProjects: { $sum: 1 },
                        projectsWithCode: {
                            $sum: {
                                $cond: [
                                    { $ne: ["$generatedFiles.zipFile.cloudinaryUrl", null] },
                                    1,
                                    0
                                ]
                            }
                        },
                        totalDownloads: {
                            $sum: {
                                $ifNull: ["$generatedFiles.zipFile.downloadCount", 0]
                            }
                        },
                        totalCodeSize: {
                            $sum: {
                                $ifNull: ["$generatedFiles.zipFile.fileSize", 0]
                            }
                        }
                    }
                }
            ];

            const stats = await Project.aggregate(pipeline);
            
            return stats[0] || {
                totalProjects: 0,
                projectsWithCode: 0,
                totalDownloads: 0,
                totalCodeSize: 0
            };

        } catch (error) {
            console.error('Error getting project code statistics:', error);
            throw error;
        }
    }
}

// Create singleton instance
const projectZipService = new ProjectZipService();

export default projectZipService;