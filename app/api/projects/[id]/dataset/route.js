// app/api/projects/[id]/dataset/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import Project from '@/models/project';
import User from '@/models/user';
import Activity from '@/models/activity';
import { uploadDatasetToCloudinary, deleteDatasetFromCloudinary } from '@/lib/cloudinary';
import { 
    validateDatasetFile, 
    processDatasetFile,
    generateUniqueFileName,
    formatFileSize
} from '@/lib/fileUtils';

// Helper function to get user from cookies
async function getUserFromCookies() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        
        if (!userId) {
            throw new Error('Not authenticated');
        }
        
        await connectDB();
        const user = await User.findById(userId);
        
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

// POST - Upload dataset to existing project in ML workspace
export async function POST(request, { params }) {
    let activityId = null;
    
    try {
        const user = await getUserFromCookies();
        const { id: projectId } = params;
        
        await connectDB();
        
        // Verify project ownership
        const project = await verifyProjectOwnership(projectId, user._id);
        
        // Parse form data
        const formData = await request.formData();
        const datasetFile = formData.get('dataset');
        const sessionId = formData.get('sessionId');
        
        if (!datasetFile || datasetFile.size === 0) {
            return NextResponse.json({
                success: false,
                error: 'Dataset file is required'
            }, { status: 400 });
        }
        
        // Track dataset upload activity
        const activity = await Activity.createActivity({
            userId: user._id,
            projectId: project._id,
            sessionId: sessionId || Activity.generateSessionId(),
            activityType: 'dataset_uploaded',
            data: {
                datasetInfo: {
                    fileName: datasetFile.name,
                    fileSize: datasetFile.size,
                    fileType: datasetFile.type
                }
            },
            context: {
                userAgent: request.headers.get('user-agent'),
                timestamp: new Date().toISOString()
            }
        });
        activityId = activity._id;
        
        // Validate dataset file
        validateDatasetFile({
            mimetype: datasetFile.type,
            size: datasetFile.size
        });
        
        // Convert file to buffer
        const arrayBuffer = await datasetFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Update activity to processing
        await activity.updateProgress(10, {
            datasetInfo: {
                fileName: datasetFile.name,
                fileSize: datasetFile.size,
                fileType: datasetFile.type,
                processingTime: Date.now()
            }
        });
        
        // Process dataset metadata
        const metadata = await processDatasetFile({
            originalname: datasetFile.name,
            buffer: buffer,
            mimetype: datasetFile.type
        });
        
        // Update activity progress
        await activity.updateProgress(30, {
            datasetInfo: { ...activity.data.datasetInfo, ...metadata }
        });
        
        // Generate unique filename
        const uniqueFileName = generateUniqueFileName(datasetFile.name, user._id);
        
        let datasetData = {};
        
        // Always upload to Cloudinary for ML workspace (better for processing)
        const base64String = `data:${datasetFile.type};base64,${buffer.toString('base64')}`;
        
        // Update activity progress
        await activity.updateProgress(50, {
            datasetInfo: { ...activity.data.datasetInfo, status: 'uploading_to_cloudinary' }
        });
        
        const cloudinaryResult = await uploadDatasetToCloudinary(base64String, 'freemind-datasets');
        
        // Update activity progress
        await activity.updateProgress(80, {
            datasetInfo: { ...activity.data.datasetInfo, status: 'cloudinary_upload_complete' }
        });
        
        // Prepare dataset data
        datasetData = {
            originalName: datasetFile.name,
            fileName: uniqueFileName,
            mimeType: datasetFile.type,
            size: datasetFile.size,
            cloudinaryUrl: cloudinaryResult.url,
            cloudinaryPublicId: cloudinaryResult.publicId,
            metadata: metadata,
            status: 'ready',
            uploadedAt: new Date(),
            processedAt: new Date(),
            version: (project.datasets?.length || 0) + 1,
            isActive: true
        };
        
        // Deactivate previous datasets
        if (project.datasets && project.datasets.length > 0) {
            project.datasets.forEach(dataset => {
                dataset.isActive = false;
            });
        }
        
        // Add new dataset to project
        if (!project.datasets) {
            project.datasets = [];
        }
        project.datasets.push(datasetData);
        
        // Update project status and last activity
        project.status = 'active';
        project.analytics = project.analytics || {};
        project.analytics.lastActivity = new Date();
        
        await project.save();
        
        // Complete activity
        await activity.markCompleted({
            success: true,
            message: 'Dataset uploaded successfully',
            data: {
                datasetId: project.datasets[project.datasets.length - 1]._id,
                projectId: project._id,
                cloudinaryUrl: cloudinaryResult.url,
                metadata: metadata
            }
        });
        
        // Return success response
        return NextResponse.json({
            success: true,
            message: 'Dataset uploaded successfully',
            dataset: {
                id: project.datasets[project.datasets.length - 1]._id,
                originalName: datasetData.originalName,
                fileName: datasetData.fileName,
                size: formatFileSize(datasetData.size),
                fileType: metadata.fileType,
                rows: metadata.rows,
                columns: metadata.columns,
                features: metadata.features,
                cloudinaryUrl: datasetData.cloudinaryUrl,
                uploadedAt: datasetData.uploadedAt,
                status: datasetData.status,
                version: datasetData.version,
                preview: metadata.preview
            },
            project: {
                id: project._id,
                name: project.name,
                status: project.status,
                datasetsCount: project.datasets.length
            }
        }, { status: 201 });
        
    } catch (error) {
        // Mark activity as failed if it exists
        if (activityId) {
            try {
                const activity = await Activity.findById(activityId);
                if (activity) {
                    await activity.markFailed(error);
                }
            } catch (activityError) {
                console.error('Failed to mark activity as failed:', activityError);
            }
        }
        
        console.error('Dataset upload error:', error);
        const statusCode = error.message === 'Authentication failed' ? 401 :
                          error.message === 'Access denied' ? 403 :
                          error.message === 'Project not found' ? 404 : 
                          error.message.includes('validation') ? 400 : 500;
        
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to upload dataset'
        }, { status: statusCode });
    }
}

// GET - Get project datasets
export async function GET(request, { params }) {
    try {
        const user = await getUserFromCookies();
        const { id: projectId } = params;
        
        await connectDB();
        
        // Verify project ownership
        const project = await verifyProjectOwnership(projectId, user._id);
        
        // Return datasets
        const datasets = project.datasets || [];
        
        return NextResponse.json({
            success: true,
            datasets: datasets.map(dataset => ({
                id: dataset._id,
                originalName: dataset.originalName,
                fileName: dataset.fileName,
                size: formatFileSize(dataset.size),
                fileType: dataset.metadata?.fileType || 'unknown',
                rows: dataset.metadata?.rows,
                columns: dataset.metadata?.columns,
                features: dataset.metadata?.features,
                status: dataset.status,
                isActive: dataset.isActive,
                version: dataset.version,
                uploadedAt: dataset.uploadedAt,
                processedAt: dataset.processedAt,
                preview: dataset.metadata?.preview,
                cloudinaryUrl: dataset.cloudinaryUrl
            })),
            activeDataset: datasets.find(d => d.isActive),
            totalDatasets: datasets.length
        }, { status: 200 });
        
    } catch (error) {
        console.error('Get datasets error:', error);
        const statusCode = error.message === 'Authentication failed' ? 401 :
                          error.message === 'Access denied' ? 403 :
                          error.message === 'Project not found' ? 404 : 500;
        
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch datasets'
        }, { status: statusCode });
    }
}

// DELETE - Delete dataset
export async function DELETE(request, { params }) {
    try {
        const user = await getUserFromCookies();
        const { id: projectId } = params;
        const { searchParams } = new URL(request.url);
        const datasetId = searchParams.get('datasetId');
        
        if (!datasetId) {
            return NextResponse.json({
                success: false,
                error: 'Dataset ID is required'
            }, { status: 400 });
        }
        
        await connectDB();
        
        // Verify project ownership
        const project = await verifyProjectOwnership(projectId, user._id);
        
        // Find dataset
        const dataset = project.datasets.id(datasetId);
        if (!dataset) {
            return NextResponse.json({
                success: false,
                error: 'Dataset not found'
            }, { status: 404 });
        }
        
        // Delete from Cloudinary if exists
        if (dataset.cloudinaryPublicId) {
            try {
                await deleteDatasetFromCloudinary(dataset.cloudinaryPublicId);
            } catch (cloudinaryError) {
                console.error('Failed to delete from Cloudinary:', cloudinaryError);
                // Continue with database deletion even if Cloudinary deletion fails
            }
        }
        
        // Remove dataset from project
        dataset.remove();
        await project.save();
        
        return NextResponse.json({
            success: true,
            message: 'Dataset deleted successfully'
        }, { status: 200 });
        
    } catch (error) {
        console.error('Delete dataset error:', error);
        const statusCode = error.message === 'Authentication failed' ? 401 :
                          error.message === 'Access denied' ? 403 :
                          error.message === 'Project not found' ? 404 : 500;
        
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete dataset'
        }, { status: statusCode });
    }
}