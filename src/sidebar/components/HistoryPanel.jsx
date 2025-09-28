import React, { useState } from 'react';

const HistoryPanel = ({ requests, onLoadRequest, onClearHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.method.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'ALL' || request.method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const getStatusColor = (status) => {
    if (!status) return 'default';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400) return 'error';
    return 'default';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>📚 Request History</h3>
        <div className="history-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
          >
            {methods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <button
            className="clear-btn"
            onClick={onClearHistory}
            disabled={requests.length === 0}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <div className="history-stats">
        <div className="stat-item">
          <strong>Total:</strong> {requests.length}
        </div>
        <div className="stat-item">
          <strong>Filtered:</strong> {filteredRequests.length}
        </div>
        <div className="stat-item">
          <strong>Success Rate:</strong> {
            requests.length > 0 
              ? Math.round((requests.filter(r => r.response?.status >= 200 && r.response?.status < 300).length / requests.length) * 100)
              : 0
          }%
        </div>
      </div>

      <div className="requests-list">
        {filteredRequests.length === 0 ? (
          <div className="no-requests">
            {requests.length === 0 ? (
              <>
                <h4>📭 No Requests Yet</h4>
                <p>Your request history will appear here</p>
              </>
            ) : (
              <>
                <h4>🔍 No Matching Requests</h4>
                <p>Try adjusting your search or filter</p>
              </>
            )}
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="request-item">
              <div className="request-summary">
                <div className="request-main">
                  <span className={`method-badge ${request.method.toLowerCase()}`}>
                    {request.method}
                  </span>
                  <span className="request-url" title={request.url}>
                    {request.url}
                  </span>
                  {request.response && (
                    <span className={`status-badge ${getStatusColor(request.response.status)}`}>
                      {request.response.status}
                    </span>
                  )}
                </div>
                <div className="request-meta">
                  <span className="timestamp">{formatDate(request.timestamp)}</span>
                  {request.response?.timing && (
                    <span className="timing">⏱️ {request.response.timing}ms</span>
                  )}
                </div>
              </div>
              
              <div className="request-actions">
                <button
                  className="load-btn"
                  onClick={() => onLoadRequest(request)}
                  title="Load this request"
                >
                  📂 Load
                </button>
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify({
                      method: request.method,
                      url: request.url,
                      headers: request.headers,
                      body: request.body
                    }, null, 2));
                    alert('Request copied to clipboard!');
                  }}
                  title="Copy request"
                >
                  📋
                </button>
              </div>

              {request.response && (
                <div className="response-preview">
                  <div className="response-summary">
                    <span>Response:</span>
                    {request.response.error ? (
                      <span className="error-text">❌ {request.response.message}</span>
                    ) : (
                      <span className="success-text">
                        ✅ {Object.keys(request.response.data || {}).length} keys
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {requests.length > 0 && (
        <div className="history-footer">
          <p className="footer-text">
            💡 Tip: Click "Load" to reuse any previous request
          </p>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;