# Project Context Integration

## Overview

The system has been modified to update **existing projects** with Cloudinary URLs instead of creating new project documents. This ensures that the generated model zip file is stored within the same project that initiated the training.

## How It Works

### 1. **Project Context Extraction**
The Flask app now extracts project and user context from:
- **Form data** (recommended)
- **HTTP headers** (alternative)

### 2. **Project Finding Priority**
The system searches for projects in this order:
1. **Project ID** (exact match) - most reliable
2. **Project Name + User ID** - reliable for user's projects
3. **Project Name only** - fallback (less reliable)

### 3. **Cloudinary URL Storage**
Once found, the system updates the existing project with:
```javascript
{
  generatedFiles: {
    zipFile: {
      cloudinaryUrl: "https://res.cloudinary.com/...",
      cloudinaryPublicId: "freemind-ml-projects/...",
      fileName: "project_name.zip",
      fileSize: 2048576,
      generatedAt: new Date(),
      downloadCount: 0,
      expiresAt: new Date(Date.now() + 365*24*60*60*1000)
    }
  }
}
```

## Frontend Integration

### Method 1: Form Data (Recommended)
When submitting the training request, include project context:

```javascript
// React/JavaScript example
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('task_type', taskType);
formData.append('text_prompt', prompt);

// PROJECT CONTEXT - Add these fields
formData.append('project_id', currentProject.id);         // MongoDB ObjectId
formData.append('user_id', currentUser.id);               // User's MongoDB ObjectId  
formData.append('project_name', currentProject.name);     // Project name for fallback

const response = await fetch('/process', {
    method: 'POST',
    body: formData
});
```

### Method 2: HTTP Headers (Alternative)
```javascript
const response = await fetch('/process', {
    method: 'POST',
    headers: {
        'X-Project-Id': currentProject.id,
        'X-User-Id': currentUser.id,
        'X-Project-Name': currentProject.name
    },
    body: formData
});
```

## API Response Changes

The API now returns enhanced project information:

```json
{
  "success": true,
  "model_info": { "..." },
  "visualizations": { "..." },
  "download_url": "/api/download/project_abc123.zip",
  
  "cloudinary": {
    "success": true,
    "url": "https://res.cloudinary.com/.../project.zip",
    "size": 2048576,
    "public_id": "freemind-ml-projects/user123/...",
    "database_update": {
      "success": true,
      "project_id": "64f8a1b2c3d4e5f6a7b8c9d0",    // Updated existing project
      "message": "Project updated with Cloudinary URL"
    }
  }
}
```

## Implementation Examples

### Next.js Project Training Component
```jsx
// components/ProjectTraining.jsx
import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

export function ProjectTraining({ project }) {
    const { user } = useAuth();
    const [isTraining, setIsTraining] = useState(false);
    
    const handleTraining = async (file, taskType, prompt) => {
        setIsTraining(true);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('task_type', taskType);
        formData.append('text_prompt', prompt);
        
        // Pass project context
        formData.append('project_id', project._id);
        formData.append('user_id', user._id);  
        formData.append('project_name', project.name);
        
        try {
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success && result.cloudinary?.database_update?.success) {
                console.log('Project updated with Cloudinary URL:', 
                           result.cloudinary.database_update.project_id);
                // Refresh project data to show new zip file
                onProjectUpdated(result.cloudinary.database_update.project_id);
            }
        } catch (error) {
            console.error('Training failed:', error);
        } finally {
            setIsTraining(false);
        }
    };
    
    return (
        <div>
            {/* Your training UI */}
        </div>
    );
}
```

### Express.js API Route Integration
```javascript
// app/api/projects/[id]/train/route.js
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    const { id: projectId } = params;
    const user = await getUserFromToken(request);
    
    const formData = await request.formData();
    
    // Create FormData for Python backend with project context
    const pythonFormData = new FormData();
    pythonFormData.append('file', formData.get('file'));
    pythonFormData.append('task_type', formData.get('task_type'));
    pythonFormData.append('text_prompt', formData.get('text_prompt'));
    
    // Add project context
    pythonFormData.append('project_id', projectId);
    pythonFormData.append('user_id', user._id);
    pythonFormData.append('project_name', formData.get('project_name'));
    
    // Forward to Python Flask backend
    const response = await fetch('http://localhost:5000/process', {
        method: 'POST',
        body: pythonFormData
    });
    
    const result = await response.json();
    return NextResponse.json(result);
}
```

## Error Handling

### Project Not Found
If a specific `project_id` is provided but not found:
```json
{
  "success": false,
  "error": "Project with ID 64f8a1b2c3d4e5f6a7b8c9d0 not found",
  "message": "Project not found and cannot create with specific ID"
}
```

### Fallback Behavior
- **No project context**: Creates new project (backward compatibility)
- **Invalid project_id**: Searches by name + user_id
- **No user_id**: Searches by name only
- **MongoDB unavailable**: Continues with local storage only

## Configuration

### Environment Variables
```env
# MongoDB (required for project updates)
MONGODB_URI=mongodb://localhost:27017/freemind_ai

# Cloudinary (required for cloud storage)  
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Benefits

### ✅ **Exact Project Updates**
- Updates the correct project that initiated training
- No duplicate project creation
- Maintains project history and context

### ✅ **User-Scoped Projects**  
- Only updates projects belonging to the correct user
- Prevents cross-user project pollution
- Enhanced security

### ✅ **Reliable Project Matching**
- Multiple fallback strategies
- Robust error handling
- Detailed logging for debugging

### ✅ **Backward Compatible**
- Works without project context (creates new projects)
- Graceful degradation when services unavailable
- No breaking changes to existing workflows

## Testing

### Test Project Update
```bash
# With project context
curl -X POST http://localhost:5000/process \
  -F "file=@dataset.csv" \
  -F "task_type=classification" \
  -F "project_id=64f8a1b2c3d4e5f6a7b8c9d0" \
  -F "user_id=64f8a1b2c3d4e5f6a7b8c9d1" \
  -F "project_name=My ML Project"
```

### Monitor Logs
```bash
# Check if project was found and updated
tail -f your_app.log | grep "Found project by"
tail -f your_app.log | grep "Updated project"
```

## Next Steps

1. **Update your frontend** to include project context in training requests
2. **Test the integration** with existing projects  
3. **Monitor the logs** to ensure projects are being found and updated correctly
4. **Configure environment variables** for MongoDB and Cloudinary

The system now ensures that your trained model zip files are stored exactly where they belong - within the project that requested the training!