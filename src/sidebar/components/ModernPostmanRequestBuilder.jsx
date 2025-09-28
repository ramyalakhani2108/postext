import React, { useState, useEffect } from 'react';
import './ModernPostmanBuilder.css';

const ModernPostmanRequestBuilder = ({ request, onRequestChange, onSendRequest, loading, settings }) => {
  const [activeTab, setActiveTab] = useState('params');
  const [bodyType, setBodyType] = useState('json');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [detectingForms, setDetectingForms] = useState(false);

  // Initialize empty arrays if not provided
  const params = request.params || [];
  const headers = request.headers || [];

  useEffect(() => {
    // Parse URL parameters when URL changes
    if (request.url) {
      try {
        const url = new URL(request.url);
        const urlParams = Array.from(url.searchParams.entries()).map(([key, value]) => ({
          key,
          value,
          enabled: true
        }));
        
        if (urlParams.length > 0 && params.length === 0) {
          updateRequest({ params: urlParams });
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    }
  }, [request.url]);

  const updateRequest = (updates) => {
    onRequestChange({ ...request, ...updates });
  };

  const handleSend = () => {
    // Build final URL with parameters
    let finalUrl = request.url;
    if (params.length > 0) {
      const url = new URL(finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl}`);
      params.forEach(param => {
        if (param.enabled && param.key) {
          url.searchParams.set(param.key, param.value);
        }
      });
      finalUrl = url.toString();
    }

    const requestData = {
      ...request,
      url: finalUrl,
      headers: headers.filter(h => h.enabled && h.key),
      params: params.filter(p => p.enabled && p.key)
    };

    onSendRequest(requestData);
  };

  // Parameter management
  const addParam = () => {
    updateRequest({ 
      params: [...params, { key: '', value: '', enabled: true }] 
    });
  };

  const updateParam = (index, field, value) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    updateRequest({ params: newParams });
  };

  const removeParam = (index) => {
    const newParams = params.filter((_, i) => i !== index);
    updateRequest({ params: newParams });
  };

  // Header management
  const addHeader = () => {
    updateRequest({ 
      headers: [...headers, { key: '', value: '', enabled: true }] 
    });
  };

  const updateHeader = (index, field, value) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateRequest({ headers: newHeaders });
  };

  const removeHeader = (index) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    updateRequest({ headers: newHeaders });
  };

  // AI Form Detection
  const detectForms = async () => {
    setDetectingForms(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.runtime.sendMessage({
        type: 'AI_DETECT_FORMS',
        tabId: tab.id,
        settings
      });

      console.log('AI Detection Response:', response);

      if (response && response.success) {
        setAiSuggestions(response.suggestions || []);
        if (response.suggestions && response.suggestions.length > 0) {
          console.log(`Found ${response.suggestions.length} suggestions`);
        } else {
          console.log('No forms detected on this page');
        }
      } else {
        console.error('AI detection failed:', response?.message || 'Unknown error');
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error('Form detection failed:', error);
      setAiSuggestions([]);
    } finally {
      setDetectingForms(false);
    }
  };

  const applySuggestion = (suggestion) => {
    updateRequest({
      method: suggestion.method || 'POST',
      url: suggestion.url || '',
      headers: suggestion.headers || [],
      body: suggestion.body || '',
      params: suggestion.params || []
    });
    setAiSuggestions([]);
  };

  const formatJson = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(request.body), null, 2);
      updateRequest({ body: formatted });
    } catch (e) {
      alert('Invalid JSON format');
    }
  };

  return (
    <div className="postman-request-builder">
      {/* Smart URL Section */}
      <div className="smart-url-section">
        <div className="url-input-group">
          <select
            className={`method-selector ${request.method}`}
            value={request.method}
            onChange={(e) => updateRequest({ method: e.target.value })}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>

          <input
            type="text"
            className="url-input"
            placeholder="https://api.example.com/endpoint"
            value={request.url}
            onChange={(e) => updateRequest({ url: e.target.value })}
          />

          <button
            className="send-button"
            onClick={handleSend}
            disabled={loading || !request.url}
          >
            {loading ? (
              <>
                <div className="button-icon loading-spinner"></div>
                Sending
              </>
            ) : (
              <>
                <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z"/>
                </svg>
                Send
              </>
            )}
          </button>
        </div>
      </div>

      {/* Smart Tabs Container */}
      <div className="smart-tabs-container">
        <div className="smart-tabs-nav">
          <button
            className={`smart-tab ${activeTab === 'params' ? 'active' : ''}`}
            onClick={() => setActiveTab('params')}
          >
            <div className="tab-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
              </svg>
            </div>
            <span>Params</span>
            {params.length > 0 && (
              <div className="tab-counter">{params.length}</div>
            )}
          </button>
          
          <button
            className={`smart-tab ${activeTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveTab('headers')}
          >
            <div className="tab-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17V19H9V17H3ZM3 5V7H13V5H3ZM13 21V19H21V17H13V15H11V21H13ZM7 9V11H3V13H7V15H9V9H7ZM21 13V11H11V13H21ZM15 9H13V15H15V13H21V11H15V9Z"/>
              </svg>
            </div>
            <span>Headers</span>
            {headers.length > 0 && (
              <div className="tab-counter">{headers.length}</div>
            )}
          </button>
          
          <button
            className={`smart-tab ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            <div className="tab-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <span>Body</span>
            {request.body && request.body.trim() && (
              <div className="tab-counter">●</div>
            )}
          </button>
        </div>

        <div className="smart-tab-content">
          {/* Params Tab */}
          {activeTab === 'params' && (
            <div className="params-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                  </svg>
                  Query Parameters
                </h3>
              </div>

              {params.length > 0 && (
                <div className="smart-kv-list">
                  {params.map((param, index) => (
                    <div key={index} className="smart-kv-item">
                      <input
                        type="text"
                        className="smart-input"
                        placeholder="Parameter name"
                        value={param.key}
                        onChange={(e) => updateParam(index, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        className="smart-input"
                        placeholder="Parameter value"
                        value={param.value}
                        onChange={(e) => updateParam(index, 'value', e.target.value)}
                      />
                      <button
                        className="remove-button"
                        onClick={() => removeParam(index)}
                        title="Remove parameter"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button className="add-button" onClick={addParam}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
                Add Parameter
              </button>
            </div>
          )}

          {/* Headers Tab */}
          {activeTab === 'headers' && (
            <div className="headers-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17V19H9V17H3ZM3 5V7H13V5H3ZM13 21V19H21V17H13V15H11V21H13ZM7 9V11H3V13H7V15H9V9H7ZM21 13V11H11V13H21ZM15 9H13V15H15V13H21V11H15V9Z"/>
                  </svg>
                  Request Headers
                </h3>
              </div>

              {headers.length > 0 && (
                <div className="smart-kv-list">
                  {headers.map((header, index) => (
                    <div key={index} className="smart-kv-item">
                      <input
                        type="text"
                        className="smart-input"
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        className="smart-input"
                        placeholder="Header value"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      />
                      <button
                        className="remove-button"
                        onClick={() => removeHeader(index)}
                        title="Remove header"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button className="add-button" onClick={addHeader}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
                Add Header
              </button>
            </div>
          )}

          {/* Body Tab */}
          {activeTab === 'body' && (
            <div className="body-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                  </svg>
                  Request Body
                </h3>
                {bodyType === 'json' && (
                  <button 
                    onClick={formatJson}
                    className="add-button"
                    style={{ marginLeft: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                  >
                    Format JSON
                  </button>
                )}
              </div>

              <div className="body-type-selector">
                <button
                  className={`body-type-tab ${bodyType === 'raw' ? 'active' : ''}`}
                  onClick={() => setBodyType('raw')}
                >
                  Raw
                </button>
                <button
                  className={`body-type-tab ${bodyType === 'json' ? 'active' : ''}`}
                  onClick={() => setBodyType('json')}
                >
                  JSON
                </button>
                <button
                  className={`body-type-tab ${bodyType === 'form' ? 'active' : ''}`}
                  onClick={() => setBodyType('form')}
                >
                  Form
                </button>
              </div>

              <div className="body-editor">
                <textarea
                  className="smart-textarea"
                  placeholder={
                    bodyType === 'json' 
                      ? '{\n  "key": "value",\n  "number": 123\n}'
                      : bodyType === 'form'
                      ? 'key1=value1&key2=value2'
                      : 'Enter raw body content'
                  }
                  value={request.body || ''}
                  onChange={(e) => updateRequest({ body: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Detection Panel */}
      <div className="ai-panel">
        <div className="ai-panel-header">
          <div className="ai-panel-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
            </svg>
          </div>
          <div>
            <h4 className="ai-panel-title">AI Form Detection</h4>
            <p className="ai-panel-subtitle">Analyze the current page for forms and generate API requests</p>
          </div>
        </div>

        <button
          className="ai-detect-button"
          onClick={detectForms}
          disabled={detectingForms}
        >
          {detectingForms ? (
            <>
              <div className="loading-spinner"></div>
              Analyzing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 11H7V9H9V11ZM13 11H11V9H13V11ZM17 11H15V9H17V11ZM19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z"/>
              </svg>
              Detect Forms
            </>
          )}
        </button>

        {aiSuggestions.length > 0 && (
          <div className="ai-suggestions">
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => applySuggestion(suggestion)}
              >
                <strong>{suggestion.method}</strong> {suggestion.url}
                <br />
                <small>{suggestion.description}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernPostmanRequestBuilder;