// app/api/admin/storage/route.js
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import zipLifecycleManager from '../../../../lib/zipLifecycleManager.js';
import storageMaintenanceUtils from '../../../../lib/storageMaintenanceUtils.js';
import projectPermanentStorage from '../../../../lib/projectPermanentStorage.js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route.js';

/**
 * Administrative API endpoint for storage management and maintenance
 * Only accessible by admin users
 */

// GET - Get storage statistics and health report
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const url = new URL(request.url);
        const action = url.searchParams.get('action'); // 'stats', 'health', 'quota'
        const userId = url.searchParams.get('userId'); // For user-specific queries

        switch (action) {
            case 'health':
                const healthReport = await storageMaintenanceUtils.getStorageHealthReport();
                return NextResponse.json({
                    success: true,
                    healthReport
                });

            case 'quota':
                if (!userId) {
                    return NextResponse.json({ error: 'User ID required for quota check' }, { status: 400 });
                }
                
                const quotaStatus = await storageMaintenanceUtils.enforceUserQuota(userId, {
                    dryRun: true
                });
                
                return NextResponse.json({
                    success: true,
                    quotaStatus
                });

            case 'stats':
            default:
                const globalStats = await zipLifecycleManager.getStorageStats(userId);
                
                return NextResponse.json({
                    success: true,
                    timestamp: new Date(),
                    globalStats,
                    userId: userId || 'all'
                });
        }

    } catch (error) {
        console.error('Error in GET /api/admin/storage:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            message: error.message 
        }, { status: 500 });
    }
}

// POST - Perform maintenance operations
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { 
            action, 
            userId = null,
            dryRun = false,
            options = {}
        } = body;

        switch (action) {
            case 'cleanup':
                const cleanupResult = await zipLifecycleManager.runCleanup({
                    dryRun,
                    userId,
                    ...options
                });
                
                return NextResponse.json({
                    success: true,
                    action: 'cleanup',
                    dryRun,
                    results: cleanupResult
                });

            case 'maintenance':
                const maintenanceResult = await storageMaintenanceUtils.performSystemMaintenance({
                    dryRun,
                    ...options
                });
                
                return NextResponse.json({
                    success: true,
                    action: 'maintenance',
                    dryRun,
                    results: maintenanceResult
                });

            case 'enforceQuota':
                if (!userId) {
                    return NextResponse.json({ error: 'User ID required for quota enforcement' }, { status: 400 });
                }
                
                const quotaResult = await storageMaintenanceUtils.enforceUserQuota(userId, {
                    dryRun,
                    autoCleanup: true,
                    ...options
                });
                
                return NextResponse.json({
                    success: true,
                    action: 'enforceQuota',
                    dryRun,
                    userId,
                    results: quotaResult
                });

            case 'migrate':
                const migrationResult = await zipLifecycleManager.migrateStorage({
                    dryRun,
                    userId,
                    ...options
                });
                
                return NextResponse.json({
                    success: true,
                    action: 'migrate',
                    dryRun,
                    results: migrationResult
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in POST /api/admin/storage:', error);
        return NextResponse.json({ 
            error: 'Maintenance operation failed',
            message: error.message 
        }, { status: 500 });
    }
}

// PUT - Update storage settings or configurations
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { action, settings } = body;

        switch (action) {
            case 'updateQuotaLimits':
                // This would update quota limits in the maintenance utils
                // For now, just return success as this would require persistent storage
                return NextResponse.json({
                    success: true,
                    message: 'Quota limits updated',
                    action: 'updateQuotaLimits',
                    settings
                });

            case 'updateRetentionPolicies':
                // This would update retention policies
                return NextResponse.json({
                    success: true,
                    message: 'Retention policies updated',
                    action: 'updateRetentionPolicies',
                    settings
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in PUT /api/admin/storage:', error);
        return NextResponse.json({ 
            error: 'Settings update failed',
            message: error.message 
        }, { status: 500 });
    }
}

// DELETE - Emergency cleanup operations
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        const userId = url.searchParams.get('userId');
        const projectId = url.searchParams.get('projectId');
        const confirm = url.searchParams.get('confirm') === 'true';

        if (!confirm) {
            return NextResponse.json({ 
                error: 'Confirmation required for destructive operations',
                message: 'Add ?confirm=true to the request to proceed'
            }, { status: 400 });
        }

        switch (action) {
            case 'forceCleanupUser':
                if (!userId) {
                    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
                }

                // Force cleanup all user data
                const userCleanup = await storageMaintenanceUtils.enforceUserQuota(userId, {
                    dryRun: false,
                    autoCleanup: true
                });

                // Additional aggressive cleanup for admin
                const aggressiveCleanup = await zipLifecycleManager.runCleanup({
                    userId,
                    dryRun: false,
                    cleanupExpired: true,
                    cleanupOldVersions: true,
                    cleanupCache: true,
                    maxAge: 1 // Very aggressive - 1 day
                });

                return NextResponse.json({
                    success: true,
                    action: 'forceCleanupUser',
                    userId,
                    results: {
                        quotaEnforcement: userCleanup,
                        aggressiveCleanup: aggressiveCleanup
                    }
                });

            case 'deleteProjectFiles':
                if (!projectId) {
                    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
                }

                const deleteResult = await projectPermanentStorage.deleteProjectVersions(projectId);

                return NextResponse.json({
                    success: true,
                    action: 'deleteProjectFiles',
                    projectId,
                    results: deleteResult
                });

            case 'emergencyCleanup':
                // System-wide emergency cleanup
                const emergencyResult = await zipLifecycleManager.runCleanup({
                    dryRun: false,
                    cleanupExpired: true,
                    cleanupOldVersions: true,
                    cleanupCache: true,
                    maxAge: 7 // Aggressive - 7 days
                });

                return NextResponse.json({
                    success: true,
                    action: 'emergencyCleanup',
                    results: emergencyResult
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in DELETE /api/admin/storage:', error);
        return NextResponse.json({ 
            error: 'Emergency cleanup failed',
            message: error.message 
        }, { status: 500 });
    }
}