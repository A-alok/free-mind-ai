"use client"
import { AlertCircle, Database, FileText, Upload, ArrowLeft, Brain, BarChart3, Settings, Download, TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useState } from 'react';
import Link from 'next/link';


const DataExpanderTool = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [mode, setMode] = useState('expand'); // 'expand' or 'alter'
  const [prompt, setPrompt] = useState('');
  const [numSamples, setNumSamples] = useState(10);
  // API key for OpenRouter (optional). If provided, backend will use LLM; otherwise falls back to local logic
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resultViewAll, setResultViewAll] = useState(false);
  const [previewSize] = useState(10); // Dynamic preview size
  const [dragOver, setDragOver] = useState(false);

  const API_BASE = 'http://localhost:5000/api';

  // Load datasets on component mount
  useEffect(() => {
    // restore API key from localStorage if present
    try {
      const saved = localStorage.getItem('OPENROUTER_API_KEY');
      if (saved) setApiKey(saved);
    } catch {}
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
        // Show success message with file info
        setError('');
        setSuccessMessage(`✅ Successfully uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      let errorMessage = 'Upload failed: ' + err.message;
      if (err.message.includes('Failed to fetch')) {
        errorMessage = '🔌 Connection Error: Unable to connect to data processing server. Please ensure the Flask server is running on port 5000.';
      }
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.csv') || 
          file.name.toLowerCase().endsWith('.xlsx') || 
          file.name.toLowerCase().endsWith('.json')) {
        // Create a synthetic event to reuse the existing upload handler
        const syntheticEvent = {
          target: { files: [file] }
        };
        await handleFileUpload(syntheticEvent);
      } else {
        setError('Please drop a CSV, Excel (.xlsx), or JSON file.');
      }
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

    // Include API key if provided
    if (apiKey && apiKey.trim()) {
      payload.api_key = apiKey.trim();
      // Prefer OpenRouter when API key is present
      payload.provider = 'openrouter';
    } else {
      // Hint backend to use Gemini if GOOGLE_API_KEY is set
      payload.provider = 'gemini';
    }

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
        // Enhanced error handling for common issues
        let errorMessage = data.error || 'Processing failed';
        if (errorMessage.includes('API key')) {
          errorMessage = '🔑 API Key Required: The data processing server needs an OpenRouter API key to function. Please ensure OPENROUTER_API_KEY is set in the environment.';
        } else if (errorMessage.includes('Connection error')) {
          errorMessage = '🌐 Connection Error: Unable to reach the AI service. Please check your internet connection and try again.';
        }
        setError(errorMessage);
      }
    } catch (err) {
      let errorMessage = 'Processing failed: ' + err.message;
      if (err.message.includes('Failed to fetch')) {
        errorMessage = '🔌 Server Connection Error: Unable to connect to the data processing server. Please ensure the Flask server is running on port 5000.';
      }
      setError(errorMessage);
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
              <BarChart3 className="w-8 h-8 text-violet-600 mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Dataset <span className="text-violet-600">Expansion & Alteration</span>
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Transform your datasets with AI-powered expansion and alteration tools.
            </p>
          </div>
        </div>

        {/* Success Display */}
        {successMessage && (
          <div className="mb-8 bg-white rounded-2xl border border-green-200 shadow-lg overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-500 rounded-full mr-3 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-green-900">Success</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center mb-6">
                <Upload className="w-6 h-6 text-violet-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Dataset Management</h2>
              </div>
                
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Dataset
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.json"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  />
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                    dragOver 
                      ? 'border-violet-400 bg-violet-50' 
                      : uploading 
                        ? 'border-gray-300 bg-gray-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-violet-400 hover:bg-violet-50'
                  }`}>
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-2" />
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className={`w-8 h-8 mb-2 ${
                          dragOver ? 'text-violet-600 animate-bounce' : 'text-gray-400'
                        }`} />
                        <p className="text-sm text-gray-600">
                          {dragOver 
                            ? 'Drop your file here!' 
                            : 'Click to upload or drag & drop'
                          }
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports CSV, Excel (.xlsx), JSON files
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dataset List */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Datasets ({datasets.length})
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {datasets.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-2">📉</div>
                      <p className="text-sm">No datasets available</p>
                      <p className="text-xs mt-1">Upload a file to get started</p>
                    </div>
                  ) : (
                    datasets.map((dataset, index) => (
                      <div
                        key={index}
                        onClick={() => previewDataset(dataset.name)}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                          selectedDataset === dataset.name
                            ? 'bg-violet-50 border-violet-200 shadow-sm'
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        <div className="text-gray-900 text-sm font-medium">
                          {dataset.name}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
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
          <main className="lg:col-span-2">
            <div className="space-y-6">
            
              {/* Dataset Preview */}
              {previewData && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">Dataset Preview - {selectedDataset}</h3>
                      </div>
                      <button
                        onClick={() => previewDataset(selectedDataset, !previewData.is_full_view)}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors"
                      >
                        {previewData.is_full_view ? 'Show Preview' : 'View All'}
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-violet-600">{(previewData.rows || 0).toLocaleString()}</div>
                        <div className="text-gray-600 text-sm">Total Rows</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-violet-600">{(previewData.columns || []).length}</div>
                        <div className="text-gray-600 text-sm">Columns</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-violet-600">
                          {Object.keys(previewData.numeric_stats || {}).length}
                        </div>
                        <div className="text-gray-600 text-sm">Numeric Columns</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-violet-600">
                          {(previewData.columns || []).length - Object.keys(previewData.numeric_stats || {}).length}
                        </div>
                        <div className="text-gray-600 text-sm">Text Columns</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {previewData.columns.map((col, index) => (
                              <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(previewData.is_full_view ? previewData.preview : previewData.preview.slice(0, previewSize)).map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {previewData.columns.map((col, colIndex) => (
                                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                      
                      <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center">
                        Showing {previewData.showing_rows} of {previewData.rows} rows
                      </div>
                    </div>
                  </div>
                </div>
            )}

            {/* Processing Panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center mb-6">
                <Database className="w-6 h-6 text-violet-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Data Processing</h2>
              </div>
                
              {/* Mode Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Operation Mode
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setMode('expand')}
                    className={`flex-1 py-4 px-6 rounded-lg font-medium transition-all duration-300 border ${
                      mode === 'expand'
                        ? 'bg-violet-600 text-white border-violet-600 shadow-lg hover:bg-violet-700'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-violet-300'
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
                    className={`flex-1 py-4 px-6 rounded-lg font-medium transition-all duration-300 border ${
                      mode === 'alter'
                        ? 'bg-violet-600 text-white border-violet-600 shadow-lg hover:bg-violet-700'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-violet-300'
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
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of New Rows
                  </label>
                  <input
                    type="number"
                    value={numSamples}
                    onChange={(e) => setNumSamples(parseInt(e.target.value) || 10)}
                    min="1"
                    max="1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 bg-white"
                    placeholder="Enter number of rows to generate"
                  />
                  <p className="text-xs text-gray-500 mt-1">Generate between 1-1000 new synthetic rows</p>
                </div>
              )}

              {/* OpenRouter API Key (optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenRouter API Key (optional)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onBlur={() => { try { if (apiKey) localStorage.setItem('OPENROUTER_API_KEY', apiKey); } catch {} }}
                  placeholder="sk-or-..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If provided, the server will use the LLM via OpenRouter for higher-fidelity results. Stored locally in your browser only.
                </p>
              </div>

              {/* Prompt Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 bg-white resize-none transition-all duration-200"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {mode === 'expand' 
                    ? 'Describe the type of data you want to generate based on your existing dataset'
                    : 'Describe how you want to modify, filter, or transform your data'
                  }
                </div>
              </div>

              {/* Process Button */}
              <div className="pt-4">
                {loading ? (
                  <div className="flex items-center justify-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-5 h-5 mr-3 animate-spin border-2 border-violet-600 border-t-transparent rounded-full"></div>
                    <span className="text-gray-700 font-medium">Processing {mode}...</span>
                  </div>
                ) : (
                  <button
                    onClick={processDataset}
                    disabled={!selectedDataset || !prompt}
                    className={`
                      w-full py-4 px-8 bg-violet-600 text-white rounded-lg font-medium
                      focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                      shadow-lg transition-all duration-200
                      ${!selectedDataset || !prompt 
                        ? 'opacity-50 cursor-not-allowed bg-gray-300' 
                        : 'hover:bg-violet-700 hover:shadow-xl active:bg-violet-800'
                      }
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <TrendingUp className="w-6 h-6 text-violet-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">Processing Results</h2>
                  </div>
                  <button
                    onClick={() => setResultViewAll(!resultViewAll)}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors font-medium"
                  >
                    {resultViewAll ? 'Show Preview' : 'View All Results'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-violet-600">
                      {((mode === 'expand' ? result.original_rows : result.original_rows) || 0).toLocaleString()}
                    </div>
                    <div className="text-gray-600 text-sm">Original Rows</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-violet-600">
                      {((mode === 'expand' ? result.expanded_rows : result.altered_rows) || 0).toLocaleString()}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {mode === 'expand' ? 'Total Rows' : 'Final Rows'}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-violet-600">
                      {mode === 'expand' 
                        ? `+${((result.expanded_rows || 0) - (result.original_rows || 0)).toLocaleString()}`
                        : result.changes?.row_count_changed ? '±' : '='
                      }
                    </div>
                    <div className="text-gray-600 text-sm">
                      {mode === 'expand' ? 'Rows Added' : 'Row Change'}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-violet-600">{(result.columns || []).length}</div>
                    <div className="text-gray-600 text-sm">Final Columns</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                  <button
                    onClick={downloadResult}
                    className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-all duration-200 shadow-lg flex items-center hover:shadow-xl"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Result
                  </button>
                  
                  {result.changes && (
                    <div className="flex flex-wrap gap-2">
                      {result.changes.columns_added.length > 0 && (
                        <span className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
                          +{result.changes.columns_added.length} columns added
                        </span>
                      )}
                      {result.changes.columns_removed.length > 0 && (
                        <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                          -{result.changes.columns_removed.length} columns removed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Insights */}
                {result.insights && result.insights.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-gray-900 font-semibold mb-3 flex items-center">
                      <Brain className="w-5 h-5 text-violet-600 mr-2" />
                      Data Insights
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.insights.map((insight, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          <div className="text-blue-800 text-sm font-medium">• {insight}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="overflow-x-auto">
                  <h4 className="text-gray-900 font-semibold mb-3">
                    {mode === 'expand' ? 'Expanded Data Preview' : 'Altered Data Preview'}
                  </h4>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {result.columns.map((col, index) => (
                          <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const arr = mode === 'expand' ? result.previewData : result.alteredPreviewData;
                        if (!Array.isArray(arr)) return [];
                        return (resultViewAll ? arr : arr.slice(0, previewSize));
                      })().map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {result.columns.map((col, colIndex) => (
                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                  
                  <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center">
                    Showing {resultViewAll ? (mode === 'expand' ? result.previewData?.length : result.alteredPreviewData?.length) : Math.min(previewSize, (mode === 'expand' ? result.previewData?.length : result.alteredPreviewData?.length) || 0)} of {mode === 'expand' ? result.expanded_rows : result.altered_rows} rows
                  </div>
                </div>
              </div>
            )}
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 p-6 text-center mt-8">
          <p className="text-gray-600 font-medium">Dataset Expansion & Alteration • Powered by AI</p>
        </footer>
      </div>
    </div>
  );
};

export default DataExpanderTool;