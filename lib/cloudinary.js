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

// Upload zip file to Cloudinary
export async function uploadZipToCloudinary(zipBuffer, fileName, userId = null, folder = 'freemind-code-zips') {
    try {
        // Create unique filename with user prefix if provided
        const userPrefix = userId ? `${userId}/` : '';
        const fullFolder = `${folder}/${userPrefix}`;
        
        const result = await cloudinary.uploader.upload(
            `data:application/zip;base64,${zipBuffer.toString('base64')}`,
            {
                folder: fullFolder,
                public_id: fileName.replace('.zip', ''), // Remove .zip extension as Cloudinary adds it
                resource_type: 'raw',
                use_filename: true,
                unique_filename: false,
                overwrite: true,
                tags: ['code-zip', 'generated-project']
            }
        );
        
        return {
            url: result.secure_url,
            publicId: result.public_id,
            originalFilename: result.original_filename,
            format: result.format,
            bytes: result.bytes,
            createdAt: result.created_at,
            folder: fullFolder
        };
    } catch (error) {
        console.error('Cloudinary zip upload error:', error);
        throw new Error(`Zip upload failed: ${error.message}`);
    }
}

// Upload zip file from local path to Cloudinary
export async function uploadZipFileToCloudinary(zipPath, fileName, userId = null, folder = 'freemind-code-zips') {
    try {
        // Create unique filename with user prefix if provided
        const userPrefix = userId ? `${userId}/` : '';
        const fullFolder = `${folder}/${userPrefix}`;
        
        const result = await cloudinary.uploader.upload(zipPath, {
            folder: fullFolder,
            public_id: fileName.replace('.zip', ''), // Remove .zip extension as Cloudinary adds it
            resource_type: 'raw',
            use_filename: true,
            unique_filename: false,
            overwrite: true,
            tags: ['code-zip', 'generated-project']
        });
        
        return {
            url: result.secure_url,
            publicId: result.public_id,
            originalFilename: result.original_filename,
            format: result.format,
            bytes: result.bytes,
            createdAt: result.created_at,
            folder: fullFolder
        };
    } catch (error) {
        console.error('Cloudinary zip file upload error:', error);
        throw new Error(`Zip file upload failed: ${error.message}`);
    }
}

// Delete zip file from Cloudinary
export async function deleteZipFromCloudinary(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'raw'
        });
        return result;
    } catch (error) {
        console.error('Cloudinary zip delete error:', error);
        throw new Error('Zip deletion failed');
    }
}

export default cloudinary;
