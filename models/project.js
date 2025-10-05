// models/project.js
import mongoose from 'mongoose';

const datasetSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    // For storing dataset content in database (Base64 encoded)
    content: {
        type: String, // Base64 encoded file content
        required: false
    },
    // Alternatively, store cloud storage URL
    cloudinaryUrl: {
        type: String,
        required: false
    },
    // Dataset metadata
    metadata: {
        rows: Number,
        columns: Number,
        fileType: String,
        preview: mongoose.Schema.Types.Mixed // Store sample data
    }
});

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    // User who owns this project
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Project thumbnail/image stored in Cloudinary
    thumbnail: {
        type: String, // Cloudinary URL
        trim: true
    },
    // Public ID from Cloudinary for deletion purposes
    thumbnailPublicId: {
        type: String,
        trim: true
    },
    // Project status
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'archived'],
        default: 'draft'
    },
    // ML Project specific fields
    taskType: {
        type: String,
        enum: [
            'classification',        // Add this - it's the main one from frontend
            'regression',
            'nlp',
            'image_classification',
            'object_detection', 
            'text_classification',
            'sentiment_analysis',
            'clustering',
            'time_series'
        ],
        required: false
    },
    // Dataset information
    dataset: datasetSchema,
    
    // Model training results
    modelResults: {
        accuracy: Number,
        loss: Number,
        precision: Number,
        recall: Number,
        f1Score: Number,
        trainingTime: Number,
        modelPath: String, // Path to saved model
        visualizations: [String] // URLs to visualization images
    },
    
    // Generated Code Files Storage
    generatedFiles: {
        // Main zip file containing all generated code
        zipFile: {
            cloudinaryUrl: String, // Permanent Cloudinary URL
            cloudinaryPublicId: String, // For deletion/management
            fileName: String, // Original filename
            fileSize: Number, // Size in bytes
            generatedAt: Date,
            downloadCount: { type: Number, default: 0 },
            lastDownloadedAt: Date,
            expiresAt: Date // Auto-expiration date
        },
        // Individual source files (optional, for preview)
        sourceFiles: [{
            fileName: String,
            filePath: String, // Relative path in project structure
            fileType: String, // js, py, html, css, etc.
            cloudinaryUrl: String, // Individual file URL if needed
            content: String, // File content for preview (optional)
            lastModified: Date
        }],
        // Generated code metadata
        metadata: {
            techStack: [String], // Technologies used
            framework: String, // Main framework
            language: String, // Primary programming language
            projectStructure: mongoose.Schema.Types.Mixed, // Folder structure
            dependencies: mongoose.Schema.Types.Mixed, // Package dependencies
            buildInstructions: String, // How to build/run the project
            readme: String // Generated README content
        }
    },
    
    // Project configuration
    configuration: {
        epochs: Number,
        batchSize: Number,
        learningRate: Number,
        optimizer: String,
        architecture: String,
        hyperparameters: mongoose.Schema.Types.Mixed
    },
    
    // Deployment information
    deployment: {
        isDeployed: {
            type: Boolean,
            default: false
        },
        deploymentUrl: String,
        deploymentDate: Date,
        platform: String // 'render', 'vercel', 'heroku', etc.
    },
    
    // Project tags for organization
    tags: [{
        type: String,
        trim: true
    }],
    
    // Collaboration (for future use)
    collaborators: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['viewer', 'editor', 'admin'],
            default: 'viewer'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Project visibility
    isPublic: {
        type: Boolean,
        default: false
    },
    
    // Analytics
    analytics: {
        views: {
            type: Number,
            default: 0
        },
        lastViewed: Date,
        totalTrainingRuns: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });
projectSchema.index({ tags: 1 });

// Pre-save middleware for data validation
projectSchema.pre('save', function(next) {
    // Ensure dataset has either content or cloudinaryUrl
    if (this.dataset && !this.dataset.content && !this.dataset.cloudinaryUrl) {
        const error = new Error('Dataset must have either content or cloudinaryUrl');
        return next(error);
    }
    next();
});

// Virtual for project age
projectSchema.virtual('age').get(function() {
    return Date.now() - this.createdAt.getTime();
});

// Method to increment views
projectSchema.methods.incrementViews = function() {
    this.analytics.views += 1;
    this.analytics.lastViewed = new Date();
    return this.save();
};

// Method to store generated code zip
projectSchema.methods.storeGeneratedCode = function(zipData) {
    if (!this.generatedFiles) {
        this.generatedFiles = {};
    }
    
    this.generatedFiles.zipFile = {
        cloudinaryUrl: zipData.cloudinaryUrl,
        cloudinaryPublicId: zipData.cloudinaryPublicId,
        fileName: zipData.fileName,
        fileSize: zipData.fileSize,
        generatedAt: new Date(),
        downloadCount: 0,
        expiresAt: zipData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
    
    // Store metadata if provided
    if (zipData.metadata) {
        this.generatedFiles.metadata = zipData.metadata;
    }
    
    // Store source files if provided
    if (zipData.sourceFiles) {
        this.generatedFiles.sourceFiles = zipData.sourceFiles;
    }
    
    return this.save();
};

// Method to increment download count for generated code
projectSchema.methods.incrementDownloadCount = function() {
    if (this.generatedFiles && this.generatedFiles.zipFile) {
        this.generatedFiles.zipFile.downloadCount += 1;
        this.generatedFiles.zipFile.lastDownloadedAt = new Date();
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to check if generated code exists and is not expired
projectSchema.methods.hasValidGeneratedCode = function() {
    if (!this.generatedFiles || !this.generatedFiles.zipFile) {
        return false;
    }
    
    const zipFile = this.generatedFiles.zipFile;
    
    // Check if URL exists
    if (!zipFile.cloudinaryUrl) {
        return false;
    }
    
    // Check if expired
    if (zipFile.expiresAt && new Date() > zipFile.expiresAt) {
        return false;
    }
    
    return true;
};

// Method to get generated code download info
projectSchema.methods.getGeneratedCodeInfo = function() {
    if (!this.hasValidGeneratedCode()) {
        return null;
    }
    
    return {
        downloadUrl: this.generatedFiles.zipFile.cloudinaryUrl,
        fileName: this.generatedFiles.zipFile.fileName,
        fileSize: this.generatedFiles.zipFile.fileSize,
        downloadCount: this.generatedFiles.zipFile.downloadCount,
        generatedAt: this.generatedFiles.zipFile.generatedAt,
        lastDownloadedAt: this.generatedFiles.zipFile.lastDownloadedAt,
        expiresAt: this.generatedFiles.zipFile.expiresAt,
        metadata: this.generatedFiles.metadata
    };
};

// Method to update generated code metadata
projectSchema.methods.updateGeneratedCodeMetadata = function(metadata) {
    if (!this.generatedFiles) {
        this.generatedFiles = { metadata: {} };
    } else if (!this.generatedFiles.metadata) {
        this.generatedFiles.metadata = {};
    }
    
    Object.assign(this.generatedFiles.metadata, metadata);
    return this.save();
};

// Method to add a new version of generated code (for versioning)
projectSchema.methods.addGeneratedCodeVersion = function(zipData, versionNote = null) {
    if (!this.generatedFiles) {
        this.generatedFiles = { versions: [] };
    }
    if (!this.generatedFiles.versions) {
        this.generatedFiles.versions = [];
    }
    
    // Archive current version if exists
    if (this.generatedFiles.zipFile) {
        this.generatedFiles.versions.push({
            ...this.generatedFiles.zipFile,
            archivedAt: new Date(),
            versionNumber: this.generatedFiles.versions.length + 1,
            versionNote: versionNote
        });
    }
    
    // Set new version as current
    this.generatedFiles.zipFile = {
        cloudinaryUrl: zipData.cloudinaryUrl,
        cloudinaryPublicId: zipData.cloudinaryPublicId,
        fileName: zipData.fileName,
        fileSize: zipData.fileSize,
        generatedAt: new Date(),
        downloadCount: 0,
        expiresAt: zipData.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year default
    };
    
    // Store metadata if provided
    if (zipData.metadata) {
        this.generatedFiles.metadata = {
            ...this.generatedFiles.metadata,
            ...zipData.metadata
        };
    }
    
    // Store source files if provided
    if (zipData.sourceFiles) {
        this.generatedFiles.sourceFiles = zipData.sourceFiles;
    }
    
    return this.save();
};

// Method to get all versions of generated code
projectSchema.methods.getGeneratedCodeVersions = function() {
    if (!this.generatedFiles || !this.generatedFiles.versions) {
        return [];
    }
    
    const versions = [...this.generatedFiles.versions];
    
    // Add current version if exists
    if (this.generatedFiles.zipFile) {
        versions.unshift({
            ...this.generatedFiles.zipFile,
            versionNumber: 'current',
            isCurrent: true
        });
    }
    
    return versions.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
};

// Method to restore a specific version
projectSchema.methods.restoreGeneratedCodeVersion = function(versionNumber) {
    if (!this.generatedFiles || !this.generatedFiles.versions) {
        throw new Error('No versions available to restore');
    }
    
    const versionToRestore = this.generatedFiles.versions.find(
        v => v.versionNumber === versionNumber
    );
    
    if (!versionToRestore) {
        throw new Error(`Version ${versionNumber} not found`);
    }
    
    // Archive current version
    if (this.generatedFiles.zipFile) {
        this.generatedFiles.versions.push({
            ...this.generatedFiles.zipFile,
            archivedAt: new Date(),
            versionNumber: this.generatedFiles.versions.length + 1,
            versionNote: 'Auto-archived during restore'
        });
    }
    
    // Restore the selected version
    this.generatedFiles.zipFile = {
        ...versionToRestore,
        restoredAt: new Date(),
        downloadCount: 0
    };
    
    // Remove from versions array
    this.generatedFiles.versions = this.generatedFiles.versions.filter(
        v => v.versionNumber !== versionNumber
    );
    
    return this.save();
};

// Method to clean up old versions (keep only latest N versions)
projectSchema.methods.cleanupOldVersions = function(keepCount = 5) {
    if (!this.generatedFiles || !this.generatedFiles.versions) {
        return Promise.resolve(this);
    }
    
    if (this.generatedFiles.versions.length <= keepCount) {
        return Promise.resolve(this);
    }
    
    // Sort versions by date (newest first) and keep only the latest ones
    this.generatedFiles.versions = this.generatedFiles.versions
        .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
        .slice(0, keepCount);
    
    return this.save();
};

// Method to get total storage used by this project
projectSchema.methods.getTotalStorageUsed = function() {
    let totalSize = 0;
    
    // Current zip file
    if (this.generatedFiles && this.generatedFiles.zipFile) {
        totalSize += this.generatedFiles.zipFile.fileSize || 0;
    }
    
    // Version history
    if (this.generatedFiles && this.generatedFiles.versions) {
        totalSize += this.generatedFiles.versions.reduce((sum, version) => {
            return sum + (version.fileSize || 0);
        }, 0);
    }
    
    // Dataset
    if (this.dataset && this.dataset.size) {
        totalSize += this.dataset.size;
    }
    
    return totalSize;
};

// Method to get formatted storage size
projectSchema.methods.getFormattedStorageSize = function() {
    const bytes = this.getTotalStorageUsed();
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Static method to find user projects
projectSchema.statics.findByUser = function(userId, status = null) {
    const query = { userId };
    if (status) query.status = status;
    return this.find(query).sort({ updatedAt: -1 });
};

// Static method to search projects
projectSchema.statics.searchProjects = function(userId, searchTerm) {
    return this.find({
        userId,
        $text: { $search: searchTerm }
    }).sort({ score: { $meta: 'textScore' } });
};

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;