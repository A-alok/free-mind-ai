// components/CodeZipManager.js
import { useState, useEffect } from 'react';

const CodeZipManager = ({ userId, userEmail }) => {
  const [codeZips, setCodeZips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState(null);

  // Fetch user's code zips
  const fetchCodeZips = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        userId: userId || '',
        stats: 'true',
        limit: '10'
      });

      const response = await fetch(`/api/code-zips?${params}`);
      const data = await response.json();

      if (data.success) {
        setCodeZips(data.codeZips);
        setStatistics(data.statistics);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch code zips: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Download a code zip
  const downloadCodeZip = async (zipId) => {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/code-zips/${zipId}/download?${params}`);
      const data = await response.json();

      if (data.success) {
        // Open the Cloudinary download URL in a new tab
        window.open(data.downloadUrl, '_blank');
        
        // Refresh the list to update download counts
        fetchCodeZips();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to download: ' + err.message);
    }
  };

  // Delete a code zip
  const deleteCodeZip = async (zipId, hardDelete = false) => {
    if (!confirm(`Are you sure you want to ${hardDelete ? 'permanently delete' : 'delete'} this code zip?`)) {
      return;
    }

    try {
      const params = new URLSearchParams({
        userId: userId || '',
        hardDelete: hardDelete.toString()
      });

      const response = await fetch(`/api/code-zips/${zipId}?${params}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setCodeZips(prev => prev.filter(zip => zip._id !== zipId));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    }
  };

  // Manually store generated code (example usage)
  const storeGeneratedCode = async (generatedFiles, projectName, projectDescription = '') => {
    try {
      const response = await fetch('/api/code-zips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatedFiles,
          projectName,
          projectDescription,
          userId,
          userEmail,
          techStack: [], // Will be auto-detected
          tags: ['manual-upload'],
          isPublic: false,
          expirationDays: 30
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the list
        fetchCodeZips();
        return data;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError('Failed to store code: ' + err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchCodeZips();
    }
  }, [userId]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className="code-zip-manager">
      <div className="header">
        <h2>Your Generated Code Archives</h2>
        <button onClick={fetchCodeZips} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {statistics && (
        <div className="statistics" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h3>Statistics</h3>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>Total Projects: {statistics.totalZips}</div>
            <div>Total Downloads: {statistics.totalDownloads}</div>
            <div>Total Size: {formatFileSize(statistics.totalSizeBytes)}</div>
            <div>Expiring Soon: {statistics.expiringSoon}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading your code archives...</div>
      ) : codeZips.length === 0 ? (
        <div>No code archives found. Generate some code to see them here!</div>
      ) : (
        <div className="code-zips-list">
          {codeZips.map(zip => (
            <div key={zip._id} className="code-zip-item" style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div className="zip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{zip.projectName}</h3>
                <div className="zip-actions">
                  <button 
                    onClick={() => downloadCodeZip(zip._id)}
                    style={{ marginRight: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}
                  >
                    Download ({zip.downloadCount})
                  </button>
                  <button 
                    onClick={() => deleteCodeZip(zip._id, false)}
                    style={{ marginRight: '0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {zip.projectDescription && (
                <p style={{ margin: '0.5rem 0' }}>{zip.projectDescription}</p>
              )}
              
              <div className="zip-metadata" style={{ fontSize: '0.9rem', color: '#666' }}>
                <div>Size: {zip.zipSizeFormatted || formatFileSize(zip.zipSize)}</div>
                <div>Files: {zip.generatedFiles.length}</div>
                <div>Tech Stack: {zip.techStack.join(', ')}</div>
                <div>Created: {formatDate(zip.createdAt)}</div>
                <div>Expires: {zip.expiresIn || 'Never'} ({formatDate(zip.expiresAt)})</div>
                {zip.lastDownloadedAt && (
                  <div>Last Downloaded: {formatDate(zip.lastDownloadedAt)}</div>
                )}
              </div>
              
              {zip.tags && zip.tags.length > 0 && (
                <div className="tags" style={{ marginTop: '0.5rem' }}>
                  {zip.tags.map(tag => (
                    <span key={tag} style={{ 
                      backgroundColor: '#e9ecef', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      marginRight: '0.5rem'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CodeZipManager;