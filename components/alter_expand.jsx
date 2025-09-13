"use client"
import { AlertCircle, Database, FileText, Upload } from "lucide-react";
import { useEffect, useState } from 'react';

// Stars effect component (reused from the analysis component)
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

const DataExpanderTool = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [mode, setMode] = useState('expand'); // 'expand' or 'alter'
  const [prompt, setPrompt] = useState('');
  const [numSamples, setNumSamples] = useState(10);
  // Removed API key and model selection - backend handles these
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [resultViewAll, setResultViewAll] = useState(false);
  const [previewSize] = useState(10); // Dynamic preview size

  const API_BASE = 'http://localhost:5004/api';

  // Load datasets on component mount
  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const response = await fetch(`${API_BASE}/datasets`);
      const data = await response.json();
      if (data.success) {
        setDatasets(data.datasets || []);
      }
    } catch (err) {
      console.error('Error loading datasets:', err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/upload-dataset`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDatasets();
        setSelectedDataset(file.name);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const previewDataset = async (filename, viewAll = false) => {
    try {
      const response = await fetch(`${API_BASE}/preview-dataset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: filename, view_all: viewAll }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data);
        setSelectedDataset(filename);
      } else {
        setError(data.error || 'Preview failed');
      }
    } catch (err) {
      setError('Preview failed: ' + err.message);
    }
  };

  const processDataset = async () => {
    if (!selectedDataset || !prompt) {
      setError('Please select a dataset and enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const endpoint = mode === 'expand' ? 'expand-dataset' : 'alter-dataset';
    const payload = {
      file_name: selectedDataset,
      [mode === 'expand' ? 'expansion_prompt' : 'alter_prompt']: prompt,
    };

    if (mode === 'expand') {
      payload.num_samples = numSamples;
    }

    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        await loadDatasets(); // Refresh dataset list
      } else {
        setError(data.error || 'Processing failed');
      }
    } catch (err) {
      setError('Processing failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (!result?.csvData) return;

    const csvContent = atob(result.csvData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}_result.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Page Header */}
      <header className="bg-black border-b border-[#3A005A] py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-[#FF5C41] via-[#F39C12] via-[#E67E22] via-[#BB8FCE] to-[#9B59B6] text-transparent bg-clip-text">Dataset Expansion & Alteration</span>
            </h1>
            <p className="text-gray-400">Transform your datasets with AI-powered expansion and alteration</p>
            <div className="h-1 w-32 bg-gradient-to-r from-[#A277FF] via-[#E056FD] to-[#6153CC] rounded-full mt-4 mx-auto shadow-[0_0_15px_5px_rgba(162,119,255,0.3)]"></div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-black rounded-lg shadow-[0_0_30px_rgba(255,92,65,0.2)] border border-[#FF5C41] p-6 relative overflow-hidden">
            <div className="flex items-center mb-4 relative z-10">
              <AlertCircle className="text-[#FF5C41] mr-2" size={20} />
              <h2 className="text-xl font-semibold text-[#FF5C41]">Error</h2>
            </div>
            <div className="text-gray-300 relative z-10">
              {error}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-1/4">
            <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
              <StarsEffect />
                
              {/* Glowing border effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
              </div>
              
              <h2 className="text-xl font-semibold text-[#A277FF] mb-6 relative z-10">Dataset Management</h2>
                
              {/* File Upload */}
              <div className="mb-8 relative z-10">
                <label className="block text-gray-300 mb-2 text-sm">Upload Dataset</label>
                <div className="border border-[#3A005A] bg-black/60 rounded-md p-2 hover:border-[#A277FF] transition-colors duration-200 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.json"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="w-full text-gray-300 focus:outline-none opacity-0 absolute inset-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Upload size={18} className="text-[#A277FF]" />
                    <span className="text-gray-300 text-sm">
                      {uploading ? 'Uploading...' : 'Click to upload files'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dataset List */}
              <div className="mb-8 relative z-10">
                <label className="block text-gray-300 mb-2 text-sm">
                  Available Datasets ({datasets.length})
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {datasets.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-2">📊</div>
                      <p className="text-sm">No datasets available</p>
                    </div>
                  ) : (
                    datasets.map((dataset, index) => (
                      <div
                        key={index}
                        onClick={() => previewDataset(dataset.name)}
                        className={`p-3 rounded-md cursor-pointer transition-all duration-200 ${
                          selectedDataset === dataset.name
                            ? 'bg-[#A277FF]/20 border border-[#A277FF]/50'
                            : 'bg-black/40 hover:bg-black/60 border border-[#3A005A] hover:border-[#A277FF]/30'
                        }`}
                      >
                        <div className="text-white text-sm font-medium">
                          {dataset.name}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {dataset.modified}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full md:w-3/4 flex flex-col gap-6">
            
            {/* Dataset Preview */}
            {previewData && (
              <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
                <StarsEffect />
                
                {/* Glowing border effect */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
                </div>
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center">
                    <FileText className="text-[#A277FF] mr-2" size={20} />
                    <h2 className="text-xl font-semibold text-[#A277FF]">Dataset Preview - {selectedDataset}</h2>
                  </div>
                  <button
                    onClick={() => previewDataset(selectedDataset, !previewData.is_full_view)}
                    className="px-4 py-2 bg-[#A277FF]/20 border border-[#A277FF]/30 text-[#A277FF] rounded-md text-sm hover:bg-[#A277FF]/30 transition-colors"
                  >
                    {previewData.is_full_view ? 'Show Preview' : 'View All'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">{(previewData.rows || 0).toLocaleString()}</div>
                    <div className="text-gray-300 text-sm">Total Rows</div>
                  </div>
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">{(previewData.columns || []).length}</div>
                    <div className="text-gray-300 text-sm">Columns</div>
                  </div>
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">
                      {Object.keys(previewData.numeric_stats || {}).length}
                    </div>
                    <div className="text-gray-300 text-sm">Numeric Columns</div>
                  </div>
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">
                      {(previewData.columns || []).length - Object.keys(previewData.numeric_stats || {}).length}
                    </div>
                    <div className="text-gray-300 text-sm">Text Columns</div>
                  </div>
                </div>

                <div className="overflow-x-auto relative z-10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#3A005A]">
                        {previewData.columns.map((col, index) => (
                          <th key={index} className="px-4 py-3 text-left text-[#E056FD] font-medium border-r last:border-r-0 border-[#3A005A]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.is_full_view ? previewData.preview : previewData.preview.slice(0, previewSize)).map((row, index) => (
                        <tr key={index} className="border-b border-[#3A005A]">
                          {previewData.columns.map((col, colIndex) => (
                            <td key={colIndex} className="px-4 py-3 text-gray-300 border-r last:border-r-0 border-[#3A005A]">
                              <div className="max-w-xs truncate">
                                {String(row[col] || '').substring(0, 50)}
                                {String(row[col] || '').length > 50 ? '...' : ''}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="mt-3 text-xs text-gray-400 text-right">
                    Showing {previewData.showing_rows} of {previewData.rows} rows
                  </div>
                </div>
              </div>
            )}

            {/* Processing Panel */}
            <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
              <StarsEffect />
              
              {/* Glowing border effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
              </div>
              
              <div className="flex items-center mb-4 relative z-10">
                <Database className="text-[#A277FF] mr-2" size={20} />
                <h2 className="text-xl font-semibold text-[#A277FF]">Data Processing</h2>
              </div>
                
              {/* Mode Selection */}
              <div className="mb-6 relative z-10">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Operation Mode
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setMode('expand')}
                    className={`flex-1 py-3 px-6 rounded-md font-medium transition-all duration-300 ${
                      mode === 'expand'
                        ? 'bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-white shadow-lg'
                        : 'bg-black/60 text-gray-300 hover:bg-black/80 border border-[#3A005A]'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-2">📈</span>
                      Expand Data
                    </div>
                    <div className="text-xs mt-1 opacity-80">Add new synthetic rows</div>
                  </button>
                  <button
                    onClick={() => setMode('alter')}
                    className={`flex-1 py-3 px-6 rounded-md font-medium transition-all duration-300 ${
                      mode === 'alter'
                        ? 'bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-white shadow-lg'
                        : 'bg-black/60 text-gray-300 hover:bg-black/80 border border-[#3A005A]'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-2">🔧</span>
                      Alter Data
                    </div>
                    <div className="text-xs mt-1 opacity-80">Modify existing data</div>
                  </button>
                </div>
              </div>

              {/* Number of Samples (only for expand mode) */}
              {mode === 'expand' && (
                <div className="mb-6 relative z-10">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    Number of New Rows
                  </label>
                  <input
                    type="number"
                    value={numSamples}
                    onChange={(e) => setNumSamples(parseInt(e.target.value) || 10)}
                    min="1"
                    max="1000"
                    className="w-full px-4 py-3 bg-black/60 border border-[#3A005A] rounded-md focus:outline-none focus:border-[#A277FF] text-white"
                  />
                </div>
              )}

              {/* Prompt Input */}
              <div className="mb-8 relative z-10">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  {mode === 'expand' ? 'Expansion Prompt' : 'Alteration Prompt'}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'expand'
                      ? 'Describe the type of data to generate based on your existing dataset...'
                      : 'Describe how you want to modify, filter, or transform your data...'
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-black/60 border border-[#3A005A] rounded-md focus:outline-none focus:border-[#A277FF] focus:ring-1 focus:ring-[#A277FF] text-white transition-all duration-200"
                />
                <div className="mt-2 text-xs text-gray-400">
                  {mode === 'expand' 
                    ? 'Describe the type of data you want to generate based on your existing dataset'
                    : 'Describe how you want to modify, filter, or transform your data'
                  }
                </div>
              </div>

              {/* Process Button */}
              <div className="mb-8 relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 mr-3 animate-spin border-2 border-[#A277FF] border-t-transparent rounded-full"></div>
                    <span className="text-white">Processing {mode}...</span>
                  </div>
                ) : (
                  <button
                    onClick={processDataset}
                    disabled={!selectedDataset || !prompt}
                    className={`
                      w-full py-4 px-8 bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-white rounded-md font-medium
                      focus:outline-none focus:ring-2 focus:ring-[#A277FF] focus:ring-offset-2 focus:ring-offset-black
                      shadow-[0_0_15px_rgba(162,119,255,0.5)] transition-all duration-200
                      ${!selectedDataset || !prompt ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
                    `}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-3 text-xl">
                        {mode === 'expand' ? '📈' : '🔧'}
                      </span>
                      {mode === 'expand' ? 'Expand Dataset' : 'Alter Dataset'}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="bg-black rounded-lg shadow-[0_0_30px_rgba(162,119,255,0.2)] border border-[#3A005A] p-6 relative overflow-hidden">
                <StarsEffect />
                
                {/* Glowing border effect */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border border-[#A277FF] rounded-lg opacity-50 blur-[2px]"></div>
                </div>
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h2 className="text-xl font-semibold text-[#A277FF]">Processing Results</h2>
                  <button
                    onClick={() => setResultViewAll(!resultViewAll)}
                    className="px-4 py-2 bg-[#A277FF]/20 border border-[#A277FF]/30 text-[#A277FF] rounded-md text-sm hover:bg-[#A277FF]/30 transition-colors"
                  >
                    {resultViewAll ? 'Show Preview' : 'View All Results'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">
                      {((mode === 'expand' ? result.original_rows : result.original_rows) || 0).toLocaleString()}
                    </div>
                    <div className="text-gray-300 text-sm">Original Rows</div>
                  </div>
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">
                      {((mode === 'expand' ? result.expanded_rows : result.altered_rows) || 0).toLocaleString()}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {mode === 'expand' ? 'Total Rows' : 'Final Rows'}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">
                      {mode === 'expand' 
                        ? `+${((result.expanded_rows || 0) - (result.original_rows || 0)).toLocaleString()}`
                        : result.changes?.row_count_changed ? '±' : '='
                      }
                    </div>
                    <div className="text-gray-300 text-sm">
                      {mode === 'expand' ? 'Rows Added' : 'Row Change'}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                    <div className="text-2xl font-bold text-[#A277FF]">{(result.columns || []).length}</div>
                    <div className="text-gray-300 text-sm">Final Columns</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-6 relative z-10">
                  <button
                    onClick={downloadResult}
                    className="px-6 py-3 bg-gradient-to-r from-[#A277FF] to-[#6153CC] text-white rounded-md font-medium hover:opacity-90 transition-all duration-300 shadow-lg flex items-center"
                  >
                    <span className="mr-2">📥</span>
                    Download Result
                  </button>
                  
                  {result.changes && (
                    <div className="flex flex-wrap gap-2">
                      {result.changes.columns_added.length > 0 && (
                        <span className="px-3 py-1 bg-[#A277FF]/20 border border-[#A277FF]/30 text-[#A277FF] rounded-lg text-sm">
                          +{result.changes.columns_added.length} columns added
                        </span>
                      )}
                      {result.changes.columns_removed.length > 0 && (
                        <span className="px-3 py-1 bg-[#FF5C41]/20 border border-[#FF5C41]/30 text-[#FF5C41] rounded-lg text-sm">
                          -{result.changes.columns_removed.length} columns removed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Insights */}
                {result.insights && result.insights.length > 0 && (
                  <div className="mb-6 relative z-10">
                    <h4 className="text-white font-semibold mb-3 flex items-center">
                      <span className="mr-2">🔍</span>
                      Data Insights
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.insights.map((insight, index) => (
                        <div key={index} className="bg-black/40 border border-[#3A005A] p-3 rounded-md">
                          <div className="text-gray-300 text-sm">• {insight}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="overflow-x-auto relative z-10">
                  <h4 className="text-white font-semibold mb-3">
                    {mode === 'expand' ? 'Expanded Data Preview' : 'Altered Data Preview'}
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#3A005A]">
                        {result.columns.map((col, index) => (
                          <th key={index} className="px-4 py-3 text-left text-[#E056FD] font-medium border-r last:border-r-0 border-[#3A005A]">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const arr = mode === 'expand' ? result.previewData : result.alteredPreviewData;
                        if (!Array.isArray(arr)) return [];
                        return (resultViewAll ? arr : arr.slice(0, previewSize));
                      })().map((row, index) => (
                        <tr key={index} className="border-b border-[#3A005A]">
                          {result.columns.map((col, colIndex) => (
                            <td key={colIndex} className="px-4 py-3 text-gray-300 border-r last:border-r-0 border-[#3A005A]">
                              <div className="max-w-xs truncate">
                                {String(row[col.name] || '').substring(0, 50)}
                                {String(row[col.name] || '').length > 50 ? '...' : ''}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="mt-3 text-xs text-gray-400 text-right">
                    Showing {resultViewAll ? (mode === 'expand' ? result.previewData?.length : result.alteredPreviewData?.length) : Math.min(previewSize, (mode === 'expand' ? result.previewData?.length : result.alteredPreviewData?.length) || 0)} of {mode === 'expand' ? result.expanded_rows : result.altered_rows} rows
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-[#3A005A] p-4 text-center">
        <p className="text-[#A277FF]">Dataset Expansion & Alteration • Powered by AI</p>
      </footer>
      
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default DataExpanderTool;