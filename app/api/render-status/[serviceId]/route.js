// /api/render-status/[serviceId]/route.js
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { serviceId } = params;
    
    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }
    
    // Forward request to Flask backend
    const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5006';
    
    const flaskResponse = await fetch(`${flaskUrl}/api/render-status/${serviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!flaskResponse.ok) {
      const errorData = await flaskResponse.json();
      return NextResponse.json({ error: errorData.error || 'Failed to get status' }, { status: flaskResponse.status });
    }
    
    const data = await flaskResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in render-status route:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}