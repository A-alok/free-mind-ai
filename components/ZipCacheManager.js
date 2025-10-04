// components/ZipCacheManager.js
import { useState, useEffect } from 'react';

const ZipCacheManager = ({ userId, adminKey }) => {
  const [cacheStats, setCacheStats] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [checkFilename, setCheckFilename] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cache statistics
  const fetchCacheStats = async () => {
    try {
      const response = await fetch('/api/cache/zips?action=stats');
      const data = await response.json();
      
      if (data.success) {
        setCacheStats(data.statistics);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch cache stats: ' + err.message);
    }
  };

  // Check if a specific file is cached
  const checkFileCache = async () => {
    if (!checkFilename.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        action: 'check',
        filename: checkFilename,
        userId: userId || ''
      });
      
      const response = await fetch(`/api/cache/zips?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCheckResult(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to check cache: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup cache (admin only)
  const cleanupCache = async () => {
    if (!adminKey) {
      setError('Admin key required for cleanup');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cache/zips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup',
          adminKey
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchCacheStats(); // Refresh stats
        alert('Cache cleanup completed: ' + data.result.message);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to cleanup cache: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent cached files from code-zips API
  const fetchRecentFiles = async () => {
    try {
      const params = new URLSearchParams({
        limit: '10',
        stats: 'false'
      });
      
      if (userId) {
        params.append('userId', userId);
      } else {
        params.append('public', 'true');
      }
      
      const response = await fetch(`/api/code-zips?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter only flask-generated files
        const flaskFiles = data.codeZips.filter(zip => 
          zip.tags?.includes('flask-generated') || 
          zip.generationParameters?.source === 'flask-backend'
        );
        setRecentFiles(flaskFiles);
      }
    } catch (err) {
      console.error('Failed to fetch recent files:', err);
    }
  };

  useEffect(() => {
    fetchCacheStats();
    fetchRecentFiles();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="zip-cache-manager">
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h2>Zip Cache Manager</h2>
        <p>Monitor and manage cached zip files from Flask backend</p>
      </div>

      {error && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          padding: '1rem', 
          borderRadius: '4px', 
          marginBottom: '1rem' 
        }}>
          {error}
        </div>
      )}

      {/* Cache Statistics */}
      <div className="cache-stats" style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '1rem', 
        borderRadius: '8px', 
        marginBottom: '2rem' 
      }}>
        <h3>Cache Statistics</h3>
        {cacheStats ? (
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>Memory Cache: {cacheStats.memoryCacheSize} entries</div>
            <button onClick={fetchCacheStats} disabled={loading}>
              Refresh Stats
            </button>
            {adminKey && (
              <button 
                onClick={cleanupCache} 
                disabled={loading}
                style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}
              >
                Cleanup Cache
              </button>
            )}
          </div>
        ) : (
          <div>Loading cache statistics...</div>
        )}
      </div>

      {/* File Cache Checker */}
      <div className="cache-checker" style={{ 
        border: '1px solid #ddd', 
        padding: '1rem', 
        borderRadius: '8px', 
        marginBottom: '2rem' 
      }}>
        <h3>Check File Cache Status</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <input
            type="text"
            value={checkFilename}
            onChange={(e) => setCheckFilename(e.target.value)}
            placeholder="Enter filename (e.g., project_abc123.zip)"
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button 
            onClick={checkFileCache} 
            disabled={loading || !checkFilename.trim()}
            style={{ backgroundColor: '#2196f3', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}
          >
            Check Cache
          </button>
        </div>
        
        {checkResult && (
          <div style={{ 
            backgroundColor: checkResult.cached ? '#e8f5e8' : '#fff3e0', 
            padding: '1rem', 
            borderRadius: '4px' 
          }}>
            <h4>Cache Status: {checkResult.cached ? '✅ Cached' : '❌ Not Cached'}</h4>
            <div>Filename: {checkResult.filename}</div>
            <div>Source: {checkResult.source}</div>
            {checkResult.url && (
              <div>
                Cloudinary URL: 
                <a href={checkResult.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem' }}>
                  {checkResult.url.slice(0, 50)}...
                </a>
              </div>
            )}
            {checkResult.codeZip && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                <div>Downloads: {checkResult.codeZip.downloadCount}</div>
                <div>Size: {checkResult.codeZip.zipSizeFormatted || `${Math.round(checkResult.codeZip.zipSize / 1024)} KB`}</div>
                <div>Created: {formatDate(checkResult.codeZip.createdAt)}</div>
                {checkResult.codeZip.lastDownloadedAt && (
                  <div>Last Downloaded: {formatDate(checkResult.codeZip.lastDownloadedAt)}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Flask Files */}
      <div className="recent-files">
        <h3>Recent Flask-Generated Files</h3>
        {recentFiles.length === 0 ? (
          <div>No Flask-generated files found in cache.</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {recentFiles.map(file => (
              <div key={file._id} style={{ 
                border: '1px solid #ddd', 
                padding: '1rem', 
                borderRadius: '8px',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{file.projectName}</strong>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {file.zipFileName} • {file.zipSizeFormatted || `${Math.round(file.zipSize / 1024)} KB`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#666' }}>
                    <div>Downloads: {file.downloadCount}</div>
                    <div>{formatDate(file.createdAt)}</div>
                  </div>
                </div>
                
                {file.tags && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {file.tags.map(tag => (
                      <span key={tag} style={{ 
                        backgroundColor: '#e3f2fd', 
                        color: '#1976d2',
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem',
                        marginRight: '0.5rem'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div style={{ marginTop: '0.5rem' }}>
                  <a 
                    href={file.cloudinaryUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1976d2', textDecoration: 'none' }}
                  >
                    📦 Download from Cache
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <h4>How it works:</h4>
        <ul>
          <li>First download: Fetches from Flask backend and caches in Cloudinary</li>
          <li>Subsequent downloads: Serves directly from Cloudinary (faster)</li>
          <li>Files expire after 30 days automatically</li>
          <li>Cache improves performance and reduces Flask backend load</li>
        </ul>
      </div>
    </div>
  );
};

export default ZipCacheManager;