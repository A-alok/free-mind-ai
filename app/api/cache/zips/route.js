// app/api/cache/zips/route.js
import { NextResponse } from 'next/server';
import zipCacheService from '../../../../lib/zipCacheService.js';

// GET - Check cache status and get cache statistics
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');

        switch (action) {
            case 'check':
                if (!filename) {
                    return NextResponse.json({ 
                        error: 'Filename is required for cache check' 
                    }, { status: 400 });
                }

                const cacheResult = await zipCacheService.getZip(filename, userId);
                return NextResponse.json({
                    success: true,
                    filename,
                    cached: cacheResult.source === 'cache',
                    source: cacheResult.source,
                    url: cacheResult.url || null,
                    codeZip: cacheResult.codeZip || null
                });

            case 'stats':
                const memoryStats = zipCacheService.getCacheStats();
                return NextResponse.json({
                    success: true,
                    statistics: memoryStats
                });

            default:
                return NextResponse.json({ 
                    error: 'Invalid action. Supported actions: check, stats' 
                }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in cache API:', error);
        return NextResponse.json({ 
            error: error.message || 'Cache operation failed' 
        }, { status: 500 });
    }
}

// POST - Force cache a file or cleanup cache
export async function POST(request) {
    try {
        const body = await request.json();
        const { action, filename, userId, adminKey } = body;

        switch (action) {
            case 'cleanup':
                // Simple admin check
                if (adminKey !== process.env.ADMIN_KEY) {
                    return NextResponse.json({ 
                        error: 'Admin key required for cleanup' 
                    }, { status: 401 });
                }

                const cleanupResult = await zipCacheService.cleanupCache();
                return NextResponse.json({
                    success: true,
                    action: 'cleanup',
                    result: cleanupResult
                });

            case 'force-cache':
                if (!filename) {
                    return NextResponse.json({ 
                        error: 'Filename is required for force caching' 
                    }, { status: 400 });
                }

                // This would need to fetch from Flask and cache
                // For now, just return the current cache status
                const currentStatus = await zipCacheService.getZip(filename, userId);
                
                if (currentStatus.source === 'cache') {
                    return NextResponse.json({
                        success: true,
                        message: 'File already cached',
                        cached: true,
                        url: currentStatus.url
                    });
                } else {
                    return NextResponse.json({
                        success: false,
                        message: 'File not available for caching (would need Flask fetch)',
                        cached: false
                    });
                }

            default:
                return NextResponse.json({ 
                    error: 'Invalid action. Supported actions: cleanup, force-cache' 
                }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in cache POST API:', error);
        return NextResponse.json({ 
            error: error.message || 'Cache operation failed' 
        }, { status: 500 });
    }
}