// models/activity.js
import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
    // Core identification
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    
    // Activity details
    activityType: {
        type: String,
        required: true,
        enum: [
            // Project activities
            'project_created',
            'project_opened',
            'project_configured',
            
            // Dataset activities
            'dataset_uploaded',
            'dataset_processed',
            'dataset_preview_generated',
            'dataset_validated',
            
            // Model activities
            'model_training_started',
            'model_training_progress',
            'model_training_completed',
            'model_training_failed',
            'model_evaluation_completed',
            'model_parameters_changed',
            
            // Visualization activities
            'visualization_generated',
            'visualization_viewed',
            'visualization_exported',
            
            // Deployment activities
            'model_deployed',
            'deployment_tested',
            'deployment_updated',
            
            // General workspace activities
            'workspace_entered',
            'workspace_exited',
            'configuration_changed',
            'result_downloaded',
            'project_shared'
        ],
        index: true
    },
    
    // Activity data
    data: {
        // For dataset activities
        datasetInfo: {
            fileName: String,
            fileSize: Number,
            fileType: String,
            rows: Number,
            columns: Number,
            processingTime: Number
        },
        
        // For model training activities
        modelInfo: {
            taskType: String,
            modelType: String,
            parameters: mongoose.Schema.Types.Mixed,
            trainingProgress: Number,
            accuracy: Number,
            loss: Number,
            duration: Number,
            status: String
        },
        
        // For configuration changes
        configuration: {
            oldValues: mongoose.Schema.Types.Mixed,
            newValues: mongoose.Schema.Types.Mixed,
            changeType: String
        },
        
        // For visualization activities
        visualization: {
            type: String,
            title: String,
            generationTime: Number,
            exported: Boolean
        },
        
        // For deployment activities
        deployment: {
            platform: String,
            url: String,
            status: String,
            resourcesUsed: mongoose.Schema.Types.Mixed
        },
        
        // Additional metadata
        metadata: mongoose.Schema.Types.Mixed
    },
    
    // Timing and context
    startTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number // Duration in milliseconds
    },
    
    // Status and result
    status: {
        type: String,
        enum: ['started', 'in_progress', 'completed', 'failed', 'cancelled'],
        default: 'started',
        index: true
    },
    result: {
        success: Boolean,
        message: String,
        data: mongoose.Schema.Types.Mixed,
        error: String
    },
    
    // Context information
    context: {
        userAgent: String,
        ipAddress: String,
        platform: String,
        screenResolution: String,
        timezone: String
    },
    
    // Sync information
    syncStatus: {
        type: String,
        enum: ['pending', 'synced', 'failed'],
        default: 'pending',
        index: true
    },
    lastSynced: {
        type: Date
    },
    syncAttempts: {
        type: Number,
        default: 0
    },
    
    // Performance metrics
    performance: {
        memoryUsage: Number,
        cpuUsage: Number,
        networkLatency: Number,
        renderTime: Number
    }
}, {
    timestamps: true,
    collection: 'activities'
});

// Indexes for better performance
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ projectId: 1, createdAt: -1 });
ActivitySchema.index({ sessionId: 1, createdAt: -1 });
ActivitySchema.index({ activityType: 1, createdAt: -1 });
ActivitySchema.index({ status: 1, createdAt: -1 });
ActivitySchema.index({ syncStatus: 1, updatedAt: -1 });

// Compound indexes for common queries
ActivitySchema.index({ userId: 1, activityType: 1, createdAt: -1 });
ActivitySchema.index({ projectId: 1, activityType: 1, createdAt: -1 });
ActivitySchema.index({ sessionId: 1, status: 1 });

// Instance methods
ActivitySchema.methods.markCompleted = function(result = null) {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
    if (result) {
        this.result = result;
    }
    return this.save();
};

ActivitySchema.methods.markFailed = function(error) {
    this.status = 'failed';
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
    this.result = {
        success: false,
        error: error.message || error,
        data: null
    };
    return this.save();
};

ActivitySchema.methods.updateProgress = function(progress, additionalData = {}) {
    this.status = 'in_progress';
    this.data = { ...this.data, ...additionalData };
    if (this.data.modelInfo) {
        this.data.modelInfo.trainingProgress = progress;
    }
    return this.save();
};

ActivitySchema.methods.markSynced = function() {
    this.syncStatus = 'synced';
    this.lastSynced = new Date();
    return this.save();
};

// Static methods
ActivitySchema.statics.createActivity = function(activityData) {
    return new this({
        ...activityData,
        sessionId: activityData.sessionId || this.generateSessionId(),
        startTime: new Date()
    }).save();
};

ActivitySchema.statics.generateSessionId = function() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

ActivitySchema.statics.getActivityStats = function(userId, timeRange = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);
    
    return this.aggregate([
        {
            $match: {
                userId: mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$activityType',
                count: { $sum: 1 },
                avgDuration: { $avg: '$duration' },
                successRate: {
                    $avg: { 
                        $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] 
                    }
                }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

ActivitySchema.statics.getProjectActivityTimeline = function(projectId, limit = 50) {
    return this.find({
        projectId: mongoose.Types.ObjectId(projectId)
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .lean();
};

ActivitySchema.statics.getUnsynced = function(limit = 100) {
    return this.find({
        syncStatus: { $ne: 'synced' }
    })
    .sort({ createdAt: 1 })
    .limit(limit);
};

// Pre-save middleware
ActivitySchema.pre('save', function(next) {
    if (this.endTime && this.startTime && !this.duration) {
        this.duration = this.endTime - this.startTime;
    }
    next();
});

// Virtual for human-readable duration
ActivitySchema.virtual('readableDuration').get(function() {
    if (!this.duration) return null;
    
    const seconds = Math.floor(this.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
});

// Ensure virtual fields are serialized
ActivitySchema.set('toJSON', { virtuals: true });
ActivitySchema.set('toObject', { virtuals: true });

const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);

export default Activity;