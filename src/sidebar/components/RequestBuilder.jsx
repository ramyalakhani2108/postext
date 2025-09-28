import React, { useState } from 'react';

const RequestBuilder = ({ request, onRequestChange, onSendRequest, loading, settings }) => {
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showManualAI, setShowManualAI] = useState(false);
  const [analyzingPage, setAnalyzingPage] = useState(false);
  const [activeBodyTab, setActiveBodyTab] = useState('json');
  const [activeParamsTab, setActiveParamsTab] = useState('query');

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const handleMethodChange = (method) => {
    onRequestChange({ ...request, method });
  };

  const handleUrlChange = (url) => {
    onRequestChange({ ...request, url });
  };

  const handleHeaderChange = (key, value) => {
    const newHeaders = { ...request.headers };
    if (value === '') {
      delete newHeaders[key];
    } else {
      newHeaders[key] = value;
    }
    onRequestChange({ ...request, headers: newHeaders });
  };

  const addHeader = () => {
    const newHeaders = { ...request.headers, '': '' };
    onRequestChange({ ...request, headers: newHeaders });
  };

  const handleBodyChange = (body) => {
    onRequestChange({ ...request, body });
  };

  const handleFormDetection = async () => {
    setAnalyzingPage(true);
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject script to analyze page forms
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: analyzePageForms
      });
      
      const pageData = results[0].result;
      
      if (!pageData.forms.length && !pageData.inputs.length) {
        alert('No forms detected on this page. Try the manual description option instead.');
        setAnalyzingPage(false);
        return;
      }

      // Send page data to AI for analysis
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

PAGE TITLE: ${tab.title}
URL: ${tab.url}

FORMS DETECTED:
${pageData.forms.map(form => `
- Action: ${form.action || 'Not specified'}
- Method: ${form.method || 'GET'}
- Fields: ${form.fields.join(', ')}
`).join('')}

INPUT FIELDS:
${pageData.inputs.map(input => `- ${input.name}: ${input.type} (${input.placeholder || 'no placeholder'})`).join('\n')}

PAGE CONTEXT:
${pageData.context}

Generate a complete API request configuration that would work with this form/page. Return ONLY valid JSON with: method, url, headers, and body fields. The URL should be a realistic API endpoint based on the page content.`;

      const aiRequest = {
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert API developer. Analyze webpage forms and generate realistic API requests. Always return valid JSON with method, url, headers, and body fields.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.3
        })
      };

      const response = await chrome.runtime.sendMessage({
        action: 'sendRequest',
        requestData: aiRequest
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        try {
          const content = response.data.choices[0].message.content.trim();
          // Remove code blocks if present
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
          alert('🎉 API request generated from page analysis!');
        } catch (parseError) {
          alert('Could not parse AI response. Please try manual description instead.');
        }
      } else if (response.error) {
        alert(`❌ AI request failed: ${response.message}`);
      }
    } catch (error) {
      alert('AI analysis failed: ' + error.message);
    }
  };

  const handleAIAssist = async () => {
    try {
      const aiRequest = {
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an API expert. Help create API requests based on user descriptions. Return only valid JSON with method, url, headers, and body fields.'
            },
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      };

      const response = await chrome.runtime.sendMessage({
        action: 'sendRequest',
        requestData: aiRequest,
        apiKey: settings.openaiApiKey
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        try {
          const content = response.data.choices[0].message.content.trim();
          const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          const aiSuggestion = JSON.parse(jsonContent);
          
          onRequestChange({
            ...request,
            method: aiSuggestion.method || request.method,
            url: aiSuggestion.url || request.url,
            headers: { ...request.headers, ...aiSuggestion.headers },
            body: typeof aiSuggestion.body === 'string' ? aiSuggestion.body : JSON.stringify(aiSuggestion.body, null, 2)
          });
          
          setShowAI(false);
          setShowManualAI(false);
          setAiPrompt('');
          alert('🎉 API request generated successfully!');
        } catch (parseError) {
          alert('AI response format error. Please try rephrasing your request.');
        }
      }
    } catch (error) {
      alert('AI assist failed: ' + error.message);
    }
  };

  // Function to be injected into the page
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

    // Get page context
    const title = document.title;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent).slice(0, 5);
    const bodyText = document.body.innerText.substring(0, 500);

    return {
      forms,
      inputs,
      context: `Title: ${title}\nHeadings: ${headings.join(', ')}\nContent: ${bodyText}`
    };
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
      name: '🤖 Chat Completion',
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
      name: '🔍 JSONPlaceholder Posts',
      config: {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: { 'Content-Type': 'application/json' }
      }
    }
  ];

  return (
    <div className="postman-request-builder">
      {/* Header */}
      <div className="postman-header">
        <h3>🚀 Request Builder</h3>
        <div className="preset-buttons">
          {presetRequests.map((preset, index) => (
            <button
              key={index}
              className="preset-btn"
              onClick={() => onRequestChange({ ...request, ...preset.config })}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* URL Section - Postman Style */}
      <div className="postman-url-section">
        <div className="url-bar">
          <select
            className="method-select"
            value={request.method}
            onChange={(e) => handleMethodChange(e.target.value)}
          >
            {methods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <input
            type="text"
            className="url-input"
            placeholder="Enter request URL (e.g., https://api.example.com/users)"
            value={request.url}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          <button
            className={`send-btn ${loading ? 'loading' : ''}`}
            onClick={() => onSendRequest(request)}
            disabled={loading || !request.url}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Send
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
        <button
          className="ai-assist-btn"
          onClick={() => setShowAI(!showAI)}
          title="AI Form Detection"
        >
          🤖 AI Generate
        </button>
      </div>

        {/* AI Assist Panel */}
        {showAI && (
          <div className="ai-panel">
            <div className="ai-options">
              <button className="ai-option-btn" onClick={handleFormDetection}>
                🔍 Generate from Current Page
              </button>
              <button className="ai-option-btn" onClick={() => setShowManualAI(true)}>
                ✍️ Describe Manually
              </button>
            </div>
            
            {showManualAI && (
              <>
                <textarea
                  className="ai-input"
                  placeholder="Describe the API request you want to make... (e.g., 'Create a POST request to add a new user with name and email')"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows="3"
                />
                <button className="ai-generate-btn" onClick={handleAIAssist}>
                  ✨ Generate Request
                </button>
              </>
            )}
          </div>
        )}

        {/* Headers */}
        <div className="headers-section">
          <div className="section-header">
            <h4>📋 Headers</h4>
            <button className="add-btn" onClick={addHeader}>+ Add Header</button>
          </div>
          <div className="headers-list">
            {Object.entries(request.headers).map(([key, value], index) => (
              <div key={index} className="header-row">
                <input
                  type="text"
                  placeholder="Header name"
                  value={key}
                  onChange={(e) => {
                    const newHeaders = { ...request.headers };
                    delete newHeaders[key];
                    if (e.target.value) {
                      newHeaders[e.target.value] = value;
                    }
                    onRequestChange({ ...request, headers: newHeaders });
                  }}
                />
                <input
                  type="text"
                  placeholder="Header value"
                  value={value}
                  onChange={(e) => handleHeaderChange(key, e.target.value)}
                />
                <button
                  className="remove-btn"
                  onClick={() => handleHeaderChange(key, '')}
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        {['POST', 'PUT', 'PATCH'].includes(request.method) && (
          <div className="body-section">
            <h4>📝 Request Body</h4>
            <div className="body-controls">
              <button
                className="format-btn"
                onClick={() => {
                  try {
                    const formatted = JSON.stringify(JSON.parse(request.body), null, 2);
                    handleBodyChange(formatted);
                  } catch (e) {
                    alert('Invalid JSON format');
                  }
                }}
              >
                🎨 Format JSON
              </button>
            </div>
            <textarea
              className="body-input"
              placeholder="Enter request body (JSON, XML, text, etc.)"
              value={request.body}
              onChange={(e) => handleBodyChange(e.target.value)}
              rows="8"
            />
          </div>
        )}

        {/* Page Analysis Section */}
        <div className="page-analysis-section">
          <h4>🔍 Smart Page Analysis</h4>
          <div className="analysis-buttons">
            <button
              className="analysis-btn"
              onClick={handleFormDetection}
              disabled={analyzingPage}
            >
              {analyzingPage ? (
                <>
                  <div className="spinner-small"></div>
                  Analyzing...
                </>
              ) : (
                <>🤖 Generate from Current Page</>
              )}
            </button>
            <button
              className="analysis-btn secondary"
              onClick={async () => {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tab.id, { action: 'highlightForms' });
              }}
            >
              👁️ Show Forms on Page
            </button>
          </div>
          <small className="analysis-help">
            Click "Generate from Current Page" to automatically detect forms and create API requests, 
            or "Show Forms" to highlight detectable elements on the current webpage.
          </small>
        </div>

        {/* Send Button */}
        <div className="send-section">
          <button
            className={`send-btn ${loading ? 'loading' : ''}`}
            onClick={() => onSendRequest(request)}
            disabled={loading || !request.url}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Sending...
              </>
            ) : (
              <>🚀 Send Request</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestBuilder;