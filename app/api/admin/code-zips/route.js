// app/api/admin/code-zips/route.js
import { NextResponse } from 'next/server';
import codeZipService from '../../../../lib/codeZipService.js';

// POST - Administrative actions
export async function POST(request) {
    try {
        const body = await request.json();
        const { action, adminKey } = body;

        // Simple admin key check (in production, use proper authentication)
        if (adminKey !== process.env.ADMIN_KEY) {
            return NextResponse.json({ 
                error: 'Unauthorized - Invalid admin key' 
            }, { status: 401 });
        }

        switch (action) {
            case 'cleanup':
                const { hardDelete = false } = body;
                const cleanupResult = await codeZipService.cleanupExpiredZips(hardDelete);
                return NextResponse.json({
                    success: true,
                    action: 'cleanup',
                    result: cleanupResult,
                    message: `Cleanup completed: ${cleanupResult.markedDeleted} zips marked as deleted${hardDelete ? `, ${cleanupResult.cloudinaryDeleted} deleted from Cloudinary` : ''}`
                });

            case 'statistics':
                const stats = await codeZipService.getStatistics();
                return NextResponse.json({
                    success: true,
                    action: 'statistics',
                    statistics: stats
                });

            default:
                return NextResponse.json({ 
                    error: 'Invalid action. Supported actions: cleanup, statistics' 
                }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in admin code-zips action:', error);
        return NextResponse.json({ 
            error: error.message || 'Admin action failed' 
        }, { status: 500 });
    }
}