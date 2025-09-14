// lib/fileUtils.js
import multer from 'multer';
import { Buffer } from 'buffer';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and common dataset file types
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json',
            'text/plain',
            'application/zip'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Convert buffer to base64 string
export function bufferToBase64(buffer) {
    return buffer.toString('base64');
}

// Convert base64 string to buffer
export function base64ToBuffer(base64String) {
    return Buffer.from(base64String, 'base64');
}

// Process CSV file and extract metadata
export async function processCsvFile(buffer) {
    try {
        const csvContent = buffer.toString('utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('Empty CSV file');
        }
        
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.length - 1; // Subtract header row
        const columns = headers.length;
        
        // Get preview data (first 5 rows)
        const previewLines = lines.slice(0, Math.min(6, lines.length)); // Header + 5 data rows
        const preview = previewLines.map(line => 
            line.split(',').map(cell => cell.trim())
        );
        
        return {
            rows,
            columns,
            fileType: 'csv',
            headers,
            preview,
            totalSize: buffer.length
        };
    } catch (error) {
        console.error('CSV processing error:', error);
        throw new Error('Failed to process CSV file');
    }
}

// Process JSON file and extract metadata
export async function processJsonFile(buffer) {
    try {
        const jsonContent = buffer.toString('utf8');
        const data = JSON.parse(jsonContent);
        
        let rows = 0;
        let columns = 0;
        let preview = null;
        
        if (Array.isArray(data)) {
            rows = data.length;
            if (data.length > 0 && typeof data[0] === 'object') {
                columns = Object.keys(data[0]).length;
                preview = data.slice(0, 5); // First 5 items
            }
        } else if (typeof data === 'object') {
            rows = 1;
            columns = Object.keys(data).length;
            preview = [data];
        }
        
        return {
            rows,
            columns,
            fileType: 'json',
            preview,
            totalSize: buffer.length
        };
    } catch (error) {
        console.error('JSON processing error:', error);
        throw new Error('Failed to process JSON file');
    }
}

// Validate image file
export function validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('Invalid image type. Only JPEG, PNG, JPG, and WebP are allowed.');
    }
    
    if (file.size > maxSize) {
        throw new Error('Image too large. Maximum size is 10MB.');
    }
    
    return true;
}

// Validate dataset file
export function validateDatasetFile(file) {
    const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'text/plain',
        'application/zip'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('Invalid dataset file type. Only CSV, Excel, JSON, TXT, and ZIP files are allowed.');
    }
    
    if (file.size > maxSize) {
        throw new Error('Dataset file too large. Maximum size is 50MB.');
    }
    
    return true;
}

// Generate unique filename
export function generateUniqueFileName(originalName, userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${userId}_${timestamp}_${random}.${extension}`;
}

// Extract file extension
export function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

// Get file size in human readable format
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Process uploaded dataset file
export async function processDatasetFile(file) {
    try {
        const extension = getFileExtension(file.originalname);
        let metadata = {
            rows: 0,
            columns: 0,
            fileType: extension,
            preview: null
        };
        
        switch (extension) {
            case 'csv':
                metadata = await processCsvFile(file.buffer);
                break;
            case 'json':
                metadata = await processJsonFile(file.buffer);
                break;
            case 'txt':
                const lines = file.buffer.toString('utf8').split('\n').filter(line => line.trim());
                metadata = {
                    rows: lines.length,
                    columns: 1,
                    fileType: 'txt',
                    preview: lines.slice(0, 10) // First 10 lines
                };
                break;
            case 'zip':
                metadata = {
                    rows: 'N/A',
                    columns: 'N/A', 
                    fileType: 'zip',
                    preview: 'ZIP archive - contains multiple files'
                };
                break;
            default:
                metadata = {
                    rows: 'Unknown',
                    columns: 'Unknown',
                    fileType: extension,
                    preview: 'Binary file'
                };
        }
        
        return metadata;
    } catch (error) {
        console.error('Dataset processing error:', error);
        throw error;
    }
}

export { upload };