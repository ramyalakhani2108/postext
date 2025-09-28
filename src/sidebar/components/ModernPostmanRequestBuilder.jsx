import React, { useState, useEffect } from 'react';
import './ModernPostmanBuilder.css';

const ModernPostmanRequestBuilder = ({ request, onRequestChange, onSendRequest, loading, settings }) => {
  const [activeTab, setActiveTab] = useState('params');
  const [bodyType, setBodyType] = useState('json');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [detectingForms, setDetectingForms] = useState(false);
  const [formDataPairs, setFormDataPairs] = useState([{ key: '', value: '', type: 'text', enabled: true }]);

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
    // Intelligent content type detection based on AI analysis
    const intelligentBodyType = detectBodyType(suggestion);
    
    updateRequest({
      method: suggestion.method || 'POST',
      url: suggestion.url || '',
      headers: suggestion.headers || [],
      body: suggestion.body || '',
      params: suggestion.params || []
    });
    
    // Set appropriate body type based on AI analysis
    setBodyType(intelligentBodyType);
    
    // If it's form-data, parse and set form data pairs
    if (intelligentBodyType === 'form-data' && suggestion.formData) {
      setFormDataPairs(suggestion.formData);
    } else if (intelligentBodyType === 'x-www-form-urlencoded' && suggestion.body) {
      // Parse URL-encoded data into form pairs
      const pairs = parseUrlEncodedToFormPairs(suggestion.body);
      setFormDataPairs(pairs);
    }
    
    setAiSuggestions([]);
  };

  // Intelligent body type detection (like a 10+ year Postman expert would do)
  const detectBodyType = (suggestion) => {
    const headers = suggestion.headers || [];
    const body = suggestion.body || '';
    
    // Check Content-Type header first (most reliable)
    const contentTypeHeader = headers.find(h => 
      h.key?.toLowerCase() === 'content-type' && h.enabled
    );
    
    if (contentTypeHeader) {
      const contentType = contentTypeHeader.value.toLowerCase();
      
      if (contentType.includes('application/json')) return 'json';
      if (contentType.includes('multipart/form-data')) return 'form-data';
      if (contentType.includes('application/x-www-form-urlencoded')) return 'x-www-form-urlencoded';
      if (contentType.includes('text/')) return 'raw';
      if (contentType.includes('xml')) return 'raw';
    }
    
    // Analyze body content structure
    if (body) {
      try {
        JSON.parse(body);
        return 'json'; // Valid JSON
      } catch (e) {
        // Not JSON, check other formats
        if (body.includes('=') && body.includes('&')) {
          return 'x-www-form-urlencoded'; // URL-encoded form data
        }
        if (body.includes('Content-Disposition') && body.includes('boundary')) {
          return 'form-data'; // Multipart form data
        }
      }
    }
    
    // Check if suggestion has file uploads (always form-data for files)
    if (suggestion.hasFileUploads) {
      return 'form-data';
    }
    
    // Check method - GET/DELETE typically don't have bodies
    if (['GET', 'DELETE'].includes(suggestion.method?.toUpperCase())) {
      return 'none';
    }
    
    // Default based on modern API standards
    return 'json';
  };

  // Parse URL-encoded string into form pairs
  const parseUrlEncodedToFormPairs = (urlEncodedString) => {
    try {
      const pairs = [];
      const params = new URLSearchParams(urlEncodedString);
      
      for (const [key, value] of params.entries()) {
        pairs.push({
          key,
          value,
          type: 'text',
          enabled: true
        });
      }
      
      // Add empty pair for adding more
      pairs.push({ key: '', value: '', type: 'text', enabled: true });
      return pairs;
    } catch (e) {
      return [{ key: '', value: '', type: 'text', enabled: true }];
    }
  };

  // Form data management functions (Postman-like interface)
  const updateFormDataPair = (index, field, value) => {
    const newPairs = [...formDataPairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    
    // Auto-add new empty row when the last row is filled
    if (index === formDataPairs.length - 1 && newPairs[index].key && newPairs[index].value) {
      newPairs.push({ key: '', value: '', type: 'text', enabled: true });
    }
    
    setFormDataPairs(newPairs);
    updateRequestFromFormData(newPairs);
  };

  const addFormDataPair = () => {
    setFormDataPairs([...formDataPairs, { key: '', value: '', type: 'text', enabled: true }]);
  };

  const removeFormDataPair = (index) => {
    if (formDataPairs.length > 1) {
      const newPairs = formDataPairs.filter((_, i) => i !== index);
      setFormDataPairs(newPairs);
      updateRequestFromFormData(newPairs);
    }
  };

  // Update request body from form data pairs
  const updateRequestFromFormData = (pairs) => {
    const enabledPairs = pairs.filter(pair => pair.enabled && pair.key);
    
    if (bodyType === 'x-www-form-urlencoded') {
      const urlencoded = new URLSearchParams();
      enabledPairs.forEach(pair => {
        if (pair.key) urlencoded.append(pair.key, pair.value);
      });
      updateRequest({ body: urlencoded.toString() });
      
      // Update or add Content-Type header
      const headers = [...(request.headers || [])];
      const contentTypeIndex = headers.findIndex(h => h.key?.toLowerCase() === 'content-type');
      
      if (contentTypeIndex >= 0) {
        headers[contentTypeIndex] = { key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true };
      } else {
        headers.push({ key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true });
      }
      
      updateRequest({ headers });
    } else if (bodyType === 'form-data') {
      // For form-data, we'll store as JSON representation since we can't create actual FormData in textarea
      const formDataObj = {};
      enabledPairs.forEach(pair => {
        if (pair.key) formDataObj[pair.key] = { value: pair.value, type: pair.type };
      });
      updateRequest({ body: JSON.stringify(formDataObj, null, 2) });
      
      // Update or add Content-Type header for multipart/form-data
      const headers = [...(request.headers || [])];
      const contentTypeIndex = headers.findIndex(h => h.key?.toLowerCase() === 'content-type');
      
      if (contentTypeIndex >= 0) {
        headers[contentTypeIndex] = { key: 'Content-Type', value: 'multipart/form-data', enabled: true };
      } else {
        headers.push({ key: 'Content-Type', value: 'multipart/form-data', enabled: true });
      }
      
      updateRequest({ headers });
    }
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
                  className={`body-type-tab ${bodyType === 'none' ? 'active' : ''}`}
                  onClick={() => setBodyType('none')}
                >
                  none
                </button>
                <button
                  className={`body-type-tab ${bodyType === 'form-data' ? 'active' : ''}`}
                  onClick={() => setBodyType('form-data')}
                >
                  form-data
                </button>
                <button
                  className={`body-type-tab ${bodyType === 'x-www-form-urlencoded' ? 'active' : ''}`}
                  onClick={() => setBodyType('x-www-form-urlencoded')}
                >
                  x-www-form-urlencoded
                </button>
                <button
                  className={`body-type-tab ${bodyType === 'raw' ? 'active' : ''}`}
                  onClick={() => setBodyType('raw')}
                >
                  raw
                </button>
                <button
                  className={`body-type-tab ${bodyType === 'json' ? 'active' : ''}`}
                  onClick={() => setBodyType('json')}
                >
                  JSON
                </button>
              </div>

              <div className="body-editor">
                {bodyType === 'none' && (
                  <div className="no-body-message">
                    <p>This request does not have a body</p>
                  </div>
                )}

                {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
                  <div className="form-data-editor">
                    <div className="form-data-header">
                      <div className="form-data-columns">
                        <span>Key</span>
                        <span>Value</span>
                        {bodyType === 'form-data' && <span>Type</span>}
                        <span></span>
                      </div>
                    </div>
                    <div className="form-data-rows">
                      {formDataPairs.map((pair, index) => (
                        <div key={index} className="form-data-row">
                          <input
                            type="text"
                            placeholder="Key"
                            value={pair.key}
                            onChange={(e) => updateFormDataPair(index, 'key', e.target.value)}
                            className="form-data-input"
                          />
                          <input
                            type={pair.type === 'file' ? 'file' : 'text'}
                            placeholder="Value"
                            value={pair.type === 'file' ? '' : pair.value}
                            onChange={(e) => updateFormDataPair(index, 'value', e.target.value)}
                            className="form-data-input"
                          />
                          {bodyType === 'form-data' && (
                            <select
                              value={pair.type}
                              onChange={(e) => updateFormDataPair(index, 'type', e.target.value)}
                              className="form-data-type-select"
                            >
                              <option value="text">Text</option>
                              <option value="file">File</option>
                            </select>
                          )}
                          <div className="form-data-actions">
                            <input
                              type="checkbox"
                              checked={pair.enabled}
                              onChange={(e) => updateFormDataPair(index, 'enabled', e.target.checked)}
                              title="Enable/disable this parameter"
                            />
                            <button
                              onClick={() => removeFormDataPair(index)}
                              className="remove-pair-button"
                              title="Remove this parameter"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addFormDataPair}
                      className="add-pair-button"
                    >
                      + Add Parameter
                    </button>
                  </div>
                )}

                {(bodyType === 'raw' || bodyType === 'json') && (
                  <textarea
                    className="smart-textarea"
                    placeholder={
                      bodyType === 'json' 
                        ? '{\n  "key": "value",\n  "number": 123\n}'
                        : 'Enter raw body content'
                    }
                    value={request.body || ''}
                    onChange={(e) => updateRequest({ body: e.target.value })}
                  />
                )}
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