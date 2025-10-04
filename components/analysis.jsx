'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Database, AlertCircle, Brain, BarChart3, TrendingUp, Loader2, ArrowLeft, Home } from "lucide-react";
import Link from 'next/link';

// Update API base URL to match backend port
const API_BASE_URL = 'http://localhost:5000';

export default function CsvAnalysis() {
  // State management
  const [availableFiles, setAvailableFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [backendConnected, setBackendConnected] = useState(null);

  // Test backend connection on component mount
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        // Try multiple endpoints to test connection
        let connected = false;
        
        // First try the health endpoint
        try {
          const healthResponse = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
          });
          if (healthResponse.ok) {
            connected = true;
          }
        } catch (healthErr) {
          console.log('Health endpoint not available, trying upload endpoint...');
          
          // If health fails, try a simple HEAD request to upload endpoint
          try {
            const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
              method: 'HEAD',
            });
            // Even if it returns an error, if we get a response it means server is running
            connected = true;
          } catch (uploadErr) {
            console.log('Upload endpoint also not responding');
            connected = false;
          }
        }
        
        setBackendConnected(connected);
      } catch (err) {
        setBackendConnected(false);
        console.error('Backend connection test failed:', err);
      }
    };
    
    testBackendConnection();
  }, []);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting to upload files:', uploadedFiles.map(f => f.name));
      console.log('API URL:', `${API_BASE_URL}/upload`);
      
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Failed to upload files: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Upload response:', data);
      
      if (data.success) {
        // Update available files
        setAvailableFiles(data.files || []);
        
        // Select the first uploaded file
        if (data.files && data.files.length > 0) {
          const firstFile = data.files[0];
          setSelectedFileName(firstFile.filename);
          setFilePreview({
            columns: firstFile.columns,
            data: firstFile.preview
          });
        }
      } else {
        throw new Error(data.error || 'Unknown error uploading files');
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      let errorMessage = err.message;
      
      // Handle network errors more gracefully
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        errorMessage = 'Unable to connect to the analysis server. Please make sure the backend server is running on port 5000.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (filename) => {
    setSelectedFileName(filename);
    
    // Find the selected file's preview
    const selectedFileInfo = availableFiles.find(file => file.filename === filename);
    if (selectedFileInfo) {
      setFilePreview({
        columns: selectedFileInfo.columns,
        data: selectedFileInfo.preview
      });
    }
    
    // Reset results and error
    setResult(null);
    setError(null);
  };

  // Handle query submission
  const handleQuerySubmit = async (e) => {
    // Prevent form submission default behavior
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!query.trim()) {
      setError('Please enter a valid query');
      return;
    }
    
    if (!selectedFileName) {
      setError('Please select a file');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFileName,
          query: query
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process query');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze data');
      }
      
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12">
          {/* Back Navigation */}
          <div className="flex justify-start mb-6">
            <Link 
              href="/main" 
              className="inline-flex items-center text-gray-600 hover:text-violet-600 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-violet-600 mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                CSV Data <span className="text-violet-600">Analysis</span>
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
              Upload your CSV files and ask questions about your data using natural language.
            </p>
            
            {/* Backend Connection Status */}
            {backendConnected !== null && (
              <div className="flex items-center justify-center">
                <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  backendConnected 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    backendConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                      {backendConnected 
                    ? 'Analysis server connected on port 5000' 
                    : (
                        <span>
                          Analysis server offline - 
                          <span className="font-semibold"> Run: python analysis.py (port 5000)</span>
                        </span>
                      )
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Backend Offline Warning */}
        {backendConnected === false && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-900 mb-1">Backend Server Required</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  The analysis functionality requires a Python backend server. Please run the following command in your terminal:
                </p>
                <div className="bg-gray-800 text-green-400 p-2 rounded text-sm font-mono">
                  python analysis.py
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  Make sure you have installed the required dependencies: flask, pandas, google-generativeai, flask-cors
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center mb-6">
                <Upload className="w-6 h-6 text-violet-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Upload Data</h2>
              </div>
              
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV Files
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={loading}
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-violet-400 transition-colors duration-200 bg-gray-50 hover:bg-gray-100">
                    {loading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-2" />
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload CSV files</p>
                        <p className="text-xs text-gray-500 mt-1">Support for multiple files</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Available Files */}
              {availableFiles.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Datasets ({availableFiles.length})
                  </label>
                  <select
                    value={selectedFileName}
                    onChange={(e) => handleFileSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent"
                  >
                    <option value="">Select a dataset</option>
                    {availableFiles.map((file, index) => (
                      <option key={index} value={file.filename}>
                        {file.filename}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Tips */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                <h3 className="font-medium text-violet-900 mb-2 text-sm">💡 Query Tips</h3>
                <ul className="text-xs space-y-1 text-violet-700">
                  <li>• "What's the average of [column]?"</li>
                  <li>• "Show correlation between columns"</li>
                  <li>• "Find outliers in the data"</li>
                  <li>• "Summarize the dataset"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Selected File Indicator */}
              {selectedFileName && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-violet-600 rounded-full mr-3"></div>
                    <p className="text-sm text-violet-900">
                      Working with: <span className="font-medium">{selectedFileName}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {/* CSV Preview */}
              {filePreview && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {filePreview.columns && filePreview.columns.map((col, i) => (
                            <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filePreview.data && Array.isArray(filePreview.data) && filePreview.data.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            {filePreview.columns && filePreview.columns.map((col, cellIndex) => (
                              <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row[col] !== undefined ? String(row[col]) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filePreview.data && filePreview.data.length > 5 && (
                      <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center">
                        Showing first 5 rows of {filePreview.data.length} total rows
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Query Section */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <Database className="w-5 h-5 text-violet-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Ask About Your Data</h3>
                </div>
                
                <form onSubmit={handleQuerySubmit} className="space-y-4">
                  <div>
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="What would you like to know about your data? Ask in plain English..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent resize-none"
                      rows={4}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !selectedFileName || !query.trim()}
                      className="inline-flex items-center px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analyze Data
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Results */}
              {result && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                  <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="text-lg font-semibold text-green-900">Analysis Results</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border">
                        {result}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden">
                  <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <h3 className="text-lg font-semibold text-red-900">Error</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}