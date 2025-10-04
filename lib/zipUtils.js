// lib/zipUtils.js
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

/**
 * Create a zip file from a directory containing generated code
 * @param {string} sourceDir - Path to the directory containing generated code
 * @param {string} outputPath - Path where the zip file should be created
 * @param {string} projectName - Name of the project (used for the zip file name)
 * @returns {Promise<{zipPath: string, size: number}>}
 */
export async function createZipFromDirectory(sourceDir, outputPath, projectName) {
    return new Promise((resolve, reject) => {
        // Create a file to stream archive data to
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression level
        });

        // Listen for all archive data to be written
        output.on('close', async () => {
            try {
                const stats = await fsPromises.stat(outputPath);
                console.log(`📦 Zip file created: ${outputPath} (${stats.size} bytes)`);
                resolve({
                    zipPath: outputPath,
                    size: stats.size
                });
            } catch (error) {
                reject(error);
            }
        });

        // Handle warnings (like stat failures and other non-blocking errors)
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Zip warning:', err.message);
            } else {
                reject(err);
            }
        });

        // Handle errors
        archive.on('error', (err) => {
            reject(err);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Add files from the source directory
        archive.directory(sourceDir, projectName);

        // Finalize the archive (this is the trigger for the 'close' event)
        archive.finalize();
    });
}

/**
 * Create a zip file from an object containing file contents
 * @param {Object} fileContents - Object where keys are file paths and values are file contents
 * @param {string} outputPath - Path where the zip file should be created
 * @param {string} projectName - Name of the project (used as root folder in zip)
 * @returns {Promise<{zipPath: string, size: number}>}
 */
export async function createZipFromFileContents(fileContents, outputPath, projectName) {
    return new Promise((resolve, reject) => {
        // Create a file to stream archive data to
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression level
        });

        // Listen for all archive data to be written
        output.on('close', async () => {
            try {
                const stats = await fsPromises.stat(outputPath);
                console.log(`📦 Zip file created: ${outputPath} (${stats.size} bytes)`);
                resolve({
                    zipPath: outputPath,
                    size: stats.size
                });
            } catch (error) {
                reject(error);
            }
        });

        // Handle warnings
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Zip warning:', err.message);
            } else {
                reject(err);
            }
        });

        // Handle errors
        archive.on('error', (err) => {
            reject(err);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Add files to the zip
        Object.entries(fileContents).forEach(([filePath, content]) => {
            const fullPath = path.join(projectName, filePath);
            archive.append(content, { name: fullPath });
        });

        // Finalize the archive
        archive.finalize();
    });
}

/**
 * Create a zip file buffer from file contents (for direct upload)
 * @param {Object} fileContents - Object where keys are file paths and values are file contents
 * @param {string} projectName - Name of the project (used as root folder in zip)
 * @returns {Promise<Buffer>}
 */
export async function createZipBuffer(fileContents, projectName) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression level
        });

        // Collect chunks
        archive.on('data', (chunk) => {
            chunks.push(chunk);
        });

        // When archive is complete, combine chunks into buffer
        archive.on('end', () => {
            const buffer = Buffer.concat(chunks);
            console.log(`📦 Zip buffer created (${buffer.length} bytes)`);
            resolve(buffer);
        });

        // Handle warnings
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Zip warning:', err.message);
            } else {
                reject(err);
            }
        });

        // Handle errors
        archive.on('error', (err) => {
            reject(err);
        });

        // Add files to the zip
        Object.entries(fileContents).forEach(([filePath, content]) => {
            const fullPath = path.join(projectName, filePath);
            archive.append(content, { name: fullPath });
        });

        // Finalize the archive
        archive.finalize();
    });
}

/**
 * Generate a unique zip file name
 * @param {string} projectName - Base project name
 * @param {string} userId - User ID (optional)
 * @returns {string}
 */
export function generateZipFileName(projectName, userId = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userPrefix = userId ? `${userId}_` : '';
    const cleanProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${userPrefix}${cleanProjectName}_${timestamp}.zip`;
}

/**
 * Clean up temporary zip files
 * @param {string} zipPath - Path to the zip file to delete
 */
export async function cleanupZipFile(zipPath) {
    try {
        await fsPromises.unlink(zipPath);
        console.log(`🗑️ Cleaned up temporary zip file: ${zipPath}`);
    } catch (error) {
        console.error('Error cleaning up zip file:', error.message);
    }
}

/**
 * Ensure temp directory exists
 * @param {string} tempDir - Path to temp directory
 */
export async function ensureTempDir(tempDir) {
    try {
        await fsPromises.access(tempDir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fsPromises.mkdir(tempDir, { recursive: true });
            console.log(`📁 Created temp directory: ${tempDir}`);
        } else {
            throw error;
        }
    }
}