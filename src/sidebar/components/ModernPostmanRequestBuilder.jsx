import React, { useState, useEffect } from 'react';
import './ModernPostmanBuilder.css';

const ModernPostmanRequestBuilder = ({ request, onRequestChange, onSendRequest, loading, settings }) => {
  const [activeTab, setActiveTab] = useState('params');
  const [bodyType, setBodyType] = useState('json');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [detectingForms, setDetectingForms] = useState(false);
  const [formDataPairs, setFormDataPairs] = useState([{ key: '', value: '', type: 'text', enabled: true }]);
  
  // New state for advanced features
  const [darkMode, setDarkMode] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditText, setBulkEditText] = useState('');
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

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
    
    // Handle file input specially
    if (field === 'value' && newPairs[index].type === 'file') {
      // For file inputs, we get a FileList, take the first file
      const file = value.target?.files?.[0];
      if (file) {
        newPairs[index] = { ...newPairs[index], value: file.name, file: file };
      }
    } else {
      newPairs[index] = { ...newPairs[index], [field]: value };
    }
    
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



  // Bulk Edit Functions (Postman-like experience)
  const openBulkEdit = () => {
    const pairsText = formDataPairs
      .filter(pair => pair.enabled)
      .map(pair => `${pair.key}:${pair.value}`)
      .join('\n');
    setBulkEditText(pairsText);
    setShowBulkEditModal(true);
  };

  const applyBulkEdit = () => {
    try {
      const lines = bulkEditText.split('\n').filter(line => line.trim());
      const newPairs = lines.map(line => {
        const [key, ...valueParts] = line.split(':');
        return {
          key: key?.trim() || '',
          value: valueParts.join(':').trim() || '',
          type: 'text',
          enabled: true
        };
      }).filter(pair => pair.key); // Only include pairs with keys

      // Add an empty pair at the end for new entries
      newPairs.push({ key: '', value: '', type: 'text', enabled: true });
      
      setFormDataPairs(newPairs);
      setShowBulkEditModal(false);
      setBulkEditText('');
    } catch (error) {
      alert('Invalid format. Please use "key:value" format, one per line.');
    }
  };

  // Dark Mode Functions
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'light' : 'dark');
  };

  // Initialize dark mode from system preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }, []);



  return (
    <div className={`postman-request-builder ${darkMode ? 'dark-mode' : ''}`}>
      {/* Header with Dark Mode Toggle */}
      <div className="request-builder-header">
        <div className="header-title">
          <svg className="header-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L3.09 8.26L4 21L12 17.5L20 21L20.91 8.26L12 2Z"/>
          </svg>
          <h2>API Request Builder</h2>
        </div>
        <div className="header-controls">
          <button
            className="dark-mode-toggle"
            onClick={toggleDarkMode}
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          >
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 18C8.69 18 6 15.31 6 12S8.69 6 12 6 18 8.69 18 12 15.31 18 12 18ZM12 16C14.21 16 16 14.21 16 12S14.21 8 12 8 8 9.79 8 12 9.79 16 12 16ZM12 2L15.39 5.39L22 2V9.39L15.39 5.39L12 2ZM2 12L5.39 8.61L2 2V9.39L8.61 12L2 14.61V22L5.39 15.39L2 12ZM12 22L8.61 18.61L2 22H9.39L12 15.39L14.61 22H22L15.39 18.61L12 22Z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.75 4.09L15.22 6.03L16.13 9.09L13.5 7.28L10.87 9.09L11.78 6.03L9.25 4.09L12.44 4L13.5 1L14.56 4L17.75 4.09ZM21.25 11L19.61 12.25L20.2 14.23L18.5 13.06L16.8 14.23L17.39 12.25L15.75 11L17.81 10.95L18.5 9L19.19 10.95L21.25 11ZM18.97 15.95C19.8 15.87 20.69 17.05 20.16 17.8C19.84 18.25 19.5 18.67 19.08 19.07C15.17 23 8.84 23 4.94 19.07C1.03 15.17 1.03 8.83 4.94 4.93C5.34 4.53 5.76 4.17 6.21 3.85C6.96 3.32 8.14 4.21 8.06 5.04C7.79 7.9 8.75 10.87 10.95 13.06C13.14 15.26 16.1 16.22 18.97 15.95Z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

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
                      <div className="form-data-actions-header">
                        <button
                          className="bulk-edit-button"
                          onClick={openBulkEdit}
                          title="Bulk Edit (Postman-style)"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/>
                          </svg>
                          Bulk Edit
                        </button>
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
                            placeholder={pair.type === 'file' ? 'Choose file...' : 'Value'}
                            value={pair.type === 'file' ? '' : pair.value}
                            onChange={(e) => updateFormDataPair(index, 'value', pair.type === 'file' ? e : e.target.value)}
                            className="form-data-input"
                            accept={pair.type === 'file' ? '*/*' : undefined}
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

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="bulk-edit-modal-overlay">
          <div className="bulk-edit-modal">
            <div className="bulk-edit-header">
              <h3>Bulk Edit Key-Value Pairs</h3>
              <button
                className="modal-close-button"
                onClick={() => setShowBulkEditModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                </svg>
              </button>
            </div>
            <div className="bulk-edit-content">
              <div className="bulk-edit-instructions">
                <p>Enter key-value pairs in the format <code>key:value</code>, one per line.</p>
                <p>Example:</p>
                <pre>username:john.doe{'\n'}password:secret123{'\n'}email:john@example.com</pre>
              </div>
              <textarea
                className="bulk-edit-textarea"
                value={bulkEditText}
                onChange={(e) => setBulkEditText(e.target.value)}
                placeholder="key1:value1&#10;key2:value2&#10;key3:value3"
                rows={10}
              />
              <div className="bulk-edit-actions">
                <button
                  className="bulk-edit-cancel"
                  onClick={() => setShowBulkEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="bulk-edit-apply"
                  onClick={applyBulkEdit}
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {aiSuggestions.length > 0 ? (
          <div className="ai-suggestions">
            <div className="suggestions-header">
              <h5>✅ Found {aiSuggestions.length} Form{aiSuggestions.length !== 1 ? 's' : ''}</h5>
            </div>
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => applySuggestion(suggestion)}
              >
                <div className="suggestion-main">
                  <strong className="suggestion-method">{suggestion.method}</strong> 
                  <span className="suggestion-url">{suggestion.url}</span>
                </div>
                <div className="suggestion-details">
                  <small>{suggestion.description}</small>
                </div>
                {suggestion.csrfToken && (
                  <div className="suggestion-security">
                    <span className="security-badge">🔐 CSRF Protected</span>
                  </div>
                )}
                {suggestion.hasFileUploads && (
                  <div className="suggestion-files">
                    <span className="file-badge">📎 File Upload</span>
                  </div>
                )}
                {suggestion.isAjax && (
                  <div className="suggestion-ajax">
                    <span className="ajax-badge">⚡ AJAX Form</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !detectingForms && (
          <div className="no-suggestions">
            <p>🔍 No forms detected on current page</p>
            <small>Try navigating to a page with forms or contact forms</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernPostmanRequestBuilder;