import React, { useState, useEffect } from 'react';
import './ModernPostmanBuilder.css';

const PostmanRequestBuilder = ({ request, onRequestChange, onSendRequest, loading, settings }) => {
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showManualAI, setShowManualAI] = useState(false);
  const [analyzingPage, setAnalyzingPage] = useState(false);
  const [activeBodyTab, setActiveBodyTab] = useState('json');
  const [activeParamsTab, setActiveParamsTab] = useState('query');
  const [urlParams, setUrlParams] = useState([{ key: '', value: '', enabled: true }]);
  const [pathParams, setPathParams] = useState([{ key: '', value: '', enabled: true }]);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const handleMethodChange = (method) => {
    onRequestChange({ ...request, method });
  };

  const handleUrlChange = (url) => {
    onRequestChange({ ...request, url });
  };

  const handleHeaderChange = (key, value, index) => {
    const newHeaders = { ...request.headers };
    const headerEntries = Object.entries(newHeaders);
    
    if (index < headerEntries.length) {
      // Update existing header
      const oldKey = headerEntries[index][0];
      delete newHeaders[oldKey];
      if (key && value) {
        newHeaders[key] = value;
      }
    } else {
      // Add new header
      if (key && value) {
        newHeaders[key] = value;
      }
    }
    
    onRequestChange({ ...request, headers: newHeaders });
  };

  const addHeader = () => {
    // This will be handled by the UI showing an empty row
  };

  const removeHeader = (key) => {
    const newHeaders = { ...request.headers };
    delete newHeaders[key];
    onRequestChange({ ...request, headers: newHeaders });
  };

  const handleBodyChange = (body) => {
    onRequestChange({ ...request, body });
  };

  const handleUrlParamChange = (index, field, value) => {
    const newParams = [...urlParams];
    newParams[index][field] = value;
    setUrlParams(newParams);
    
    // Update URL with query params
    if (field === 'key' || field === 'value') {
      updateUrlWithParams(newParams);
    }
  };

  const updateUrlWithParams = (params) => {
    const baseUrl = request.url.split('?')[0];
    const validParams = params.filter(p => p.key && p.value && p.enabled);
    
    if (validParams.length > 0) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      onRequestChange({ ...request, url: `${baseUrl}?${queryString}` });
    } else {
      onRequestChange({ ...request, url: baseUrl });
    }
  };

  const addUrlParam = () => {
    setUrlParams([...urlParams, { key: '', value: '', enabled: true }]);
  };

  const removeUrlParam = (index) => {
    const newParams = urlParams.filter((_, i) => i !== index);
    setUrlParams(newParams);
    updateUrlWithParams(newParams);
  };

  const formatJson = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(request.body), null, 2);
      handleBodyChange(formatted);
    } catch (e) {
      alert('Invalid JSON format');
    }
  };

  // AI Functions (simplified)
  const handleFormDetection = async () => {
    setAnalyzingPage(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: analyzePageForms
      });
      
      const pageData = results[0].result;
      if (!pageData.forms.length && !pageData.inputs.length) {
        alert('No forms detected on this page.');
        return;
      }

      await generateRequestFromPageData(pageData, tab);
    } catch (error) {
      alert('Form detection failed: ' + error.message);
    } finally {
      setAnalyzingPage(false);
    }
  };

  const generateRequestFromPageData = async (pageData, tab) => {
    try {
      const prompt = `Analyze this webpage and generate an API request:
PAGE: ${tab.title}
URL: ${tab.url}
FORMS: ${pageData.forms.map(f => `Action: ${f.action}, Fields: ${f.fields.join(', ')}`).join('; ')}
INPUTS: ${pageData.inputs.map(i => `${i.name}: ${i.type}`).join(', ')}

Generate JSON with: method, url, headers, body`;

      const aiRequest = {
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Generate API requests from webpage analysis. Return only JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.3
        })
      };

      const response = await chrome.runtime.sendMessage({
        action: 'sendRequest',
        requestData: aiRequest,
        apiKey: settings.openaiApiKey
      });

      if (response.data?.choices?.[0]) {
        const content = response.data.choices[0].message.content.trim();
        const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const aiSuggestion = JSON.parse(jsonContent);
        
        onRequestChange({
          ...request,
          method: aiSuggestion.method || 'POST',
          url: aiSuggestion.url || '',
          headers: { ...request.headers, ...aiSuggestion.headers },
          body: typeof aiSuggestion.body === 'string' ? aiSuggestion.body : JSON.stringify(aiSuggestion.body, null, 2)
        });
        
        setShowAI(false);
        alert('🎉 API request generated from page!');
      }
    } catch (error) {
      alert('AI generation failed: ' + error.message);
    }
  };

  const analyzePageForms = () => {
    const forms = Array.from(document.querySelectorAll('form')).map(form => ({
      action: form.action,
      method: form.method,
      fields: Array.from(form.querySelectorAll('input, select, textarea')).map(input => 
        input.name || input.id || input.placeholder || input.type
      ).filter(Boolean)
    }));

    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(input => ({
      name: input.name || input.id,
      type: input.type || 'text',
      placeholder: input.placeholder,
      value: input.value
    })).filter(input => input.name);

    return { forms, inputs };
  };

  const presetRequests = [
    {
      name: '📝 OpenAI Models',
      config: {
        method: 'GET',
        url: 'https://api.openai.com/v1/models',
        headers: { 'Authorization': `Bearer ${settings.openaiApiKey}` }
      }
    },
    {
      name: '🤖 Chat GPT',
      config: {
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiApiKey}` 
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello!' }],
          max_tokens: 150
        }, null, 2)
      }
    },
    {
      name: '🔍 Test API',
      config: {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: { 'Content-Type': 'application/json' }
      }
    }
  ];

  // Get headers as array for editing
  const headerEntries = Object.entries(request.headers || {});
  const allHeaders = [...headerEntries, ['', '']]; // Always show one empty row

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
      </div>      {/* Request Configuration Tabs */}
      <div className="request-tabs">
        <div className="tab-navigation">
          <button 
            className={`tab ${activeParamsTab === 'query' ? 'active' : ''}`}
            onClick={() => setActiveParamsTab('query')}
          >
            Params
          </button>
          <button 
            className={`tab ${activeParamsTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveParamsTab('headers')}
          >
            Headers ({Object.keys(request.headers || {}).length})
          </button>
          {['POST', 'PUT', 'PATCH'].includes(request.method) && (
            <button 
              className={`tab ${activeParamsTab === 'body' ? 'active' : ''}`}
              onClick={() => setActiveParamsTab('body')}
            >
              Body
            </button>
          )}
        </div>

        <div className="tab-content">
          {/* Query Parameters */}
          {activeParamsTab === 'query' && (
            <div className="params-section">
              <div className="params-header">
                <span>Query Parameters</span>
                <button className="add-param-btn" onClick={addUrlParam}>+ Add</button>
              </div>
              <div className="params-list">
                <div className="param-row header-row">
                  <span>Key</span>
                  <span>Value</span>
                  <span>Actions</span>
                </div>
                {urlParams.map((param, index) => (
                  <div key={index} className="param-row">
                    <input
                      type="text"
                      placeholder="Parameter name"
                      value={param.key}
                      onChange={(e) => handleUrlParamChange(index, 'key', e.target.value)}
                      className="param-input"
                    />
                    <input
                      type="text"
                      placeholder="Parameter value"
                      value={param.value}
                      onChange={(e) => handleUrlParamChange(index, 'value', e.target.value)}
                      className="param-input"
                    />
                    <div className="param-actions">
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={(e) => handleUrlParamChange(index, 'enabled', e.target.checked)}
                      />
                      <button 
                        className="remove-param-btn"
                        onClick={() => removeUrlParam(index)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Headers */}
          {activeParamsTab === 'headers' && (
            <div className="headers-section">
              <div className="headers-header">
                <span>Headers</span>
                <button className="add-header-btn" onClick={addHeader}>+ Add</button>
              </div>
              <div className="headers-list">
                <div className="header-row header-header">
                  <span>Key</span>
                  <span>Value</span>
                  <span>Actions</span>
                </div>
                {allHeaders.map(([key, value], index) => (
                  <div key={index} className="header-row">
                    <input
                      type="text"
                      placeholder="Header name (e.g., Content-Type)"
                      value={key}
                      onChange={(e) => handleHeaderChange(e.target.value, value, index)}
                      className="header-input"
                    />
                    <input
                      type="text"
                      placeholder="Header value (e.g., application/json)"
                      value={value}
                      onChange={(e) => handleHeaderChange(key, e.target.value, index)}
                      className="header-input"
                    />
                    <div className="header-actions">
                      {key && (
                        <button 
                          className="remove-header-btn"
                          onClick={() => removeHeader(key)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          {activeParamsTab === 'body' && ['POST', 'PUT', 'PATCH'].includes(request.method) && (
            <div className="body-section">
              <div className="body-tabs">
                <button 
                  className={`body-tab ${activeBodyTab === 'json' ? 'active' : ''}`}
                  onClick={() => setActiveBodyTab('json')}
                >
                  JSON
                </button>
                <button 
                  className={`body-tab ${activeBodyTab === 'raw' ? 'active' : ''}`}
                  onClick={() => setActiveBodyTab('raw')}
                >
                  Raw
                </button>
                <button 
                  className={`body-tab ${activeBodyTab === 'form' ? 'active' : ''}`}
                  onClick={() => setActiveBodyTab('form')}
                >
                  Form Data
                </button>
              </div>
              
              <div className="body-content">
                {activeBodyTab === 'json' && (
                  <div className="json-body">
                    <div className="body-controls">
                      <button className="format-json-btn" onClick={formatJson}>
                        🎨 Format JSON
                      </button>
                      <span className="body-type">JSON</span>
                    </div>
                    <textarea
                      className="body-textarea json-textarea"
                      placeholder={`{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello World"
}`}
                      value={request.body}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      rows="12"
                    />
                  </div>
                )}
                
                {activeBodyTab === 'raw' && (
                  <div className="raw-body">
                    <div className="body-controls">
                      <select className="content-type-select">
                        <option value="text">Text</option>
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="html">HTML</option>
                      </select>
                    </div>
                    <textarea
                      className="body-textarea raw-textarea"
                      placeholder="Enter raw body content..."
                      value={request.body}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      rows="12"
                    />
                  </div>
                )}
                
                {activeBodyTab === 'form' && (
                  <div className="form-body">
                    <div className="form-data-list">
                      <div className="form-row header-row">
                        <span>Key</span>
                        <span>Value</span>
                        <span>Type</span>
                        <span>Actions</span>
                      </div>
                      <div className="form-row">
                        <input type="text" placeholder="field name" className="form-input" />
                        <input type="text" placeholder="field value" className="form-input" />
                        <select className="form-type-select">
                          <option value="text">Text</option>
                          <option value="file">File</option>
                        </select>
                        <button className="remove-form-btn">✕</button>
                      </div>
                    </div>
                    <button className="add-form-btn">+ Add Field</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostmanRequestBuilder;