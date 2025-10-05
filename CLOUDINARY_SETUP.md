# Cloudinary Integration Setup

This document explains how to set up and use the Cloudinary integration for storing ML project zip files.

## Overview

After successful model training, the system now automatically uploads the generated project zip file to Cloudinary in addition to storing it locally/in the database. This provides:

- **Cloud-based storage**: Reliable, scalable file storage
- **Global CDN**: Fast downloads from anywhere in the world
- **Automatic optimization**: File compression and optimization
- **Easy sharing**: Direct download URLs
- **Organization**: Files organized by user and project type

## Setup

### 1. Configure MongoDB

Ensure MongoDB is configured for storing project data:

```env
# MongoDB Configuration (required for database integration)
MONGODB_URI=mongodb://localhost:27017/freemind_ai
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/freemind_ai
```

### 2. Create Cloudinary Account

1. Go to [Cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Navigate to your Dashboard
4. Copy your credentials:
   - Cloud Name
   - API Key  
   - API Secret

### 3. Configure Environment Variables

Create a `.env` file in your project root (copy from `.env.example`):

```env
# MongoDB Configuration (required)
MONGODB_URI=mongodb://localhost:27017/freemind_ai

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Test Integration

Run the test scripts to verify everything is working:

```bash
# Test Cloudinary integration
python test_cloudinary.py

# Test MongoDB integration
python test_mongodb.py
```

## How It Works

### File Organization

Uploaded files are organized in Cloudinary with this structure:

```
freemind-ml-projects/
├── {user_id}/
│   ├── general_ml/
│   ├── image_classification/
│   └── object_detection/
└── anonymous/
    ├── general_ml/
    └── ...
```

### Automatic Upload Process

1. **Model Training Completes**: After successful training
2. **Zip Creation**: System creates project zip with model, code, and dependencies
3. **Cloudinary Upload**: Zip is uploaded to Cloudinary with metadata
4. **Database Update**: Cloudinary URL is stored in MongoDB `projects` collection
5. **Local Storage**: Zip is also stored locally/in database as backup
6. **Response**: API returns both local and Cloudinary download URLs

### Database Storage

Cloudinary URLs are stored in MongoDB in the following structure:

```javascript
// projects collection
{
  _id: ObjectId("..."),
  name: "ML Project Name",
  userId: ObjectId("..."),
  taskType: "image_classification",
  generatedFiles: {
    zipFile: {
      cloudinaryUrl: "https://res.cloudinary.com/your-cloud/raw/upload/...",
      cloudinaryPublicId: "freemind-ml-projects/user123/general_ml/project_20241004",
      fileName: "project_20241004.zip",
      fileSize: 1024567,
      generatedAt: ISODate("..."),
      downloadCount: 0,
      expiresAt: ISODate("...")
    },
    metadata: {
      cloudinaryUpload: {
        uploadedAt: ISODate("..."),
        folder: "freemind-ml-projects/user123/general_ml",
        tags: ["ml-project", "generated-code"],
        context: { ... }
      }
    }
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### API Response Format

After training, the API now returns Cloudinary information:

```json
{
  "success": true,
  "model_info": { ... },
  "visualizations": { ... },
  "download_url": "/api/download/project_abc123.zip",
  "cloudinary": {
    "url": "https://res.cloudinary.com/your-cloud/raw/upload/...",
    "success": true,
    "size": 1234567
  }
}
```

### File Metadata

Each uploaded file includes metadata:

- **Project name**: Derived from user input or auto-generated
- **Task type**: `general_ml`, `image_classification`, `object_detection`
- **User ID**: For organization and access control
- **Creation timestamp**: When the model was trained
- **Tags**: Searchable tags for filtering

## Benefits

### For Users
- **Faster Downloads**: Global CDN ensures fast downloads
- **Reliable Access**: Files stored in professional cloud infrastructure
- **Easy Sharing**: Direct URLs for sharing projects
- **No Expiration**: Files don't expire (configurable)

### For Developers
- **Reduced Server Load**: Files served from Cloudinary, not your server
- **Automatic Optimization**: Cloudinary handles compression
- **Backup**: Multiple storage locations (local + cloud)
- **Analytics**: Cloudinary provides download analytics

## Configuration Options

### Upload Settings

In `cloudinary_utils.py`, you can configure:

```python
# Folder structure
folder_parts = ["freemind-ml-projects"]
if user_id:
    folder_parts.append(str(user_id))
if task_type:
    folder_parts.append(task_type)

# Upload options
upload_options = {
    "folder": folder_path,
    "resource_type": "raw",  # For non-image files
    "overwrite": True,       # Allow replacing files
    "tags": ["ml-project", "generated-code", task_type]
}
```

### Fallback Behavior

If Cloudinary is not configured or upload fails:
- System continues with local storage only
- No errors are thrown
- Warning messages are logged
- API response excludes `cloudinary` field

## File Management

### Viewing Files

In your Cloudinary Dashboard:
1. Go to Media Library
2. Navigate to `freemind-ml-projects` folder
3. Browse by user and project type

### Programmatic Access

```python
from cloudinary_utils import get_cloudinary_download_url, delete_zip_from_cloudinary

# Get download URL
url = get_cloudinary_download_url("public_id")

# Delete file
result = delete_zip_from_cloudinary("public_id")
```

## Troubleshooting

### Common Issues

1. **Upload fails silently**
   - Check environment variables are set correctly
   - Verify Cloudinary credentials in dashboard
   - Run `python test_cloudinary.py`

2. **Files not appearing in Cloudinary**
   - Check folder permissions in Cloudinary settings
   - Verify API key has upload permissions

3. **Large file uploads failing**
   - Free accounts have file size limits
   - Consider upgrading Cloudinary plan

### Debug Mode

Enable debug logging by adding to your environment:

```env
CLOUDINARY_DEBUG=true
```

## Security Considerations

- **API Secrets**: Never commit API secrets to version control
- **File Access**: Consider implementing access controls
- **File Expiration**: Configure expiration policies as needed
- **Usage Limits**: Monitor Cloudinary usage to avoid overage charges

## Cost Optimization

- **Free Tier**: 25 GB storage, 25 GB bandwidth/month
- **Compression**: Files are automatically optimized
- **Cleanup**: Implement periodic cleanup of old files
- **Monitoring**: Use Cloudinary analytics to track usage