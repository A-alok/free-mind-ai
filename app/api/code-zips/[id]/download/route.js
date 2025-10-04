// app/api/code-zips/[id]/download/route.js
import { NextResponse } from 'next/server';
import codeZipService from '../../../../../lib/codeZipService.js';

// GET - Download code zip (redirects to Cloudinary URL and tracks download)
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // Track the download and get the download URL
        const downloadInfo = await codeZipService.trackDownload(id, userId);

        // Return download information
        return NextResponse.json({
            success: true,
            downloadUrl: downloadInfo.downloadUrl,
            fileName: downloadInfo.fileName,
            projectName: downloadInfo.projectName,
            downloadCount: downloadInfo.downloadCount,
            expiresAt: downloadInfo.expiresAt,
            message: 'Download tracked successfully. Use the downloadUrl to download the file.'
        });

    } catch (error) {
        console.error('Error tracking download:', error);
        const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 
                      error.message.includes('expired') ? 410 : 500;
        return NextResponse.json({ 
            error: error.message || 'Failed to process download' 
        }, { status });
    }
}

// POST - Same as GET but for cases where GET might be cached
export async function POST(request, { params }) {
    return GET(request, { params });
}