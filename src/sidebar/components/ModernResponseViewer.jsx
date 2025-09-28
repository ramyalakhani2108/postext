import React, { useState } from 'react';
import './ModernResponseViewer.css';

const ModernResponseViewer = ({ response, loading }) => {
  const [activeTab, setActiveTab] = useState('body');
  const [jsonExpanded, setJsonExpanded] = useState(true);

  if (loading) {
    return (
      <div className="modern-response-viewer loading-state">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="loading-circle"></div>
            <div className="loading-circle"></div>
            <div className="loading-circle"></div>
          </div>
          <h3>Sending Request...</h3>
          <p>Please wait while we process your request</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="modern-response-viewer empty-state">
        <div className="empty-container">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <h3>No Response Yet</h3>
          <p>Send a request to see the response here</p>
        </div>
      </div>
    );
  }

  const formatJson = (data) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  };

  const getStatusClass = (status) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'client-error';
    if (status >= 500) return 'server-error';
    return 'info';
  };

  const formatSize = (size) => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="modern-response-viewer">
      {/* Response Header */}
      <div className="response-header">
        <div className="response-status">
          <div className={`status-badge ${response.error ? 'error' : getStatusClass(response.status)}`}>
            {response.error ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                </svg>
                Error
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                </svg>
                {response.status}
              </>
            )}
          </div>
          
          <div className="response-meta">
            <span className="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 1H9V3H15V1ZM11 14H13V8H11V14ZM19.03 7.39L20.45 5.97C20 5.46 19.55 5 19.04 4.56L17.62 6C16.07 4.74 14.12 4 12 4C7.03 4 3 8.03 3 13S7.03 22 12 22S21 17.97 21 13C21 10.88 20.26 8.93 19.03 7.39ZM12 20C8.13 20 5 16.87 5 13S8.13 6 12 6S19 9.13 19 13S15.87 20 12 20Z"/>
              </svg>
              {response.responseTime || 0}ms
            </span>
            
            <span className="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
              </svg>
              {formatSize(response.size)}
            </span>
          </div>
        </div>

        {response.timestamp && (
          <div className="response-timestamp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
            </svg>
            {new Date(response.timestamp).toLocaleString()}
          </div>
        )}
      </div>

      {/* Response Tabs */}
      <div className="response-tabs">
        <div className="tabs-nav">
          <button
            className={`tab-button ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
            </svg>
            Response Body
          </button>
          
          <button
            className={`tab-button ${activeTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveTab('headers')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17V19H9V17H3ZM3 5V7H13V5H3ZM13 21V19H21V17H13V15H11V21H13ZM7 9V11H3V13H7V15H9V9H7ZM21 13V11H11V13H21ZM15 9H13V15H15V13H21V11H15V9Z"/>
            </svg>
            Headers
            {response.headers && Object.keys(response.headers).length > 0 && (
              <span className="tab-badge">{Object.keys(response.headers).length}</span>
            )}
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'body' && (
            <div className="response-body">
              {response.error ? (
                <div className="error-message">
                  <div className="error-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                    </svg>
                  </div>
                  <h4>Request Failed</h4>
                  <p>{response.message || 'An unknown error occurred'}</p>
                </div>
              ) : (
                <div className="response-content">
                  <div className="content-toolbar">
                    <div className="content-type">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                      </svg>
                      {response.contentType || 'application/json'}
                    </div>
                    
                    <div className="toolbar-actions">
                      <button
                        className="tool-button"
                        onClick={() => navigator.clipboard.writeText(formatJson(response.data))}
                        title="Copy to clipboard"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                      </button>
                      
                      {typeof response.data === 'object' && (
                        <button
                          className="tool-button"
                          onClick={() => setJsonExpanded(!jsonExpanded)}
                          title={jsonExpanded ? 'Collapse' : 'Expand'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d={jsonExpanded 
                              ? "M7.41 8.58L12 13.17L16.59 8.58L18 10L12 16L6 10L7.41 8.58Z"
                              : "M8.59 16.58L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.58Z"
                            }/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <pre className="response-text">
                    <code>
                      {typeof response.data === 'object' 
                        ? formatJson(response.data)
                        : String(response.data || 'No response body')
                      }
                    </code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="response-headers">
              {response.headers && Object.keys(response.headers).length > 0 ? (
                <div className="headers-list">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="header-item">
                      <div className="header-key">{key}</div>
                      <div className="header-value">{String(value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-headers">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17V19H9V17H3ZM3 5V7H13V5H3ZM13 21V19H21V17H13V15H11V21H13ZM7 9V11H3V13H7V15H9V9H7ZM21 13V11H11V13H21ZM15 9H13V15H15V13H21V11H15V9Z"/>
                  </svg>
                  <p>No response headers available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernResponseViewer;