// app/api/code-zips/[id]/route.js
import { NextResponse } from 'next/server';
import codeZipService from '../../../../lib/codeZipService.js';

// GET - Get specific code zip details
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const codeZip = await codeZipService.getCodeZip(id, userId);

        return NextResponse.json({
            success: true,
            codeZip
        });

    } catch (error) {
        console.error('Error fetching code zip:', error);
        const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
        return NextResponse.json({ 
            error: error.message || 'Failed to fetch code zip' 
        }, { status });
    }
}

// DELETE - Delete code zip
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const hardDelete = searchParams.get('hardDelete') === 'true';

        if (!userId) {
            return NextResponse.json({ 
                error: 'User ID is required for deletion' 
            }, { status: 400 });
        }

        const result = await codeZipService.deleteCodeZip(id, userId, hardDelete);

        return NextResponse.json({
            success: true,
            deleted: result,
            message: hardDelete ? 'Code zip permanently deleted' : 'Code zip marked as deleted'
        });

    } catch (error) {
        console.error('Error deleting code zip:', error);
        const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
        return NextResponse.json({ 
            error: error.message || 'Failed to delete code zip' 
        }, { status });
    }
}