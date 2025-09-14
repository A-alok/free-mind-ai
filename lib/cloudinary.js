// lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
export async function uploadToCloudinary(file, folder = 'freemind-projects') {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: folder,
            resource_type: 'auto',
            transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        });
        
        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Image upload failed');
    }
}

// Upload dataset file to Cloudinary
export async function uploadDatasetToCloudinary(file, folder = 'freemind-datasets') {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: folder,
            resource_type: 'raw', // For non-image files
            use_filename: true,
            unique_filename: true
        });
        
        return {
            url: result.secure_url,
            publicId: result.public_id,
            originalFilename: result.original_filename,
            format: result.format,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('Cloudinary dataset upload error:', error);
        throw new Error('Dataset upload failed');
    }
}

// Delete image from Cloudinary
export async function deleteFromCloudinary(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Image deletion failed');
    }
}

// Delete dataset from Cloudinary
export async function deleteDatasetFromCloudinary(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'raw'
        });
        return result;
    } catch (error) {
        console.error('Cloudinary dataset delete error:', error);
        throw new Error('Dataset deletion failed');
    }
}

// Get optimized image URL
export function getOptimizedImageUrl(publicId, options = {}) {
    const {
        width = 400,
        height = 300,
        crop = 'fill',
        quality = 'auto',
        format = 'auto'
    } = options;
    
    return cloudinary.url(publicId, {
        width,
        height,
        crop,
        quality,
        fetch_format: format
    });
}

export default cloudinary;