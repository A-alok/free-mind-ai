import { NextResponse } from "next/server"
import codeZipService from '../../../lib/codeZipService.js'

// Helper function to detect tech stack from generated files
function detectTechStack(generatedFiles) {
  const techStack = new Set();
  
  Object.keys(generatedFiles).forEach(filePath => {
    const fileName = filePath.toLowerCase();
    const extension = fileName.split('.').pop();
    
    // Detect by file extension
    switch (extension) {
      case 'js':
      case 'mjs':
        techStack.add('JavaScript');
        break;
      case 'ts':
        techStack.add('TypeScript');
        break;
      case 'py':
        techStack.add('Python');
        break;
      case 'java':
        techStack.add('Java');
        break;
      case 'cpp':
      case 'cc':
      case 'cxx':
        techStack.add('C++');
        break;
      case 'c':
        techStack.add('C');
        break;
      case 'go':
        techStack.add('Go');
        break;
      case 'rs':
        techStack.add('Rust');
        break;
      case 'php':
        techStack.add('PHP');
        break;
      case 'rb':
        techStack.add('Ruby');
        break;
      case 'swift':
        techStack.add('Swift');
        break;
      case 'kt':
        techStack.add('Kotlin');
        break;
      case 'html':
        techStack.add('HTML');
        break;
      case 'css':
      case 'scss':
      case 'sass':
        techStack.add('CSS');
        break;
      case 'json':
        if (fileName.includes('package.json')) {
          techStack.add('Node.js');
        }
        break;
      case 'xml':
        if (fileName.includes('pom.xml')) {
          techStack.add('Maven');
        }
        break;
      case 'gradle':
        techStack.add('Gradle');
        break;
      case 'dockerfile':
        techStack.add('Docker');
        break;
      case 'yml':
      case 'yaml':
        if (fileName.includes('docker-compose')) {
          techStack.add('Docker Compose');
        }
        break;
    }
    
    // Detect by file name
    if (fileName.includes('requirements.txt')) {
      techStack.add('pip');
    }
    if (fileName.includes('cargo.toml')) {
      techStack.add('Cargo');
    }
    if (fileName.includes('go.mod')) {
      techStack.add('Go Modules');
    }
    if (fileName.includes('composer.json')) {
      techStack.add('Composer');
    }
  });
  
  // Check file contents for frameworks (basic detection)
  Object.entries(generatedFiles).forEach(([filePath, content]) => {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('react') || contentLower.includes('jsx')) {
      techStack.add('React');
    }
    if (contentLower.includes('vue') || contentLower.includes('vue.js')) {
      techStack.add('Vue.js');
    }
    if (contentLower.includes('angular')) {
      techStack.add('Angular');
    }
    if (contentLower.includes('express') || contentLower.includes('app.listen')) {
      techStack.add('Express.js');
    }
    if (contentLower.includes('django') || contentLower.includes('from django')) {
      techStack.add('Django');
    }
    if (contentLower.includes('flask') || contentLower.includes('from flask')) {
      techStack.add('Flask');
    }
    if (contentLower.includes('spring') || contentLower.includes('@springboot')) {
      techStack.add('Spring Boot');
    }
    if (contentLower.includes('tensorflow') || contentLower.includes('keras')) {
      techStack.add('TensorFlow');
    }
    if (contentLower.includes('pytorch') || contentLower.includes('torch')) {
      techStack.add('PyTorch');
    }
  });
  
  return Array.from(techStack);
}

export async function POST(request) {
  try {
    // Get form data from the request
    const formData = await request.formData()

    // Extract data from the form
    const file = formData.get("file")
    const folderZip = formData.get("folder_zip")
    const textPrompt = formData.get("text_prompt")
    const taskType = formData.get("task_type")

    // Create a new FormData to forward to the Flask backend
    const flaskFormData = new FormData()
    if (file) flaskFormData.append("file", file)
    if (folderZip) flaskFormData.append("folder_zip", folderZip)
    flaskFormData.append("text_prompt", textPrompt)
    flaskFormData.append("task_type", taskType)

    // Forward the request to the Flask backend with a longer timeout
    const controller = new AbortController()
    const signal = controller.signal
    
    // Set timeout to 120 minutes for model training
    const timeout = setTimeout(() => controller.abort(), 120 * 60 * 1000)
    
    const flaskResponse = await fetch("http://127.0.0.1:5000/process", {
      method: "POST",
      body: flaskFormData,
      signal
    })
    
    clearTimeout(timeout)

    // Get the response from Flask
    const data = await flaskResponse.json()

    // If there's an error, return it
    if (!flaskResponse.ok || data.error) {
      console.error("Flask API error:", data.error || "Unknown error")
      return NextResponse.json({ error: data.error || "An error occurred during processing" }, { status: flaskResponse.status || 500 })
    }

    // Transform download URL to use our API with user tracking
    if (data.download_url) {
      const originalUrl = data.download_url
      const filename = originalUrl.split("/").pop()
      const userId = formData.get("user_id")
      
      // Add userId to download URL for tracking if provided
      if (userId) {
        data.download_url = `/api/download/${filename}?userId=${encodeURIComponent(userId)}`
      } else {
        data.download_url = `/api/download/${filename}`
      }
      
      // Also provide direct filename for reference
      data.zip_filename = filename
    }

    // Ensure visualization data is properly structured
    if (data.visualizations && !data.visualizations.plots) {
      // If backend returns visualizations in a different format, adapt it
      console.log("Transforming visualization data structure")
      const plots = Array.isArray(data.visualizations) 
        ? data.visualizations 
        : Object.values(data.visualizations).flat()
      
      data.visualizations = { plots }
    }
    
    // Forward any detected task type information to the frontend
    if (data.detected_task_type && data.detected_task_type !== taskType) {
      console.log(`Task type was changed from ${taskType} to ${data.detected_task_type} by the backend`)
    }

    // Store generated code as zip if code generation was successful
    let codeZipInfo = null;
    if (data.success && data.generated_code && typeof data.generated_code === 'object') {
      try {
        // Extract user info from request headers or form data
        const userId = formData.get("user_id") || null;
        const userEmail = formData.get("user_email") || null;
        const projectName = formData.get("project_name") || `Generated Project ${new Date().toISOString().slice(0, 10)}`;
        const projectDescription = formData.get("project_description") || '';
        const isPublic = formData.get("is_public") === 'true' || false;
        
        // Detect tech stack from generated files
        const techStack = detectTechStack(data.generated_code);
        
        // Store the generated code as zip
        codeZipInfo = await codeZipService.processGeneratedCode({
          generatedFiles: data.generated_code,
          projectName,
          projectDescription,
          userId,
          userEmail,
          techStack,
          generationParameters: {
            model: 'freemind-ai',
            prompt: textPrompt,
            taskType: data.detected_task_type || taskType,
            additionalSettings: {
              hasFile: !!file,
              hasFolderZip: !!folderZip
            }
          },
          tags: ['auto-generated', taskType],
          isPublic,
          expirationDays: 30
        });
        
        console.log('✅ Generated code stored as zip:', codeZipInfo.zipId);
        
        // Add zip info to response
        data.codeZip = {
          zipId: codeZipInfo.zipId,
          downloadUrl: codeZipInfo.downloadUrl,
          expiresAt: codeZipInfo.expiresAt,
          message: 'Code has been saved as a downloadable zip file'
        };
        
      } catch (zipError) {
        console.error('⚠️ Failed to store code as zip:', zipError.message);
        // Don't fail the main request if zip storage fails
        data.zipWarning = 'Code generation successful but failed to store as zip: ' + zipError.message;
      }
    }

    // Return the response
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in process API route:", error)
    return NextResponse.json({ 
      error: error.message || "An error occurred during processing. The request may have timed out." 
    }, { status: 500 })
  }
}