// app/api/projects/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import Project from '@/models/project';
import User from '@/models/user';
import { uploadToCloudinary, uploadDatasetToCloudinary } from '@/lib/cloudinary';
import { 
    validateImageFile, 
    validateDatasetFile, 
    processDatasetFile,
    bufferToBase64,
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

// GET - Fetch user projects
export async function GET(request) {
    try {
        const user = await getUserFromCookies();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const skip = (page - 1) * limit;
        
        await connectDB();
        
        let query = { userId: user._id };
        
        // Add status filter
        if (status && status !== 'all') {
            query.status = status;
        }
        
        let projects;
        
        // Add search functionality
        if (search && search.trim()) {
            projects = await Project.searchProjects(user._id, search)
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email');
        } else {
            projects = await Project.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email');
        }
        
        // Get total count for pagination
        const totalProjects = await Project.countDocuments(query);
        
        return NextResponse.json({
            success: true,
            projects: projects.map(project => ({
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
                    size: project.dataset.size,
                    fileType: project.dataset.metadata?.fileType
                } : null
            })),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalProjects / limit),
                totalProjects,
                hasNext: page < Math.ceil(totalProjects / limit),
                hasPrev: page > 1
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Get projects error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch projects'
        }, { status: error.message === 'Authentication failed' ? 401 : 500 });
    }
}

// POST - Create new project
export async function POST(request) {
    try {
        const user = await getUserFromCookies();
        
        // Parse form data
        const formData = await request.formData();
        const name = formData.get('name');
        const description = formData.get('description');
        const taskType = formData.get('taskType');
        const photo = formData.get('photo'); // Image file
        const dataset = formData.get('dataset'); // Dataset file
        
        // Validate required fields
        if (!name || name.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Project name is required'
            }, { status: 400 });
        }
        
        await connectDB();
        
        // Prepare project data
        const projectData = {
            name: name.trim(),
            description: description?.trim() || '',
            userId: user._id,
            taskType: taskType || undefined,
            status: 'draft'
        };
        
        // Handle image upload to Cloudinary
        if (photo && photo.size > 0) {
            try {
                // Validate image
                validateImageFile({
                    mimetype: photo.type,
                    size: photo.size
                });
                
                // Convert to buffer for Cloudinary
                const arrayBuffer = await photo.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64String = `data:${photo.type};base64,${buffer.toString('base64')}`;
                
                // Upload to Cloudinary
                const cloudinaryResult = await uploadToCloudinary(base64String, 'freemind-projects');
                
                projectData.thumbnail = cloudinaryResult.url;
                projectData.thumbnailPublicId = cloudinaryResult.publicId;
                
            } catch (imageError) {
                console.error('Image upload error:', imageError);
                return NextResponse.json({
                    success: false,
                    error: `Image upload failed: ${imageError.message}`
                }, { status: 400 });
            }
        }
        
        // Handle dataset upload
        if (dataset && dataset.size > 0) {
            try {
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
                    projectData.dataset = {
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
                    
                    projectData.dataset = {
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
        
        // Create project in database
        const project = new Project(projectData);
        await project.save();
        
        // Return created project
        return NextResponse.json({
            success: true,
            message: 'Project created successfully',
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
        }, { status: 201 });
        
    } catch (error) {
        console.error('Create project error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create project'
        }, { status: error.message === 'Authentication failed' ? 401 : 500 });
    }
}
