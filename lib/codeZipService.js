// lib/codeZipService.js
import path from 'path';
import os from 'os';
import connectDB from './mongodb.js';
import CodeZip from '../models/codeZip.js';
import { uploadZipToCloudinary, deleteZipFromCloudinary } from './cloudinary.js';
import { 
    createZipBuffer, 
    generateZipFileName, 
    ensureTempDir,
    cleanupZipFile 
} from './zipUtils.js';

/**
 * Complete service to handle code generation, zipping, uploading, and storage
 */
export class CodeZipService {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'freemind-zips');
    }

    /**
     * Process generated code: create zip, upload to Cloudinary, and store in MongoDB
     * @param {Object} options - Configuration options
     * @param {Object} options.generatedFiles - Object with file paths as keys and content as values
     * @param {string} options.projectName - Name of the generated project
     * @param {string} options.projectDescription - Description of the project
     * @param {string} options.userId - User ID (optional for anonymous users)
     * @param {string} options.userEmail - User email (optional)
     * @param {Array} options.techStack - Array of technologies used
     * @param {Object} options.generationParameters - Parameters used for generation
     * @param {Array} options.tags - Tags for categorization
     * @param {boolean} options.isPublic - Whether the project is public
     * @param {number} options.expirationDays - Days until expiration (default: 30)
     * @returns {Promise<Object>} - Created CodeZip document with download info
     */
    async processGeneratedCode(options) {
        const {
            generatedFiles,
            projectName,
            projectDescription = '',
            userId = null,
            userEmail = null,
            techStack = [],
            generationParameters = {},
            tags = [],
            isPublic = false,
            expirationDays = 30
        } = options;

        try {
            // Ensure temp directory exists
            await ensureTempDir(this.tempDir);

            // Validate inputs
            if (!generatedFiles || Object.keys(generatedFiles).length === 0) {
                throw new Error('No generated files provided');
            }

            if (!projectName || projectName.trim().length === 0) {
                throw new Error('Project name is required');
            }

            console.log('🚀 Starting code zip processing for project:', projectName);

            // Step 1: Create zip buffer from generated files
            const zipBuffer = await createZipBuffer(generatedFiles, projectName);
            const zipFileName = generateZipFileName(projectName, userId);

            console.log('📦 Created zip buffer:', zipFileName, `(${zipBuffer.length} bytes)`);

            // Step 2: Upload zip to Cloudinary
            const cloudinaryResult = await uploadZipToCloudinary(
                zipBuffer,
                zipFileName,
                userId
            );

            console.log('☁️ Uploaded to Cloudinary:', cloudinaryResult.url);

            // Step 3: Prepare file metadata
            const fileMetadata = Object.entries(generatedFiles).map(([filePath, content]) => ({
                fileName: path.basename(filePath),
                fileType: path.extname(filePath).slice(1) || 'txt',
                filePath: filePath
            }));

            // Step 4: Connect to database and save zip info
            await connectDB();

            const codeZipData = {
                projectName: projectName.trim(),
                projectDescription: projectDescription.trim(),
                userId,
                userEmail,
                zipFileName,
                zipSize: zipBuffer.length,
                cloudinaryUrl: cloudinaryResult.url,
                cloudinaryPublicId: cloudinaryResult.publicId,
                cloudinaryFolder: cloudinaryResult.folder,
                cloudinaryCreatedAt: new Date(cloudinaryResult.createdAt),
                generatedFiles: fileMetadata,
                techStack,
                generationParameters,
                tags,
                isPublic,
                expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
            };

            const codeZip = new CodeZip(codeZipData);
            await codeZip.save();

            console.log('💾 Saved to MongoDB:', codeZip._id);

            return {
                success: true,
                codeZip: codeZip.toObject(),
                downloadUrl: cloudinaryResult.url,
                zipId: codeZip._id,
                expiresAt: codeZip.expiresAt,
                message: 'Code successfully zipped, uploaded, and stored!'
            };

        } catch (error) {
            console.error('❌ Error processing generated code:', error);
            throw new Error(`Code processing failed: ${error.message}`);
        }
    }

    /**
     * Get user's code zips
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Array of user's code zips
     */
    async getUserCodeZips(userId, options = {}) {
        try {
            await connectDB();
            return await CodeZip.findByUser(userId, options);
        } catch (error) {
            console.error('Error fetching user code zips:', error);
            throw new Error(`Failed to fetch code zips: ${error.message}`);
        }
    }

    /**
     * Get public code zips
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Array of public code zips
     */
    async getPublicCodeZips(options = {}) {
        try {
            await connectDB();
            return await CodeZip.findPublic(options);
        } catch (error) {
            console.error('Error fetching public code zips:', error);
            throw new Error(`Failed to fetch public code zips: ${error.message}`);
        }
    }

    /**
     * Get a specific code zip by ID
     * @param {string} zipId - Code zip ID
     * @param {string} userId - User ID (optional, for permission check)
     * @returns {Promise<Object>} - Code zip document
     */
    async getCodeZip(zipId, userId = null) {
        try {
            await connectDB();
            
            const query = { _id: zipId, status: 'active' };
            
            // If userId is provided, check ownership or public status
            if (userId) {
                query.$or = [
                    { userId },
                    { isPublic: true }
                ];
            } else {
                // If no userId, only allow public zips
                query.isPublic = true;
            }

            const codeZip = await CodeZip.findOne(query);
            
            if (!codeZip) {
                throw new Error('Code zip not found or access denied');
            }

            if (codeZip.isExpired()) {
                throw new Error('Code zip has expired');
            }

            return codeZip;
        } catch (error) {
            console.error('Error fetching code zip:', error);
            throw new Error(`Failed to fetch code zip: ${error.message}`);
        }
    }

    /**
     * Track download and get download URL
     * @param {string} zipId - Code zip ID
     * @param {string} userId - User ID (optional)
     * @returns {Promise<Object>} - Download information
     */
    async trackDownload(zipId, userId = null) {
        try {
            const codeZip = await this.getCodeZip(zipId, userId);
            
            // Increment download count
            await codeZip.incrementDownloadCount();

            return {
                downloadUrl: codeZip.cloudinaryUrl,
                fileName: codeZip.zipFileName,
                projectName: codeZip.projectName,
                downloadCount: codeZip.downloadCount,
                expiresAt: codeZip.expiresAt
            };
        } catch (error) {
            console.error('Error tracking download:', error);
            throw new Error(`Download tracking failed: ${error.message}`);
        }
    }

    /**
     * Delete a code zip (soft delete - marks as deleted)
     * @param {string} zipId - Code zip ID
     * @param {string} userId - User ID
     * @param {boolean} hardDelete - Whether to also delete from Cloudinary
     * @returns {Promise<boolean>} - Success status
     */
    async deleteCodeZip(zipId, userId, hardDelete = false) {
        try {
            await connectDB();
            
            const codeZip = await CodeZip.findOne({
                _id: zipId,
                userId,
                status: { $ne: 'deleted' }
            });

            if (!codeZip) {
                throw new Error('Code zip not found or access denied');
            }

            // Soft delete - mark as deleted
            codeZip.status = 'deleted';
            await codeZip.save();

            // If hard delete requested, also delete from Cloudinary
            if (hardDelete) {
                try {
                    await deleteZipFromCloudinary(codeZip.cloudinaryPublicId);
                    console.log('🗑️ Deleted from Cloudinary:', codeZip.cloudinaryPublicId);
                } catch (cloudinaryError) {
                    console.error('Error deleting from Cloudinary:', cloudinaryError);
                    // Continue even if Cloudinary deletion fails
                }
            }

            console.log('🗑️ Code zip deleted:', zipId);
            return true;
        } catch (error) {
            console.error('Error deleting code zip:', error);
            throw new Error(`Failed to delete code zip: ${error.message}`);
        }
    }

    /**
     * Clean up expired code zips
     * @param {boolean} hardDelete - Whether to also delete from Cloudinary
     * @returns {Promise<Object>} - Cleanup statistics
     */
    async cleanupExpiredZips(hardDelete = false) {
        try {
            await connectDB();
            
            // Find expired zips before marking them as deleted
            const expiredZips = await CodeZip.find({
                expiresAt: { $lt: new Date() },
                status: { $ne: 'deleted' }
            });

            // Mark as deleted
            const result = await CodeZip.cleanupExpired();

            console.log('🧹 Marked expired zips as deleted:', result.modifiedCount);

            // If hard delete requested, delete from Cloudinary too
            if (hardDelete && expiredZips.length > 0) {
                let cloudinaryDeleted = 0;
                for (const zip of expiredZips) {
                    try {
                        await deleteZipFromCloudinary(zip.cloudinaryPublicId);
                        cloudinaryDeleted++;
                    } catch (error) {
                        console.error('Error deleting from Cloudinary:', zip.cloudinaryPublicId, error.message);
                    }
                }
                console.log('☁️ Deleted from Cloudinary:', cloudinaryDeleted);
            }

            return {
                markedDeleted: result.modifiedCount,
                cloudinaryDeleted: hardDelete ? expiredZips.length : 0,
                totalExpired: expiredZips.length
            };
        } catch (error) {
            console.error('Error cleaning up expired zips:', error);
            throw new Error(`Cleanup failed: ${error.message}`);
        }
    }

    /**
     * Get statistics about code zips
     * @param {string} userId - User ID (optional, for user-specific stats)
     * @returns {Promise<Object>} - Statistics
     */
    async getStatistics(userId = null) {
        try {
            await connectDB();
            
            const baseQuery = { status: 'active' };
            if (userId) {
                baseQuery.userId = userId;
            }

            const [
                totalZips,
                totalDownloads,
                totalSize,
                expiringSoon,
                publicZips
            ] = await Promise.all([
                CodeZip.countDocuments(baseQuery),
                CodeZip.aggregate([
                    { $match: baseQuery },
                    { $group: { _id: null, total: { $sum: '$downloadCount' } } }
                ]),
                CodeZip.aggregate([
                    { $match: baseQuery },
                    { $group: { _id: null, total: { $sum: '$zipSize' } } }
                ]),
                CodeZip.countDocuments({
                    ...baseQuery,
                    expiresAt: { 
                        $gt: new Date(), 
                        $lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
                    }
                }),
                userId ? 0 : CodeZip.countDocuments({ ...baseQuery, isPublic: true })
            ]);

            return {
                totalZips,
                totalDownloads: totalDownloads[0]?.total || 0,
                totalSizeBytes: totalSize[0]?.total || 0,
                expiringSoon,
                publicZips: userId ? null : publicZips
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }
}

// Create singleton instance
const codeZipService = new CodeZipService();

export default codeZipService;