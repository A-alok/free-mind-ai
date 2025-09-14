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
            'image_classification',
            'object_detection', 
            'text_classification',
            'sentiment_analysis',
            'regression',
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