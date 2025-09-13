// models/user.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: ['user'],
        default: 'user'
    },
    profilePicture: {
        type: String,
        trim: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true // This adds createdAt and updatedAt automatically
});

// Email index is defined in schema field options above

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash password if it's modified or new
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with salt rounds of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;