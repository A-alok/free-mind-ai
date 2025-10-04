// app/api/code-zips/route.js
import { NextResponse } from 'next/server';
import codeZipService from '../../../lib/codeZipService.js';

// GET - List user's code zips or public zips
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const isPublic = searchParams.get('public') === 'true';
        const limit = parseInt(searchParams.get('limit')) || 20;
        const skip = parseInt(searchParams.get('skip')) || 0;

        let codeZips;
        
        if (isPublic) {
            codeZips = await codeZipService.getPublicCodeZips({ limit, skip });
        } else if (userId) {
            codeZips = await codeZipService.getUserCodeZips(userId, { limit, skip });
        } else {
            return NextResponse.json({ 
                error: 'Either userId or public=true parameter is required' 
            }, { status: 400 });
        }

        // Get statistics if requested
        const includeStats = searchParams.get('stats') === 'true';
        let statistics = null;
        if (includeStats) {
            statistics = await codeZipService.getStatistics(isPublic ? null : userId);
        }

        return NextResponse.json({
            success: true,
            codeZips,
            statistics,
            count: codeZips.length,
            hasMore: codeZips.length === limit
        });

    } catch (error) {
        console.error('Error fetching code zips:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to fetch code zips' 
        }, { status: 500 });
    }
}

// POST - Store generated code as zip
export async function POST(request) {
    try {
        const body = await request.json();
        
        const {
            generatedFiles,
            projectName,
            projectDescription,
            userId,
            userEmail,
            techStack,
            generationParameters,
            tags,
            isPublic,
            expirationDays
        } = body;

        // Validate required fields
        if (!generatedFiles || Object.keys(generatedFiles).length === 0) {
            return NextResponse.json({ 
                error: 'Generated files are required' 
            }, { status: 400 });
        }

        if (!projectName) {
            return NextResponse.json({ 
                error: 'Project name is required' 
            }, { status: 400 });
        }

        // Process the generated code
        const result = await codeZipService.processGeneratedCode({
            generatedFiles,
            projectName,
            projectDescription,
            userId,
            userEmail,
            techStack,
            generationParameters,
            tags,
            isPublic,
            expirationDays
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error storing code zip:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to store code zip' 
        }, { status: 500 });
    }
}