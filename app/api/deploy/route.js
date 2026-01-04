// /api/deploy/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Octokit } from '@octokit/rest';
import AdmZip from 'adm-zip';

export const config = {
  api: {
    // Note: In newer versions of Next.js App Router, this 
    // config might not be necessary as it handles FormData differently
    bodyParser: false,
  },
};

// Allow longer execution for this route (useful on platforms that respect it)
export const maxDuration = 300; // 5 minutes (Vercel free plan limit)

export async function POST(req) {
  try {
    // Parse the form data from the request
    const formData = await req.formData();
    const modelZip = formData.get('model_zip');

    // Check if model ZIP was provided
    if (!modelZip) {
      return NextResponse.json({ error: 'No trained model ZIP provided. Please upload a ZIP file containing your trained ML model.' }, { status: 400 });
    }

    // Validate it's a ZIP file
    if (!modelZip.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Please upload a ZIP file containing your trained model.' }, { status: 400 });
    }

    // Get GitHub credentials from environment
    const githubToken = process.env.GITHUB_TOKEN;
    const githubUsername = process.env.GITHUB_USERNAME;

    if (!githubToken || !githubUsername) {
      return NextResponse.json({
        error: 'GitHub credentials not configured. Please set GITHUB_TOKEN and GITHUB_USERNAME in environment variables.'
      }, { status: 500 });
    }

    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: githubToken,
    });

    try {
      // Process the model ZIP for deployment
      const modelBuffer = Buffer.from(await modelZip.arrayBuffer());
      const modelSizeMB = modelBuffer.length / (1024 * 1024);

      // Create a unique repository name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const repoName = `ml-model-${timestamp}`;

      // Step 1: Extract ZIP contents
      const zip = new AdmZip(modelBuffer);
      const zipEntries = zip.getEntries();

      // Validate ZIP contains required files
      const requiredFiles = ['load_model.py', 'requirements.txt'];
      const zipFileNames = zipEntries.map(entry => entry.entryName);

      const missingFiles = requiredFiles.filter(file =>
        !zipFileNames.some(zipFile => zipFile.includes(file))
      );

      if (missingFiles.length > 0) {
        return NextResponse.json({
          error: `Missing required files in ZIP: ${missingFiles.join(', ')}. Please ensure your ZIP contains load_model.py and requirements.txt.`
        }, { status: 400 });
      }

      // Helper: sleep
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));

      // Step 2: Create GitHub repository (initialized so default branch exists)
      const repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: `ML Model deployment created from FreeMindAI - ${modelZip.name}`,
        private: false, // Set to true if you want private repos
        auto_init: true,
        gitignore_template: 'Python'
      });

      const repoUrl = repoResponse.data.html_url;
      const repoFullName = repoResponse.data.full_name;
      const ownerLogin = repoResponse.data.owner.login;
      const defaultBranch = repoResponse.data.default_branch || 'main';

      // Give GitHub a moment to initialize default branch
      await sleep(800);

      // Step 3: Build full commit using Git Data API (avoids per-file 409/422)
      // Collect files from ZIP into a map
      const filesMap = new Map();
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        const filePath = entry.entryName.replace(/^\/+/, ''); // normalize
        filesMap.set(filePath, entry.getData());
      }

      // Add render.yaml (always) and README.md (if not present)
      const renderConfig = `# Render deployment configuration\nservices:\n  - type: web\n    name: ${repoName}\n    env: python\n    buildCommand: pip install -r requirements.txt\n    startCommand: python load_model.py\n    envVars:\n      - key: PYTHON_VERSION\n        value: 3.11\n`;
      filesMap.set('render.yaml', Buffer.from(renderConfig));

      if (!filesMap.has('README.md')) {
        const readmeContent = `# ML Model Deployment\n\n## Overview\nThis repository contains a machine learning model deployed from FreeMindAI.\n\n**Model File:** ${modelZip.name}\n**Size:** ${modelSizeMB.toFixed(2)} MB\n**Created:** ${new Date().toISOString()}\n\n## Quick Deploy\n\n### Deploy to Render\n1. Connect this GitHub repository to Render\n2. Use the following settings:\n   - **Build Command:** \`pip install -r requirements.txt\`\n   - **Start Command:** \`python load_model.py\`\n   - **Python Version:** 3.11\n\n### Local Development\n\`\`\`bash\npip install -r requirements.txt\npython load_model.py\n\`\`\`\n\n## Files\n${zipFileNames.map(file => `- ${file}`).join('\n')}\n\n---\n*Generated by FreeMindAI*`;
        filesMap.set('README.md', Buffer.from(readmeContent));
      }

      // Fetch base commit sha for default branch
      const ref = await octokit.rest.git.getRef({ owner: ownerLogin, repo: repoName, ref: `heads/${defaultBranch}` });
      const baseCommitSha = ref.data.object.sha;

      // Create blobs and tree entries
      const treeEntries = [];
      for (const [p, buf] of filesMap.entries()) {
        const blob = await octokit.rest.git.createBlob({ owner: ownerLogin, repo: repoName, content: buf.toString('base64'), encoding: 'base64' });
        treeEntries.push({ path: p, mode: '100644', type: 'blob', sha: blob.data.sha });
      }

      // Create a new tree based on base commit
      const newTree = await octokit.rest.git.createTree({ owner: ownerLogin, repo: repoName, base_tree: baseCommitSha, tree: treeEntries });

      // Create a commit
      const commit = await octokit.rest.git.createCommit({ owner: ownerLogin, repo: repoName, message: 'Add model files and deployment config', tree: newTree.data.sha, parents: [baseCommitSha] });

      // Update branch ref to point to new commit
      await octokit.rest.git.updateRef({ owner: ownerLogin, repo: repoName, ref: `heads/${defaultBranch}`, sha: commit.data.sha, force: true });

      // Return success response with real GitHub URLs
      return NextResponse.json({
        success: true,
        deployment_id: repoName,
        model_file: modelZip.name,
        model_size: `${modelSizeMB.toFixed(2)} MB`,
        status: 'github_deployed',
        github_url: repoUrl,
        github_repo: repoFullName,
        render_url: `https://dashboard.render.com/create?repo=${repoUrl}`,
        files_uploaded: zipFileNames.length,
        message: `Successfully created GitHub repository '${repoName}' with ${zipFileNames.length} files from your ML model ZIP.`
      });


    } catch (githubError) {
      console.error('GitHub API Error:', githubError);

      // Handle specific GitHub API errors
      if (githubError.status === 401) {
        return NextResponse.json({
          error: 'GitHub authentication failed. Please check your GITHUB_TOKEN.'
        }, { status: 401 });
      }

      if (githubError.status === 422) {
        return NextResponse.json({
          error: 'Repository name already exists or is invalid. Please try again.'
        }, { status: 422 });
      }

      return NextResponse.json({
        error: `GitHub deployment failed: ${githubError.message}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in deploy route:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}