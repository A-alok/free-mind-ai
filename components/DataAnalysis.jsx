"use client";
import React, { useState } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

const Card = ({ className, children, ...props }) => (
  <div className={`rounded-lg border border-purple-700 bg-black text-gray-100 shadow-xl ${className}`} {...props}>
    {children}
  </div>
);

const Button = ({ className, children, ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white hover:shadow-lg hover:scale-105 h-9 px-4 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Textarea = ({ className, ...props }) => (
  <textarea
    className={`flex min-h-[96px] w-full rounded-md border border-purple-500 bg-black/50 px-3 py-2 text-sm ring-offset-black placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-pink-500 focus-visible:ring-2 focus-visible:ring-purple-500 ${className}`}
    {...props}
  />
);

const InteractiveDataChat = () => {
  const [data, setData] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setData(null);
    setUploadedFileName(null);

    // First, upload file to backend
    const formData = new FormData();
    formData.append('files', file);

    try {
      const uploadResponse = await fetch('http://localhost:5002/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        setError(uploadResult.error);
        return;
      }

      // Store filename for querying
      setUploadedFileName(uploadResult.files[0].filename);

      // Also parse locally for preview
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`);
            return;
          }
          if (results.data.length === 0) {
            setError('The CSV file appears to be empty');
            return;
          }
          setData(results.data);
        },
        error: (error) => {
          setError(`Error reading CSV: ${error.message}`);
        }
      });
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    }
  };

  const processWithAI = async () => {
    if (!uploadedFileName) {
      setError('No file uploaded');
      return;
    }

    setIsAiProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5002/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: uploadedFileName,
          query: query.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        setError(result.error);
        setResult(null);
      } else {
        setResult(result.result);
        setError(null);
      }
    } catch (err) {
      setError(`Failed to connect to AI service: ${err.message}`);
      setResult(null);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const analyzeData = async (e) => {
    e.preventDefault();
    
    if (!data || !uploadedFileName) {
      setError('Please upload a CSV file first');
      return;
    }
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const basicFunctions = {
        'average': (column) => _.meanBy(data, column),
        'sum': (column) => _.sumBy(data, column),
        'max': (column) => _.maxBy(data, column)?.[column],
        'min': (column) => _.minBy(data, column)?.[column],
        'count': () => data.length,
      };

      const words = query.toLowerCase().trim().split(/\s+/);
      let operation = words.find(word => Object.keys(basicFunctions).includes(word));
      let column = words.find(word => data[0]?.hasOwnProperty(word));

      if (operation && (column || operation === 'count')) {
        const result = basicFunctions[operation](column);
        if (result === undefined || result === null) {
          throw new Error(`Unable to compute ${operation} for column "${column}"`);
        }
        setResult(`${operation} of ${column || 'records'}: ${result}`);
      } else {
        await processWithAI();
      }
    } catch (err) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-gradient-to-br from-black via-purple-900 to-black flex items-center justify-center">
      <Card className="w-full max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="flex flex-col space-y-4 p-6">
          <h3 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            💬 AI-Powered Data Chat
          </h3>
          <p className="text-gray-300 text-sm">
            Upload a CSV file and ask questions about your data using natural language
          </p>
        </div>
      
        <div className="p-6 pt-0 space-y-6">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-300
                file:mr-3 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:text-white
                file:transition-opacity
                hover:file:opacity-90
                focus:outline-none"
            />
          </div>

          {data && (
            <div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">📊 Data Preview</h3>
              <div className="overflow-x-auto rounded-md border border-purple-700">
                <table className="min-w-full divide-y divide-purple-700">
                  <thead className="bg-purple-900/50">
                    <tr>
                      {Object.keys(data[0] || {}).map((header) => (
                        <th key={header} className="px-4 py-2 text-left text-sm font-medium text-purple-300 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-black/50 divide-y divide-purple-700">
                    {data.slice(0, 8).map((row, index) => (
                      <tr key={index} className="hover:bg-purple-900/20 transition-colors">
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                            {value?.toString() || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <form onSubmit={analyzeData} className="space-y-4">
            <h3 className="text-xl font-bold text-purple-400">🤖 Ask Anything</h3>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any question about your data..."
              disabled={!data}
            />
            <p className="text-sm text-gray-400">
              Try questions like "What's the average sales?" or "Show the trend in revenue"
            </p>

            <Button
              type="submit"
              disabled={loading || !data || isAiProcessing || !query.trim()}
              className="w-full sm:w-auto"
            >
              {loading || isAiProcessing ? 'Processing...' : '🔍 Analyze'}
            </Button>
          </form>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500 text-red-400 rounded-md text-sm">
              ⚠️ {error}
            </div>
          )}

          {result && !error && (
            <div className="p-4 bg-purple-900/20 border border-purple-500 text-purple-300 rounded-md whitespace-pre-wrap font-mono text-sm">
              {result}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InteractiveDataChat;