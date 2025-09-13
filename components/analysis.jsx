'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, Database, AlertCircle } from "lucide-react";

// Update API base URL to match backend port
const API_BASE_URL = 'http://localhost:5002';

// Stars effect component (reused from the FreeMindAi chatbot)
function StarsEffect() {
  const [stars, setStars] = useState([]);
  
  useEffect(() => {
    // Generate stars only on the client side
    const newStars = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      width: Math.random() * 3 + 1,
      height: Math.random() * 3 + 1,
      top: Math.random() * 100,
      left: Math.random() * 100,
      glow: Math.random() * 10 + 5,
      duration: Math.random() * 5 + 3
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {stars.map((star) => (
        <div 
          key={star.id}
          className="absolute rounded-full bg-white" 
          style={{
            width: `${star.width}px`,
            height: `${star.height}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            boxShadow: `0 0 ${star.glow}px rgba(255,255,255,0.8)`,
            animation: `twinkle ${star.duration}s infinite ease-in-out`
          }}
        />
      ))}
    </div>
  );
}

export default function CsvAnalysis() {
  // State management
  const [availableFiles, setAvailableFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [filePreview, setFilePreview] = useState(null);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload files');
      }
      
      const data = await response.json();
      
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
      setError(err.message);
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
    <div className="flex flex-col min-h-screen bg-black">
      {/* Page Header */}
      <header className="bg-black border-b border-[#3A005A] py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-[#FF5C41] via-[#F39C12] via-[#E67E22] via-[#BB8FCE] to-[#9B59B6] text-transparent bg-clip-text">FreeMindAi CSV Analysis</span>
            </h1>
            <p className="text-gray-400">Your cosmic data analysis companion</p>
            <div className="h-1 w-32 bg-gradient-to-r from-[#A277FF] via-[#E056FD] to-[#6153CC] rounded-full mt-4 mx-auto shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-1/4">
            <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
              <StarsEffect />
                
              {/* Glowing border effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
              </div>
              
              <h2 className="text-xl font-semibold text-[#A277FF] mb-6 relative z-10">Upload CSV Files</h2>
              
              <div className="mb-8 relative z-10">
                <label className="block text-gray-300 mb-2 text-sm">Select CSV files</label>
                <div className="border border-[#3A005A] bg-black/60 rounded-md p-2 hover:border-[#A277FF] transition-colors duration-200 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={handleFileUpload}
                    className="w-full text-gray-300 focus:outline-none opacity-0 absolute inset-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Upload size={18} className="text-[#A277FF]" />
                    <span className="text-gray-300 text-sm">Click to upload CSV files</span>
                  </div>
                </div>
              </div>
              
              {/* Available Files */}
              {availableFiles && availableFiles.length > 0 && (
                <div className="mb-8 relative z-10">
                  <h2 className="text-xl font-semibold text-[#A277FF] mb-4">Available Datasets</h2>
                  <label className="block text-gray-300 mb-2 text-sm">Select dataset</label>
                  <select
                    value={selectedFileName}
                    onChange={(e) => handleFileSelect(e.target.value)}
                    className="w-full p-3 bg-black/60 border border-[#3A005A] rounded-md focus:outline-none focus:border-[#A277FF] text-white text-sm"
                  >
                    <option value="" disabled>Select a dataset</option>
                    {availableFiles.map((file, index) => (
                      <option key={index} value={file.filename}>
                        {file.filename}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Help Section */}
              <div className="mt-8 p-4 border border-[#3A005A] rounded-md relative z-10 bg-black/40">
                <h3 className="font-semibold text-[#A277FF] mb-3 text-sm">Query Tips</h3>
                <ul className="text-xs space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A277FF] mt-1.5"></div>
                    <span>Ask specific questions about your data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A277FF] mt-1.5"></div>
                    <span>Try "Calculate average of [column]"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A277FF] mt-1.5"></div>
                    <span>Ask for correlations between columns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A277FF] mt-1.5"></div>
                    <span>Request data summaries and statistics</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full md:w-3/4 flex flex-col gap-6">
            {/* Selected File Display */}
            {selectedFileName && (
              <div className="bg-black border border-[#3A005A] p-3 rounded-lg shadow-[0_0_15px_rgba(162,119,255,0.1)] relative overflow-hidden">
                <StarsEffect />
                <div className="relative z-10 flex items-center">
                  <div className="w-3 h-3 bg-[#A277FF] rounded-full mr-2 shadow-[0_0_10px_rgba(162,119,255,0.7)]"></div>
                  <p className="text-gray-300">
                    Working with: <span className="text-[#A277FF] font-medium">{selectedFileName}</span>
                  </p>
                </div>
              </div>
            )}
            
            {/* CSV Preview */}
            {filePreview && (
              <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
                <StarsEffect />
                
                {/* Glowing border effect */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
                </div>
                
                <div className="flex items-center mb-4 relative z-10">
                  <FileText className="text-[#A277FF] mr-2" size={20} />
                  <h2 className="text-xl font-semibold text-[#A277FF]">CSV Preview</h2>
                </div>
                
                <div className="overflow-x-auto relative z-10">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-[#3A005A]">
                        {filePreview.columns && filePreview.columns.map((col, i) => (
                          <th key={i} className="py-3 px-4 text-left text-[#E056FD] font-medium text-sm border-r last:border-r-0 border-[#3A005A]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filePreview.data && Array.isArray(filePreview.data) && filePreview.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-[#3A005A]">
                          {filePreview.columns && filePreview.columns.map((col, cellIndex) => (
                            <td key={cellIndex} className="py-2.5 px-4 text-gray-300 text-sm border-r last:border-r-0 border-[#3A005A]">
                              {row[col] !== undefined ? String(row[col]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Query Input */}
            <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
              <StarsEffect />
              
              {/* Glowing border effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
              </div>
              
              <div className="flex items-center mb-4 relative z-10">
                <Database className="text-[#A277FF] mr-2" size={20} />
                <h2 className="text-xl font-semibold text-[#A277FF]">Ask About Your Data</h2>
              </div>
              
              <form onSubmit={handleQuerySubmit} className="relative z-10">
                <div className="mb-4">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter your query about the data..."
                    className="w-full p-4 bg-black/60 border border-[#3A005A] rounded-md focus:outline-none focus:border-[#A277FF] focus:ring-1 focus:ring-[#A277FF] min-h-32 text-white transition-all duration-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !selectedFileName}
                  className={`
                    bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-white rounded-md px-6 py-3 font-medium
                    focus:outline-none focus:ring-2 focus:ring-[#A277FF] focus:ring-offset-2 focus:ring-offset-black
                    shadow-[0_0_15px_rgba(162,119,255,0.5)] transition-all duration-200
                    ${loading || !selectedFileName ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
                  `}
                >
                  {loading ? 'Processing...' : 'Analyze Data'}
                </button>
              </form>
            </div>

            {/* Results */}
            {result && (
              <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
                <StarsEffect />
                
                {/* Glowing border effect */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
                </div>
                
                <h2 className="text-xl font-semibold text-[#A277FF] mb-4 relative z-10">Results</h2>
                <div className="p-4 border border-[#3A005A] rounded-md whitespace-pre-wrap text-gray-300 relative z-10 bg-black/40">
                  {result}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(255,92,65,0.2)] border border-[#FF5C41] p-6 relative overflow-hidden">
                <div className="flex items-center mb-4 relative z-10">
                  <AlertCircle className="text-[#FF5C41] mr-2" size={20} />
                  <h2 className="text-xl font-semibold text-[#FF5C41]">Error</h2>
                </div>
                <div className="text-gray-300 relative z-10">
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-[#3A005A] p-4 text-center">
        <p className="text-[#A277FF]">FreeMindAi CSV Analysis â€¢ Powered by Local LLM</p>
      </footer>
      
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}