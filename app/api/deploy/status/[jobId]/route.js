// /api/deploy/status/[jobId]/route.js
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const flaskUrl = process.env.FLASK_API_URL || 'http://127.0.0.1:5000';
    
    // Forward the request to Flask
    const flaskResponse = await fetch(`${flaskUrl}/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!flaskResponse.ok) {
      let errorData;
      const responseText = await flaskResponse.text();
      
      try {
        errorData = JSON.parse(responseText);
      } catch (parseError) {
        errorData = { error: responseText || `Flask server error (${flaskResponse.status})` };
      }
      
      return NextResponse.json({ error: errorData.error || 'Failed to get job status' }, { status: flaskResponse.status });
    }

    const statusData = await flaskResponse.json();
    return NextResponse.json(statusData);

  } catch (error) {
    console.error('Error in deploy status route:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}