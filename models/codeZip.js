// models/codeZip.js
import mongoose from 'mongoose';

const codeZipSchema = new mongoose.Schema({
    // Project information
    projectName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    projectDescription: {
        type: String,
        trim: true,
        maxlength: 500
    },
    
    // User information
    userId: {
        type: String,
        required: false, // Can be null for anonymous users
        trim: true
    },
    userEmail: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    
    // Zip file information
    zipFileName: {
        type: String,
        required: true,
        trim: true
    },
    zipSize: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Cloudinary information
    cloudinaryUrl: {
        type: String,
        required: true,
        trim: true
    },
    cloudinaryPublicId: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    cloudinaryFolder: {
        type: String,
        required: true,
        trim: true
    },
    cloudinaryCreatedAt: {
        type: Date,
        required: true
    },
    
    // Generated code metadata
    generatedFiles: [{
        fileName: {
            type: String,
            required: true,
            trim: true
        },
        fileType: {
            type: String,
            required: true,
            trim: true
        },
        filePath: {
            type: String,
            required: true,
            trim: true
        }
    }],
    
    // Technology stack used
    techStack: [{
        type: String,
        trim: true
    }],
    
    // Generation parameters
    generationParameters: {
        model: {
            type: String,
            trim: true
        },
        prompt: {
            type: String,
            maxlength: 2000
        },
        additionalSettings: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    
    // Access and download tracking
    downloadCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastDownloadedAt: {
        type: Date
    },
    
    // Status and lifecycle
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    },
    expiresAt: {
        type: Date,
        // Default expiration: 30 days from creation
        default: function() {
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
    },
    
    // Metadata
    tags: [{
        type: String,
        trim: true
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
codeZipSchema.index({ userId: 1, createdAt: -1 });
codeZipSchema.index({ cloudinaryPublicId: 1 }, { unique: true });
codeZipSchema.index({ projectName: 1, createdAt: -1 });
codeZipSchema.index({ status: 1, expiresAt: 1 });
codeZipSchema.index({ createdAt: -1 });

// Virtual for formatted file size
codeZipSchema.virtual('zipSizeFormatted').get(function() {
    const bytes = this.zipSize;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for time until expiration
codeZipSchema.virtual('expiresIn').get(function() {
    if (!this.expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(this.expiresAt);
    const diffTime = expiry - now;
    
    if (diffTime <= 0) return 'Expired';
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return '1 day';
    if (diffDays < 30) return `${diffDays} days`;
    
    const diffMonths = Math.ceil(diffDays / 30);
    if (diffMonths === 1) return '1 month';
    return `${diffMonths} months`;
});

// Pre-save middleware to update updatedAt
codeZipSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
    }
    next();
});

// Method to increment download count
codeZipSchema.methods.incrementDownloadCount = async function() {
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
    return this.save();
};

// Method to check if zip is expired
codeZipSchema.methods.isExpired = function() {
    return this.expiresAt && new Date() > new Date(this.expiresAt);
};

// Method to extend expiration
codeZipSchema.methods.extendExpiration = function(days = 30) {
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.save();
};

// Static method to find by user
codeZipSchema.statics.findByUser = function(userId, options = {}) {
    const { limit = 20, skip = 0, status = 'active' } = options;
    
    return this.find({ 
        userId, 
        status,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to find public zips
codeZipSchema.statics.findPublic = function(options = {}) {
    const { limit = 20, skip = 0, status = 'active' } = options;
    
    return this.find({ 
        isPublic: true,
        status,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to clean up expired zips
codeZipSchema.statics.cleanupExpired = function() {
    return this.updateMany(
        {
            expiresAt: { $lt: new Date() },
            status: { $ne: 'deleted' }
        },
        {
            $set: { status: 'deleted' }
        }
    );
};

const CodeZip = mongoose.models.CodeZip || mongoose.model('CodeZip', codeZipSchema);

export default CodeZip;