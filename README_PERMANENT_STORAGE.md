# Permanent Cloudinary Storage System

## Overview

This project now includes a comprehensive permanent storage system for generated code zips using Cloudinary. The system provides long-term storage, version management, automatic cleanup, and quota enforcement for all project-related files.

## Key Features

### 🔒 Permanent Storage
- **Long-term retention**: Files stored for 1 year by default (vs 30 days for cache)
- **Project integration**: Files are directly linked to projects in MongoDB
- **Version history**: Automatic versioning with restoration capabilities
- **Metadata tracking**: Comprehensive metadata for each stored file

### 📊 Intelligent Storage Management
- **Auto-routing**: Automatically chooses between permanent and cache storage
- **Quota enforcement**: Per-user storage quotas with automatic cleanup
- **Health monitoring**: System health reports and maintenance utilities
- **Migration tools**: Migrate existing cache files to permanent storage

### 🧹 Automated Maintenance
- **Scheduled cleanup**: Daily automatic cleanup of expired files
- **Version management**: Automatic cleanup of old versions (keeps latest 10)
- **Quota enforcement**: Automatic cleanup when users exceed quotas
- **Data integrity**: Regular validation and cleanup of orphaned files

## Architecture

### Core Components

1. **Project Model Enhancements** (`models/project.js`)
   - Added `generatedFiles` schema with permanent storage fields
   - Version management methods
   - Storage calculation utilities

2. **Project Permanent Storage** (`lib/projectPermanentStorage.js`)
   - Main service for permanent file storage
   - Version management and restoration
   - Migration from cache storage

3. **Zip Lifecycle Manager** (`lib/zipLifecycleManager.js`)
   - Unified interface for all storage operations
   - Intelligent routing between storage types
   - Automated cleanup and maintenance

4. **Storage Maintenance Utils** (`lib/storageMaintenanceUtils.js`)
   - Quota enforcement and management
   - System-wide maintenance operations
   - Health monitoring and reporting

### Enhanced Cloudinary Integration

The existing `lib/cloudinary.js` already includes methods for zip file storage:
- `uploadZipToCloudinary()` - Upload zip buffers
- `uploadZipFileToCloudinary()` - Upload zip files from paths  
- `deleteZipFromCloudinary()` - Delete files from Cloudinary

## Usage Examples

### Basic Usage

```javascript
import zipLifecycleManager from './lib/zipLifecycleManager.js';

// Store a zip file permanently for a project
const result = await zipLifecycleManager.storeZip({
    projectId: 'project123',
    userId: 'user456',
    zipData: zipBuffer,
    fileName: 'my-project.zip',
    storageType: 'permanent',
    metadata: {
        techStack: ['React', 'Node.js'],
        framework: 'Next.js',
        language: 'JavaScript'
    }
});

// Download a file
const download = await zipLifecycleManager.downloadZip({
    projectId: 'project123',
    userId: 'user456',
    versionNumber: 'current'
});
```

### Version Management

```javascript
import projectPermanentStorage from './lib/projectPermanentStorage.js';

// List all versions
const versions = await projectPermanentStorage.listProjectVersions('project123');

// Restore a specific version
await projectPermanentStorage.restoreProjectVersion('project123', 2);

// Get version-specific info
const versionInfo = await projectPermanentStorage.getProjectZip('project123', '2');
```

### Storage Management

```javascript
import storageMaintenanceUtils from './lib/storageMaintenanceUtils.js';

// Check user quota
const quotaStatus = await storageMaintenanceUtils.enforceUserQuota('user456', {
    autoCleanup: true
});

// Get storage statistics
const stats = await zipLifecycleManager.getStorageStats('user456');

// Run system maintenance
const maintenance = await storageMaintenanceUtils.performSystemMaintenance({
    dryRun: false,
    cleanupExpired: true,
    cleanupOldVersions: true
});
```

## API Endpoints

### Project Zip Management

**GET** `/api/projects/[id]/zip?action=info&version=current`
- Get zip file information

**GET** `/api/projects/[id]/zip?action=download&version=current`  
- Download zip file (redirects to Cloudinary URL)

**GET** `/api/projects/[id]/zip?action=versions`
- List all versions for a project

**POST** `/api/projects/[id]/zip`
- Upload new zip file with metadata
- Form data: `zipFile`, `fileName`, `versionNote`, `metadata`, `sourceFiles`

**PUT** `/api/projects/[id]/zip`
- Restore version: `{ "action": "restore", "versionNumber": 2 }`
- Update metadata: `{ "action": "updateMetadata", "metadata": {...} }`

**DELETE** `/api/projects/[id]/zip?version=current`
- Delete current version, specific version, or all versions

### Admin Storage Management  

**GET** `/api/admin/storage?action=stats&userId=user123`
- Get storage statistics

**GET** `/api/admin/storage?action=health`
- Get system health report

**POST** `/api/admin/storage`
- Run maintenance operations
```json
{
  "action": "cleanup",
  "dryRun": false,
  "userId": "user123",
  "options": {
    "cleanupExpired": true,
    "maxAge": 30
  }
}
```

**DELETE** `/api/admin/storage?action=emergencyCleanup&confirm=true`
- Emergency system cleanup

## Project Model Schema

### Generated Files Structure

```javascript
generatedFiles: {
    // Current version
    zipFile: {
        cloudinaryUrl: String,
        cloudinaryPublicId: String, 
        fileName: String,
        fileSize: Number,
        generatedAt: Date,
        downloadCount: Number,
        lastDownloadedAt: Date,
        expiresAt: Date // 1 year from creation
    },
    
    // Version history (up to 10 versions)
    versions: [{
        cloudinaryUrl: String,
        cloudinaryPublicId: String,
        fileName: String, 
        fileSize: Number,
        generatedAt: Date,
        downloadCount: Number,
        versionNumber: Number,
        versionNote: String,
        archivedAt: Date
    }],
    
    // Individual source files (optional)
    sourceFiles: [{
        fileName: String,
        filePath: String,
        fileType: String,
        cloudinaryUrl: String,
        content: String,
        lastModified: Date
    }],
    
    // Metadata
    metadata: {
        techStack: [String],
        framework: String,
        language: String,
        projectStructure: Object,
        dependencies: Object,
        buildInstructions: String,
        readme: String
    }
}
```

### New Model Methods

- `project.storeGeneratedCode(zipData)` - Store new zip file
- `project.addGeneratedCodeVersion(zipData, note)` - Add versioned zip
- `project.getGeneratedCodeVersions()` - Get all versions
- `project.restoreGeneratedCodeVersion(versionNumber)` - Restore version  
- `project.hasValidGeneratedCode()` - Check if valid zip exists
- `project.getTotalStorageUsed()` - Calculate total storage usage
- `project.getFormattedStorageSize()` - Get human-readable storage size
- `project.cleanupOldVersions(keepCount)` - Remove old versions

## Storage Quotas

### Default Quotas
- **Free users**: 500MB
- **Premium users**: 5GB  
- **Admin users**: 50GB

### Quota Enforcement
- Automatic cleanup when approaching quota (80%+)
- Upload blocking when significantly over quota (120%+)
- Intelligent cleanup prioritization:
  1. Expired cache files
  2. Old project versions
  3. Inactive project files

## Automatic Maintenance

### Scheduled Tasks
- **Daily at 2 AM**: Cleanup expired files and old versions
- **Cache cleanup**: Remove files older than 30 days
- **Version cleanup**: Keep only latest 10 versions per project
- **Quota enforcement**: Clean up over-quota users

### Health Monitoring
- Storage usage tracking
- Expired file detection  
- Data integrity validation
- Performance optimization

## Migration Guide

### Migrating from Cache Storage

```javascript
// Migrate all CodeZip entries to Project model
const migrationResult = await projectPermanentStorage.migrateCodeZipsToProjects();

// Migrate specific user
const userMigration = await projectPermanentStorage.migrateCodeZipsToProjects('user123');
```

### Integration Steps

1. **Update existing endpoints** to use `zipLifecycleManager.storeZip()`
2. **Replace direct Cloudinary calls** with the lifecycle manager
3. **Add quota checks** before file uploads
4. **Implement version management** in UI components
5. **Set up admin monitoring** dashboard

## Configuration

### Environment Variables (existing)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret
```

### Customization Options

```javascript
// Customize quota limits
storageMaintenanceUtils.defaultQuotaLimits = {
    freeUser: 1024 * 1024 * 1024, // 1GB
    premiumUser: 10 * 1024 * 1024 * 1024, // 10GB
    adminUser: 100 * 1024 * 1024 * 1024 // 100GB
};

// Customize retention policies
storageMaintenanceUtils.retentionPolicies = {
    cache: 60, // days
    permanent: 730, // 2 years
    versions: 15 // max versions
};
```

## Benefits

### For Users
- **Permanent storage**: Never lose generated code
- **Version history**: Restore any previous version
- **Better organization**: Files linked to projects
- **Faster access**: Direct Cloudinary URLs

### For System
- **Better performance**: Intelligent caching and storage
- **Cost optimization**: Automated cleanup reduces storage costs
- **Scalability**: Quota management prevents abuse
- **Reliability**: Data integrity checks and health monitoring

### For Developers
- **Simple API**: Unified interface for all storage operations
- **Automatic maintenance**: Scheduled cleanup and optimization
- **Comprehensive logging**: Detailed operation tracking
- **Admin tools**: Complete system management capabilities

## Monitoring and Maintenance

### Health Checks
```javascript
const health = await storageMaintenanceUtils.getStorageHealthReport();
// Returns: overall health, issues, recommendations, next maintenance date
```

### Storage Statistics
```javascript  
const stats = await zipLifecycleManager.getStorageStats();
// Returns: permanent vs cache breakdown, user stats, total usage
```

### Manual Maintenance
```javascript
// Run comprehensive cleanup
const cleanup = await zipLifecycleManager.runCleanup({
    cleanupExpired: true,
    cleanupOldVersions: true,
    cleanupCache: true,
    dryRun: false
});
```

## Troubleshooting

### Common Issues

1. **Quota exceeded**: Use `storageMaintenanceUtils.enforceUserQuota()` to clean up
2. **Missing files**: Check expiration dates and run data integrity validation
3. **Slow performance**: Run storage optimization maintenance
4. **Version conflicts**: Use version restoration to recover

### Debug Commands

```javascript
// Check specific project storage
const projectStats = await zipLifecycleManager.getStorageStats(null, 'project123');

// Validate data integrity
const integrity = await storageMaintenanceUtils.performSystemMaintenance({
    validateIntegrity: true,
    dryRun: true
});

// Force cleanup specific user
await storageMaintenanceUtils.enforceUserQuota('user123', {
    autoCleanup: true,
    dryRun: false
});
```

This comprehensive permanent storage system ensures your generated code is safely stored, efficiently managed, and easily accessible while maintaining optimal system performance and cost-effectiveness.