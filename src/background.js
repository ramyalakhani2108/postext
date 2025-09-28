// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Postman Extension installed - AI features enabled');
});

// Listen for action button click
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel
  chrome.sidePanel.open({ tabId: tab.id });
});

// Handle messages from content script and sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidebar') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ success: true });
  } else if (request.action === 'sendRequest') {
    // Handle HTTP requests from the sidebar
    handleHttpRequest(request.requestData, request.apiKey)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ 
        error: true, 
        message: error.message,
        status: 0
      }));
    return true; // Will respond asynchronously
  } else if (request.type === 'AI_DETECT_FORMS') {
    // Handle AI form detection
    handleAIFormDetection(request.tabId, request.settings)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ 
        success: false, 
        error: true,
        message: error.message
      }));
    return true; // Will respond asynchronously
  } else if (request.type === 'HTTP_REQUEST') {
    // Handle HTTP requests with proper error handling
    handleHttpRequest(request.data)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ 
        error: true, 
        message: error.message,
        status: 0
      }));
    return true; // Will respond asynchronously
  }
});

// Function to handle HTTP requests
async function handleHttpRequest(requestData, apiKey = null) {
  try {
    const { method, url, headers, body, timeout = 30000 } = requestData;
    
    // If this is an OpenAI API request, ensure we have proper authorization
    const finalHeaders = { ...headers };
    if (url.includes('api.openai.com')) {
      // Use provided API key or check if already in headers
      if (apiKey && !finalHeaders['Authorization']) {
        finalHeaders['Authorization'] = `Bearer ${apiKey}`;
      } else if (!finalHeaders['Authorization'] && !finalHeaders['authorization']) {
        throw new Error('OpenAI API key is required for AI features. Please add your API key in Settings.');
      }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const fetchOptions = {
      method: method,
      headers: finalHeaders,
      signal: controller.signal
    };
    
    // Add body for methods that support it
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = body;
    }
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    // Get response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    // Get response data
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
      url: response.url
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    } else if (error.name === 'TypeError') {
      throw new Error('Network error or CORS issue');
    } else {
      throw new Error(error.message || 'Request failed');
    }
  }
}

// Function to handle AI form detection
async function handleAIFormDetection(tabId, settings) {
  try {
    console.log('Starting AI form detection for tab:', tabId);
    
    // Inject script to analyze forms on the page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: analyzePageForms
    });

    console.log('Script execution results:', results);

    if (!results || !results[0]) {
      throw new Error('Failed to analyze page forms - no results returned');
    }

    const formsData = results[0].result;
    console.log('Forms data received:', formsData);
    
    // Always ensure we have a valid structure
    if (!formsData) {
      console.log('No forms data returned, creating empty structure');
      const formsData = { forms: [], apiEndpoints: [] };
    }

    // Generate AI suggestions based on detected forms
    const suggestions = await generateAISuggestions(formsData, settings);
    console.log('Generated suggestions:', suggestions);
    
    const response = {
      success: true,
      suggestions: suggestions || [],
      formsDetected: (formsData.forms ? formsData.forms.length : 0),
      endpointsDetected: (formsData.apiEndpoints ? formsData.apiEndpoints.length : 0),
      message: suggestions.length > 0 ? `Found ${suggestions.length} suggestions` : 'No forms or API endpoints detected, but generated sample requests'
    };

    console.log('Final AI detection response:', response);
    return response;

  } catch (error) {
    console.error('AI Form Detection Error:', error);
    
    // Return a fallback response with sample suggestions
    const fallbackSuggestions = [
      {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        headers: [
          { key: 'Accept', value: 'application/json', enabled: true }
        ],
        params: [],
        body: '',
        description: 'Sample GET request - JSONPlaceholder API'
      }
    ];

    return {
      success: true,
      suggestions: fallbackSuggestions,
      formsDetected: 0,
      endpointsDetected: 0,
      message: 'AI detection had issues, but generated sample requests',
      error: error.message
    };
  }
}

// Function to analyze forms on the page (injected into content)
function analyzePageForms() {
  try {
    const forms = document.querySelectorAll('form');
    const inputs = document.querySelectorAll('input, select, textarea');
    const formsData = [];

    // Get current page URL
    const currentUrl = window.location.href;
    const baseUrl = window.location.origin;

    console.log(`Analyzing page: ${currentUrl}, found ${forms.length} forms, ${inputs.length} inputs`);

    forms.forEach((form, index) => {
      const formData = {
        index: index,
        action: form.action || currentUrl,
        method: (form.method || 'GET').toUpperCase(),
        fields: [],
        url: form.action ? (form.action.startsWith('http') ? form.action : baseUrl + form.action) : currentUrl
      };

      // Get all form fields
      const formInputs = form.querySelectorAll('input, select, textarea');
      formInputs.forEach(input => {
        if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'reset') {
          formData.fields.push({
            name: input.name || input.id || `field_${formData.fields.length}`,
            type: input.type || 'text',
            placeholder: input.placeholder || '',
            value: input.value || '',
            required: input.required || false
          });
        }
      });

      if (formData.fields.length > 0) {
        formsData.push(formData);
      }
    });

    // Also detect common API endpoints from links and buttons
    const apiLinks = [];
    const links = document.querySelectorAll('a[href*="api"], button[data-url], [data-endpoint], a[href*="/v1/"], a[href*="/api/"]');
    links.forEach(link => {
      const href = link.href || link.dataset.url || link.dataset.endpoint;
      if (href && (href.includes('api') || href.includes('/v1/') || href.includes('/api/'))) {
        apiLinks.push({
          url: href.startsWith('http') ? href : baseUrl + href,
          method: 'GET',
          text: link.textContent.trim().substring(0, 50)
        });
      }
    });

    // If no forms found, create some example suggestions based on the page
    if (formsData.length === 0 && apiLinks.length === 0) {
      // Look for common patterns
      const commonEndpoints = [
        { path: '/api/users', method: 'GET' },
        { path: '/api/data', method: 'GET' },
        { path: '/api/search', method: 'GET' },
        { path: '/graphql', method: 'POST' }
      ];

      commonEndpoints.forEach(endpoint => {
        apiLinks.push({
          url: baseUrl + endpoint.path,
          method: endpoint.method,
          text: `Common ${endpoint.method} endpoint`
        });
      });
    }

    return { forms: formsData, apiEndpoints: apiLinks };
  } catch (error) {
    console.error('Error analyzing forms:', error);
    return { forms: [], apiEndpoints: [] };
  }
}

// Enterprise-level form suggestion generator (10+ years Postman experience)
function createEnterpriseFormSuggestion(form, index) {
  console.log('Creating enterprise suggestion for form:', form);
  
  // Determine the optimal request format based on form analysis
  const requestFormat = analyzeFormFormat(form);
  const suggestion = {
    method: form.method || 'POST',
    url: form.url || form.action,
    headers: buildEnterpriseHeaders(form, requestFormat),
    params: [],
    body: '',
    formData: [], // For form-data interface
    description: `${form.formContext?.isModal ? 'Modal ' : ''}Form ${index + 1}: ${form.fields.length + form.hiddenFields.length} fields (${form.hiddenFields.length} hidden)`,
    hasFileUploads: form.formContext?.hasFileUpload || false,
    isAjax: form.formContext?.isAjax || false,
    csrfToken: form.csrfToken
  };

  // Build the request based on format
  if (requestFormat === 'form-data') {
    suggestion.formData = buildFormDataPairs(form);
    suggestion.body = buildFormDataBody(form); // JSON representation for display
  } else if (requestFormat === 'x-www-form-urlencoded') {
    suggestion.body = buildUrlEncodedBody(form);
  } else if (requestFormat === 'json') {
    suggestion.body = buildJsonBody(form);
  }

  // Add cookies if available
  if (form.cookies) {
    suggestion.headers.push({
      key: 'Cookie',
      value: form.cookies,
      enabled: true
    });
  }

  return suggestion;
}

// Analyze form to determine optimal request format
function analyzeFormFormat(form) {
  // File uploads always require multipart/form-data
  if (form.formContext?.hasFileUpload) {
    return 'form-data';
  }

  // Check enctype
  if (form.enctype === 'multipart/form-data') {
    return 'form-data';
  }

  // AJAX forms often use JSON
  if (form.formContext?.isAjax) {
    // Check if form has complex nested data structures
    const hasComplexFields = form.fields.some(field => 
      field.name.includes('[') || 
      field.name.includes('.')
    );
    
    if (hasComplexFields) {
      return 'json';
    }
  }

  // Default to URL-encoded for standard forms
  return 'x-www-form-urlencoded';
}

// Build enterprise-level headers
function buildEnterpriseHeaders(form, requestFormat) {
  const headers = [];

  // Set Content-Type based on format
  if (requestFormat === 'form-data') {
    headers.push({ key: 'Content-Type', value: 'multipart/form-data', enabled: true });
  } else if (requestFormat === 'json') {
    headers.push({ key: 'Content-Type', value: 'application/json', enabled: true });
  } else {
    headers.push({ key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true });
  }

  // Add enterprise headers from form context
  if (form.requiredHeaders) {
    Object.entries(form.requiredHeaders).forEach(([key, value]) => {
      if (key !== 'Content-Type') { // Don't duplicate Content-Type
        headers.push({ key, value, enabled: true });
      }
    });
  }

  // Add CSRF token to headers if found in meta tags
  if (form.csrfToken && form.csrfToken.value) {
    headers.push({
      key: 'X-CSRF-TOKEN',
      value: form.csrfToken.value,
      enabled: true
    });
  }

  return headers;
}

// Build form-data pairs for the UI
function buildFormDataPairs(form) {
  const pairs = [];

  // Add hidden fields first (including CSRF)
  form.hiddenFields.forEach(field => {
    pairs.push({
      key: field.name,
      value: field.value || generateSampleValue(field.type, field.name),
      type: 'text',
      enabled: true
    });
  });

  // Add visible fields
  form.fields.forEach(field => {
    pairs.push({
      key: field.name,
      value: field.value || generateSampleValue(field.type, field.name),
      type: field.type === 'file' ? 'file' : 'text',
      enabled: true
    });
  });

  // Add empty pair for user additions
  pairs.push({ key: '', value: '', type: 'text', enabled: true });

  return pairs;
}

// Build form-data body (JSON representation for display)
function buildFormDataBody(form) {
  const formDataObj = {};
  
  // Include hidden fields
  form.hiddenFields.forEach(field => {
    formDataObj[field.name] = {
      value: field.value || generateSampleValue(field.type, field.name),
      type: 'hidden'
    };
  });

  // Include visible fields
  form.fields.forEach(field => {
    formDataObj[field.name] = {
      value: field.value || generateSampleValue(field.type, field.name),
      type: field.type
    };
  });

  return JSON.stringify(formDataObj, null, 2);
}

// Build URL-encoded body
function buildUrlEncodedBody(form) {
  const params = [];

  // Include hidden fields (especially CSRF)
  form.hiddenFields.forEach(field => {
    const value = field.value || generateSampleValue(field.type, field.name);
    params.push(`${encodeURIComponent(field.name)}=${encodeURIComponent(value)}`);
  });

  // Include visible fields
  form.fields.forEach(field => {
    const value = field.value || generateSampleValue(field.type, field.name);
    params.push(`${encodeURIComponent(field.name)}=${encodeURIComponent(value)}`);
  });

  return params.join('&');
}

// Build JSON body
function buildJsonBody(form) {
  const jsonData = {};

  // Include hidden fields
  form.hiddenFields.forEach(field => {
    jsonData[field.name] = field.value || generateSampleValue(field.type, field.name);
  });

  // Include visible fields with smart type conversion
  form.fields.forEach(field => {
    let value = field.value || generateSampleValue(field.type, field.name);
    
    // Smart type conversion for JSON
    if (field.type === 'number' || field.type === 'range') {
      value = parseFloat(value) || 0;
    } else if (field.type === 'checkbox') {
      value = field.value === 'on' || field.value === 'true';
    } else if (field.name.includes('[') && field.name.includes(']')) {
      // Handle array fields
      const arrayName = field.name.substring(0, field.name.indexOf('['));
      if (!jsonData[arrayName]) jsonData[arrayName] = [];
      jsonData[arrayName].push(value);
      return; // Skip normal assignment
    }
    
    jsonData[field.name] = value;
  });

  return JSON.stringify(jsonData, null, 2);
}

async function generateAISuggestions(formsData, settings) {
  const suggestions = [];

  try {
    console.log('Generating enterprise-level AI suggestions from:', formsData);

    // Process detected forms with enterprise context
    if (formsData.forms && formsData.forms.length > 0) {
      formsData.forms.forEach((form, index) => {
        const suggestion = createEnterpriseFormSuggestion(form, index);
        suggestions.push(suggestion);
      });
    }

    // Process detected API endpoints
    if (formsData.apiEndpoints && formsData.apiEndpoints.length > 0) {
      formsData.apiEndpoints.forEach((endpoint, index) => {
        const suggestion = {
          method: endpoint.method || 'GET',
          url: endpoint.url,
          headers: [
            { key: 'Accept', value: 'application/json', enabled: true }
          ],
          params: [],
          body: '',
          description: `API Endpoint: ${endpoint.text || `Endpoint ${index + 1}`}`
        };

        // Add common query parameters for GET requests
        if (suggestion.method === 'GET') {
          suggestion.params = [
            { key: 'page', value: '1', enabled: false },
            { key: 'limit', value: '10', enabled: false },
            { key: 'search', value: '', enabled: false }
          ];
        }

        // Add sample body for POST requests
        if (suggestion.method === 'POST') {
          suggestion.headers.push({ key: 'Content-Type', value: 'application/json', enabled: true });
          suggestion.body = JSON.stringify({
            "name": "Sample Name",
            "email": "sample@example.com"
          }, null, 2);
        }

        suggestions.push(suggestion);
      });
    }

    // Add some intelligent suggestions based on common patterns if nothing found
    if (suggestions.length === 0) {
      suggestions.push({
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: [
          { key: 'Accept', value: 'application/json', enabled: true }
        ],
        params: [],
        body: '',
        description: 'Sample API - Get all posts'
      });

      suggestions.push({
        method: 'POST',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true },
          { key: 'Accept', value: 'application/json', enabled: true }
        ],
        params: [],
        body: JSON.stringify({
          "title": "Sample Post",
          "body": "This is a sample post",
          "userId": 1
        }, null, 2),
        description: 'Sample API - Create new post'
      });
    }

    console.log(`Generated ${suggestions.length} suggestions`);
    return suggestions.slice(0, 5); // Limit to 5 suggestions

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return [];
  }
}

// Helper function to generate sample values based on field type and name
function generateSampleValue(type, name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('email')) return 'user@example.com';
  if (lowerName.includes('name')) return 'John Doe';
  if (lowerName.includes('phone')) return '+1234567890';
  if (lowerName.includes('age')) return '25';
  if (lowerName.includes('url') || lowerName.includes('website')) return 'https://example.com';
  if (lowerName.includes('password')) return 'SecurePassword123';
  if (lowerName.includes('username')) return 'johndoe';
  if (lowerName.includes('id')) return '12345';
  if (lowerName.includes('date')) return '2024-01-01';
  if (lowerName.includes('time')) return '12:00:00';
  
  switch (type) {
    case 'email': return 'user@example.com';
    case 'password': return 'SecurePassword123';
    case 'tel': return '+1234567890';
    case 'url': return 'https://example.com';
    case 'number': return '42';
    case 'date': return '2024-01-01';
    case 'time': return '12:00:00';
    case 'datetime-local': return '2024-01-01T12:00';
    case 'color': return '#ff0000';
    case 'range': return '50';
    case 'search': return 'search query';
    default: return 'sample value';
  }
}