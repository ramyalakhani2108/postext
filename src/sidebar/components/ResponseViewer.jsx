import React, { useState } from 'react';

const ResponseViewer = ({ response, loading }) => {
  const [activeTab, setActiveTab] = useState('body');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="response-viewer">
        <div className="loading-response">
          <div className="spinner"></div>
          <p>Sending request...</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-viewer">
        <div className="no-response">
          <h3>📭 No Response Yet</h3>
          <p>Send a request to see the response here</p>
        </div>
      </div>
    );
  }

  if (response.error) {
    return (
      <div className="response-viewer">
        <div className="error-response">
          <h3>❌ Request Failed</h3>
          <p>{response.message}</p>
          <div className="error-details">
            <strong>Time:</strong> {response.timestamp}
          </div>
        </div>
      </div>
    );
  }

  const formatJson = (data) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return data;
    }
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400) return 'error';
    return 'default';
  };

  const highlightSearchTerm = (text, term) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  const filteredResponseBody = () => {
    let bodyText = response.data;
    if (typeof response.data === 'object') {
      bodyText = formatJson(response.data);
    }
    
    if (searchTerm) {
      return highlightSearchTerm(bodyText, searchTerm);
    }
    return bodyText;
  };

  return (
    <div className="response-viewer">
      <div className="response-header">
        <h3>📋 Response</h3>
        <div className="response-status">
          <span className={`status-badge ${getStatusColor(response.status)}`}>
            {response.status} {response.statusText}
          </span>
          <span className="timing">⏱️ {response.timing}ms</span>
        </div>
      </div>

      <div className="response-tabs">
        <button 
          className={`tab-btn ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          📝 Body
        </button>
        <button 
          className={`tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          📋 Headers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          🔍 Raw
        </button>
      </div>

      {activeTab === 'body' && (
        <div className="response-body">
          <div className="body-controls">
            <input
              type="text"
              className="search-input"
              placeholder="Search in response..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(
                  typeof response.data === 'object' 
                    ? formatJson(response.data) 
                    : response.data
                );
                alert('Response copied to clipboard!');
              }}
            >
              📋 Copy
            </button>
            <button
              className="download-btn"
              onClick={() => {
                const blob = new Blob([
                  typeof response.data === 'object' 
                    ? formatJson(response.data) 
                    : response.data
                ], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'response.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              💾 Download
            </button>
          </div>
          <div className="response-content">
            {typeof response.data === 'object' ? (
              <pre 
                className="json-response"
                dangerouslySetInnerHTML={{
                  __html: highlightSearchTerm(formatJson(response.data), searchTerm)
                }}
              />
            ) : (
              <div 
                className="text-response"
                dangerouslySetInnerHTML={{
                  __html: highlightSearchTerm(response.data || 'No response body', searchTerm)
                }}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'headers' && (
        <div className="response-headers">
          <div className="headers-list">
            {response.headers && Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="header-item">
                <strong>{key}:</strong>
                <span>{value}</span>
              </div>
            ))}
            {!response.headers && (
              <p className="no-headers">No headers available</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="response-raw">
          <div className="raw-info">
            <div className="info-item">
              <strong>Status:</strong> {response.status} {response.statusText}
            </div>
            <div className="info-item">
              <strong>Time:</strong> {response.timing}ms
            </div>
            <div className="info-item">
              <strong>Size:</strong> {new Blob([JSON.stringify(response.data)]).size} bytes
            </div>
            <div className="info-item">
              <strong>Timestamp:</strong> {new Date(response.timestamp).toLocaleString()}
            </div>
          </div>
          <pre className="raw-content">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ResponseViewer;