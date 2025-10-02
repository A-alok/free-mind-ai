// app/api/projects/[id]/zip/route.js
import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb.js';
import Project from '../../../../../models/project.js';
import zipLifecycleManager from '../../../../../lib/zipLifecycleManager.js';
import projectPermanentStorage from '../../../../../lib/projectPermanentStorage.js';
import storageMaintenanceUtils from '../../../../../lib/storageMaintenanceUtils.js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route.js';

/**
 * Enhanced API endpoint for project zip management with permanent storage
 * Handles upload, download, version management, and cleanup
 */

// GET - Retrieve project zip information or download
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id: projectId } = params;
        const url = new URL(request.url);
        const action = url.searchParams.get('action'); // 'info', 'download', 'versions'
        const version = url.searchParams.get('version') || 'current';

        // Verify project ownership
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        switch (action) {
            case 'download':
                // Download the zip file
                const downloadResult = await zipLifecycleManager.downloadZip({
                    projectId,
                    userId: session.user.id,
                    versionNumber: version
                });

                if (!downloadResult.success) {
                    return NextResponse.json({ error: 'No zip file available for download' }, { status: 404 });
                }

                // Redirect to Cloudinary URL for direct download
                return NextResponse.redirect(downloadResult.downloadUrl);

            case 'versions':
                // List all versions
                const versions = await projectPermanentStorage.listProjectVersions(projectId);
                return NextResponse.json({
                    success: true,
                    projectId,
                    versions,
                    totalVersions: versions.length
                });

            case 'info':
            default:
                // Get zip information
                const zipInfo = await zipLifecycleManager.getZip({
                    projectId,
                    userId: session.user.id,
                    versionNumber: version
                });

                if (!zipInfo) {
                    return NextResponse.json({
                        success: true,
                        projectId,
                        hasZip: false,
                        message: 'No generated code available for this project'
                    });
                }

                return NextResponse.json({
                    success: true,
                    projectId,
                    hasZip: true,
                    zipInfo: {
                        fileName: zipInfo.fileName,
                        fileSize: zipInfo.fileSize,
                        downloadUrl: zipInfo.downloadUrl,
                        generatedAt: zipInfo.generatedAt,
                        downloadCount: zipInfo.downloadCount,
                        expiresAt: zipInfo.expiresAt,
                        storageType: zipInfo.storageType,
                        metadata: zipInfo.metadata
                    }
                });
        }

    } catch (error) {
        console.error('Error in GET /api/projects/[id]/zip:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            message: error.message 
        }, { status: 500 });
    }
}

// POST - Store/upload new zip file for project
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id: projectId } = params;

        // Verify project ownership
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check user quota before storing
        const quotaCheck = await storageMaintenanceUtils.enforceUserQuota(session.user.id, {
            dryRun: true // Just check, don't cleanup yet
        });

        if (quotaCheck.overQuota && quotaCheck.usagePercentage > 120) {
            // User is significantly over quota, don't allow new uploads
            return NextResponse.json({ 
                error: 'Storage quota exceeded',
                quota: quotaCheck,
                message: 'Please clean up old files or upgrade your plan to continue'
            }, { status: 413 });
        }

        const formData = await request.formData();
        const zipFile = formData.get('zipFile');
        const fileName = formData.get('fileName') || `${project.name}_${Date.now()}.zip`;
        const versionNote = formData.get('versionNote') || null;
        const replaceExisting = formData.get('replaceExisting') === 'true';
        
        // Parse metadata if provided
        let metadata = {};
        try {
            const metadataStr = formData.get('metadata');
            if (metadataStr) {
                metadata = JSON.parse(metadataStr);
            }
        } catch (e) {
            // Invalid metadata, use empty object
        }

        // Parse source files if provided
        let sourceFiles = [];
        try {
            const sourceFilesStr = formData.get('sourceFiles');
            if (sourceFilesStr) {
                sourceFiles = JSON.parse(sourceFilesStr);
            }
        } catch (e) {
            // Invalid source files, use empty array
        }

        if (!zipFile || zipFile.size === 0) {
            return NextResponse.json({ error: 'No zip file provided' }, { status: 400 });
        }

        // Convert file to buffer
        const zipBuffer = Buffer.from(await zipFile.arrayBuffer());

        // Store using the lifecycle manager
        const storeResult = await zipLifecycleManager.storeZip({
            projectId,
            userId: session.user.id,
            zipData: zipBuffer,
            fileName,
            storageType: 'permanent', // Force permanent storage for projects
            metadata: {
                ...metadata,
                uploadedVia: 'web_interface',
                originalFileName: zipFile.name,
                uploadedAt: new Date(),
                userAgent: request.headers.get('user-agent')
            },
            sourceFiles,
            replaceExisting
        });

        // If user was near/over quota, perform automatic cleanup
        if (quotaCheck.usagePercentage > 80) {
            try {
                await storageMaintenanceUtils.enforceUserQuota(session.user.id, {
                    autoCleanup: true,
                    dryRun: false
                });
            } catch (cleanupError) {
                console.error('Error during post-upload cleanup:', cleanupError);
                // Don't fail the upload, just log the error
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Zip file stored successfully',
            projectId,
            result: {
                cloudinaryUrl: storeResult.cloudinaryUrl,
                fileName: storeResult.fileName,
                fileSize: storeResult.fileSize,
                storageType: storeResult.storageType,
                versions: storeResult.versions?.length || 1,
                totalStorageUsed: storeResult.totalStorageUsed
            }
        });

    } catch (error) {
        console.error('Error in POST /api/projects/[id]/zip:', error);
        return NextResponse.json({ 
            error: 'Failed to store zip file',
            message: error.message 
        }, { status: 500 });
    }
}

// PUT - Update zip file or restore version
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id: projectId } = params;
        const body = await request.json();
        const { action, versionNumber, metadata } = body;

        // Verify project ownership
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        switch (action) {
            case 'restore':
                if (!versionNumber) {
                    return NextResponse.json({ error: 'Version number required for restore' }, { status: 400 });
                }

                const restoreResult = await projectPermanentStorage.restoreProjectVersion(projectId, versionNumber);
                
                return NextResponse.json({
                    success: true,
                    message: restoreResult.message,
                    projectId,
                    restoredVersion: versionNumber
                });

            case 'updateMetadata':
                if (!metadata) {
                    return NextResponse.json({ error: 'Metadata required for update' }, { status: 400 });
                }

                const updatedProject = await Project.findById(projectId);
                await updatedProject.updateGeneratedCodeMetadata(metadata);

                return NextResponse.json({
                    success: true,
                    message: 'Metadata updated successfully',
                    projectId
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in PUT /api/projects/[id]/zip:', error);
        return NextResponse.json({ 
            error: 'Failed to update',
            message: error.message 
        }, { status: 500 });
    }
}

// DELETE - Delete zip file or specific version
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id: projectId } = params;
        const url = new URL(request.url);
        const version = url.searchParams.get('version'); // null = all, 'current' = current only, number = specific version

        // Verify project ownership
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const deleteResult = await projectPermanentStorage.deleteProjectVersions(projectId, version);

        const message = version === null 
            ? 'All generated files deleted'
            : version === 'current'
            ? 'Current version deleted'
            : `Version ${version} deleted`;

        return NextResponse.json({
            success: true,
            message,
            projectId,
            deletedVersions: deleteResult.deletedVersions,
            cloudinaryDeletions: deleteResult.cloudinaryDeletions,
            remainingVersions: deleteResult.remainingVersions
        });

    } catch (error) {
        console.error('Error in DELETE /api/projects/[id]/zip:', error);
        return NextResponse.json({ 
            error: 'Failed to delete',
            message: error.message 
        }, { status: 500 });
    }
}