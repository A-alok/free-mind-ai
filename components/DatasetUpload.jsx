// components/DatasetUpload.jsx
"use client";

import { useState, useRef, useCallback } from 'react';
import { 
    Upload, 
    FileText, 
    CheckCircle, 
    AlertCircle, 
    X, 
    Eye, 
    Download,
    Trash2,
    Database,
    Clock,
    BarChart3
} from 'lucide-react';
import { useActivityTracker } from '@/lib/hooks/useActivityTracker';

export default function DatasetUpload({ 
    projectId, 
    onDatasetUploaded, 
    onError,
    currentDataset = null,
    isLoading: parentLoading = false
}) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    
    const fileInputRef = useRef(null);
    const { trackDatasetUpload, completeActivity, failActivity, sessionId } = useActivityTracker(projectId);

    // Handle drag events
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    // Handle drop event
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, []);

    // Handle file selection
    const handleFileSelect = (file) => {
        setUploadError('');
        
        // Validate file type
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json',
            'text/plain',
            'application/zip'
        ];

        if (!allowedTypes.includes(file.type)) {
            setUploadError('Please upload a valid dataset file (CSV, Excel, JSON, TXT, or ZIP)');
            return;
        }

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            setUploadError('File size must be less than 50MB');
            return;
        }

        setSelectedFile(file);
    };

    // Handle file input change
    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    // Upload dataset
    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadProgress(0);
        setUploadError('');

        // Track upload activity
        const activityId = await trackDatasetUpload({
            datasetInfo: {
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type
            }
        });

        try {
            const formData = new FormData();
            formData.append('dataset', selectedFile);
            formData.append('sessionId', sessionId);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + Math.random() * 10;
                });
            }, 500);

            const response = await fetch(`/api/projects/${projectId}/dataset`, {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const result = await response.json();

            if (result.success) {
                // Complete activity
                if (activityId) {
                    await completeActivity(activityId, {
                        success: true,
                        message: 'Dataset uploaded successfully',
                        data: result.dataset
                    });
                }

                // Reset form
                setSelectedFile(null);
                setUploadProgress(0);
                setUploading(false);

                // Notify parent component
                if (onDatasetUploaded) {
                    onDatasetUploaded(result.dataset, result.project);
                }
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Dataset upload error:', error);
            
            // Mark activity as failed
            if (activityId) {
                await failActivity(activityId, error);
            }

            setUploadError(error.message || 'Failed to upload dataset');
            setUploadProgress(0);
            setUploading(false);

            if (onError) {
                onError(error.message || 'Failed to upload dataset');
            }
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Delete current dataset
    const handleDeleteDataset = async (datasetId) => {
        try {
            const response = await fetch(`/api/projects/${projectId}/dataset?datasetId=${datasetId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                if (onDatasetUploaded) {
                    onDatasetUploaded(null);
                }
            } else {
                setUploadError(result.error || 'Failed to delete dataset');
            }
        } catch (error) {
            setUploadError('Failed to delete dataset');
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Dataset Display */}
            {currentDataset && (
                <div className="bg-black/40 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <Database className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Active Dataset</h3>
                                <p className="text-green-400 text-sm">Ready for training</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 transition-colors"
                                title="Preview Dataset"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDeleteDataset(currentDataset.id)}
                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                                title="Delete Dataset"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400 block">File Name</span>
                            <span className="text-white font-medium">{currentDataset.originalName}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">File Size</span>
                            <span className="text-white font-medium">{currentDataset.size}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Rows</span>
                            <span className="text-white font-medium">{currentDataset.rows || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Columns</span>
                            <span className="text-white font-medium">{currentDataset.columns || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Dataset Preview */}
                    {showPreview && currentDataset.preview && (
                        <div className="mt-4 pt-4 border-t border-green-500/20">
                            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Data Preview
                            </h4>
                            <div className="bg-black/60 rounded-lg p-4 max-h-64 overflow-auto">
                                <pre className="text-xs text-gray-300">
                                    {JSON.stringify(currentDataset.preview, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Upload New Dataset */}
            <div className="bg-black/40 border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-400" />
                    {currentDataset ? 'Upload New Dataset' : 'Upload Dataset'}
                </h3>

                {/* File Selection Area */}
                <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                        dragActive 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : selectedFile
                                ? 'border-green-500/50 bg-green-500/5'
                                : 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5'
                    } ${uploading ? 'pointer-events-none' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
                                <Upload className="w-8 h-8 text-purple-400 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-white font-medium">Uploading Dataset...</p>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-400">{Math.round(uploadProgress)}% complete</p>
                            </div>
                        </div>
                    ) : selectedFile ? (
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium mb-1">{selectedFile.name}</p>
                                <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                    }}
                                    className="px-4 py-2 bg-gray-600/30 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpload();
                                    }}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105 text-sm font-medium"
                                >
                                    Upload Dataset
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
                                <FileText className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium mb-2">
                                    Drop dataset here or click to browse
                                </p>
                                <p className="text-sm text-gray-400 mb-1">
                                    CSV, Excel, JSON, TXT, or ZIP files up to 50MB
                                </p>
                                {currentDataset && (
                                    <p className="text-xs text-yellow-400">
                                        Uploading a new dataset will replace the current one
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.json,.txt,.zip"
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={uploading}
                    />
                </div>

                {/* Error Display */}
                {uploadError && (
                    <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 font-medium mb-1">Upload Error</p>
                            <p className="text-red-300 text-sm">{uploadError}</p>
                        </div>
                        <button
                            onClick={() => setUploadError('')}
                            className="ml-auto text-red-400 hover:text-red-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Upload Guidelines */}
                <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <h4 className="text-sm font-semibold text-purple-300 mb-2">Upload Guidelines</h4>
                    <ul className="text-xs text-purple-200 space-y-1">
                        <li>• CSV files should have headers in the first row</li>
                        <li>• Excel files will use the first sheet</li>
                        <li>• JSON files should contain structured data</li>
                        <li>• ZIP files should contain organized folders for image classification</li>
                        <li>• Maximum file size: 50MB</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}