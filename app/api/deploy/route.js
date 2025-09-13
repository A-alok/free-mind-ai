// /api/deploy/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const config = {
  api: {
    // Note: In newer versions of Next.js App Router, this 
    // config might not be necessary as it handles FormData differently
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    // Create a temporary directory to store the uploaded file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-deploy-'));
    const zipPath = path.join(tempDir, 'project.zip');

    // Parse the form data from the request
    const formData = await req.formData();
    const file = formData.get('file');
    const taskType = formData.get('task_type') || 'ml';

    // Make sure we have a file
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Get the file content as ArrayBuffer and convert to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Save the file to a temporary location
    fs.writeFileSync(zipPath, fileBuffer);

    // Forward request to Flask backend
    const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5006';
    
    // Create a new FormData to send to Flask
    const flaskFormData = new FormData();
    const fileBlob = new Blob([fileBuffer]);
    flaskFormData.append('file', fileBlob, file.name);
    flaskFormData.append('task_type', taskType);
    
    const flaskResponse = await fetch(`${flaskUrl}/api/deploy`, {
      method: 'POST',
      body: flaskFormData,
    });
    
    // Clean up the temporary directory
    fs.unlinkSync(zipPath);
    fs.rmdirSync(tempDir);
    
    if (!flaskResponse.ok) {
      const errorData = await flaskResponse.json();
      return NextResponse.json({ error: errorData.error || 'Deployment failed' }, { status: flaskResponse.status });
    }
    
    const data = await flaskResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in deploy route:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}