// app/api/projects/[id]/route.js
import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/db';
import Project from '@/models/project';
import User from '@/models/user';
import { uploadToCloudinary, deleteFromCloudinary, deleteDatasetFromCloudinary } from '@/lib/cloudinary';
import { 
    validateImageFile, 
    validateDatasetFile, 
    processDatasetFile,
    bufferToBase64,
    generateUniqueFileName,
    formatFileSize
} from '@/lib/fileUtils';
import jwt from 'jsonwebtoken';

// Helper function to get user from token
async function getUserFromToken(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) {
            throw new Error('No authentication token');
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await connectMongoDB();
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            throw new Error('User not found');
        }
        
        return user;
    } catch (error) {
        throw new Error('Authentication failed');
    }
}

// Helper function to verify project ownership
async function verifyProjectOwnership(projectId, userId) {
    const project = await Project.findById(projectId);
    
    if (!project) {
        throw new Error('Project not found');
    }
    
    if (project.userId.toString() !== userId.toString()) {
        throw new Error('Access denied');
    }
    
    return project;
}

// GET - Fetch specific project
export async function GET(request, { params }) {
    try {
        const user = await getUserFromToken(request);
        const { id } = params;
        
        await connectMongoDB();
        
        const project = await verifyProjectOwnership(id, user._id);
        
        // Increment view count
        await project.incrementViews();
        
        return NextResponse.json({
            success: true,
            project: {
                id: project._id,
                name: project.name,
                description: project.description,
                thumbnail: project.thumbnail,
                status: project.status,
                taskType: project.taskType,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                analytics: project.analytics,
                dataset: project.dataset ? {
                    originalName: project.dataset.originalName,
                    fileName: project.dataset.fileName,
                    size: project.dataset.size,
                    fileType: project.dataset.metadata?.fileType,
                    rows: project.dataset.metadata?.rows,
                    columns: project.dataset.metadata?.columns,
                    preview: project.dataset.metadata?.preview
                } : null,
                modelResults: project.modelResults,
                configuration: project.configuration,
                deployment: project.deployment,
                tags: project.tags
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Get project error:', error);
        const statusCode = error.message === 'Authentication failed' ? 401 : 
                          error.message === 'Access denied' ? 403 :
                          error.message === 'Project not found' ? 404 : 500;
        
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch project'
        }, { status: statusCode });
    }
}

// PUT - Update project
export async function PUT(request, { params }) {
    try {
        const user = await getUserFromToken(request);
        const { id } = params;
        
        await connectMongoDB();
        
        let project = await verifyProjectOwnership(id, user._id);
        
        // Parse form data
        const formData = await request.formData();
        const name = formData.get('name');
        const description = formData.get('description');
        const status = formData.get('status');
        const taskType = formData.get('taskType');
        const photo = formData.get('photo'); // New image file
        const dataset = formData.get('dataset'); // New dataset file
        const removePhoto = formData.get('removePhoto') === 'true';
        const removeDataset = formData.get('removeDataset') === 'true';
        
        // Update basic fields
        if (name && name.trim()) project.name = name.trim();
        if (description !== null) project.description = description?.trim() || '';
        if (status) project.status = status;
        if (taskType) project.taskType = taskType;
        
        // Handle photo removal
        if (removePhoto && project.thumbnailPublicId) {
            try {
                await deleteFromCloudinary(project.thumbnailPublicId);
                project.thumbnail = null;
                project.thumbnailPublicId = null;
            } catch (error) {
                console.error('Failed to delete image from Cloudinary:', error);
            }
        }
        
        // Handle new photo upload
        if (photo && photo.size > 0) {
            try {
                // Delete old image if exists
                if (project.thumbnailPublicId) {
                    await deleteFromCloudinary(project.thumbnailPublicId);
                }
                
                // Validate and upload new image
                validateImageFile({
                    mimetype: photo.type,
                    size: photo.size
                });
                
                const arrayBuffer = await photo.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64String = `data:${photo.type};base64,${buffer.toString('base64')}`;
                
                const cloudinaryResult = await uploadToCloudinary(base64String, 'freemind-projects');
                
                project.thumbnail = cloudinaryResult.url;
                project.thumbnailPublicId = cloudinaryResult.publicId;
                
            } catch (imageError) {
                console.error('Image upload error:', imageError);
                return NextResponse.json({
                    success: false,
                    error: `Image upload failed: ${imageError.message}`
                }, { status: 400 });
            }
        }
        
        // Handle dataset removal
        if (removeDataset && project.dataset) {
            try {
                if (project.dataset.cloudinaryUrl) {
                    // Extract public ID from URL or use stored public ID if available
                    const publicId = project.dataset.cloudinaryUrl.split('/').pop().split('.')[0];
                    await deleteDatasetFromCloudinary(publicId);
                }
                project.dataset = null;
            } catch (error) {
                console.error('Failed to delete dataset from Cloudinary:', error);
            }
        }
        
        // Handle new dataset upload
        if (dataset && dataset.size > 0) {
            try {
                // Delete old dataset if exists
                if (project.dataset && project.dataset.cloudinaryUrl) {
                    const publicId = project.dataset.cloudinaryUrl.split('/').pop().split('.')[0];
                    await deleteDatasetFromCloudinary(publicId);
                }
                
                // Validate dataset file
                validateDatasetFile({
                    mimetype: dataset.type,
                    size: dataset.size
                });
                
                const arrayBuffer = await dataset.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                // Process dataset metadata
                const metadata = await processDatasetFile({
                    originalname: dataset.name,
                    buffer: buffer,
                    mimetype: dataset.type
                });
                
                // Generate unique filename
                const uniqueFileName = generateUniqueFileName(dataset.name, user._id);
                
                // Option 1: Store in database as Base64 (for small files < 10MB)
                if (dataset.size < 10 * 1024 * 1024) {
                    project.dataset = {
                        originalName: dataset.name,
                        fileName: uniqueFileName,
                        mimeType: dataset.type,
                        size: dataset.size,
                        content: bufferToBase64(buffer),
                        metadata: metadata
                    };
                } else {
                    // Option 2: Store in Cloudinary for larger files
                    const base64String = `data:${dataset.type};base64,${buffer.toString('base64')}`;
                    const cloudinaryResult = await uploadDatasetToCloudinary(base64String, 'freemind-datasets');
                    
                    project.dataset = {
                        originalName: dataset.name,
                        fileName: uniqueFileName,
                        mimeType: dataset.type,
                        size: dataset.size,
                        cloudinaryUrl: cloudinaryResult.url,
                        metadata: metadata
                    };
                }
                
            } catch (datasetError) {
                console.error('Dataset processing error:', datasetError);
                return NextResponse.json({
                    success: false,
                    error: `Dataset upload failed: ${datasetError.message}`
                }, { status: 400 });
            }
        }
        
        // Save updated project
        project.updatedAt = new Date();
        await project.save();
        
        return NextResponse.json({
            success: true,
            message: 'Project updated successfully',
            project: {
                id: project._id,
                name: project.name,
                description: project.description,
                thumbnail: project.thumbnail,
                status: project.status,
                taskType: project.taskType,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                dataset: project.dataset ? {
                    originalName: project.dataset.originalName,
                    size: formatFileSize(project.dataset.size),
                    fileType: project.dataset.metadata?.fileType,
                    rows: project.dataset.metadata?.rows,
                    columns: project.dataset.metadata?.columns
                } : null
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Update project error:', error);
        const statusCode = error.message === 'Authentication failed' ? 401 : 
                          error.message === 'Access denied' ? 403 :
                          error.message === 'Project not found' ? 404 : 500;
        
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update project'
        }, { status: statusCode });
    }
}

// DELETE - Delete project
export async function DELETE(request, { params }) {
    try {
        const user = await getUserFromToken(request);
        const { id } = params;
        
        await connectMongoDB();
        
        const project = await verifyProjectOwnership(id, user._id);
        
        // Delete associated files from Cloudinary
        const deletePromises = [];
        
        // Delete thumbnail
        if (project.thumbnailPublicId) {
            deletePromises.push(deleteFromCloudinary(project.thumbnailPublicId));
        }
        
        // Delete dataset
        if (project.dataset && project.dataset.cloudinaryUrl) {
            const publicId = project.dataset.cloudinaryUrl.split('/').pop().split('.')[0];
            deletePromises.push(deleteDatasetFromCloudinary(publicId));
        }
        
        // Execute deletions in parallel
        try {
            await Promise.allSettled(deletePromises);
        } catch (error) {
            console.error('Error deleting files from Cloudinary:', error);
            // Continue with project deletion even if file deletion fails
        }
        
        // Delete project from database
        await Project.findByIdAndDelete(id);
        
        return NextResponse.json({
            success: true,
            message: 'Project deleted successfully'
        }, { status: 200 });
        
    } catch (error) {
        console.error('Delete project error:', error);
        const statusCode = error.message === 'Authentication failed' ? 401 : 
                          error.message === 'Access denied' ? 403 :
                          error.message === 'Project not found' ? 404 : 500;
        
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete project'
        }, { status: statusCode });
    }
}