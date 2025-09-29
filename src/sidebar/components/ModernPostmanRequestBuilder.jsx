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
  
  // Resizable panel state
  const [aiPanelHeight, setAiPanelHeight] = useState(200); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);

  // Initialize empty arrays if not provided, handle both array and object formats
  // Ensure params always returns an array and preserves the original structure
  const params = Array.isArray(request.params) ? request.params : [];
  const headers = Array.isArray(request.headers) 
    ? request.headers 
    : request.headers 
      ? Object.entries(request.headers).map(([key, value]) => ({ key, value, enabled: true }))
      : [];

  // Sync formDataPairs with request.formData when request changes
  useEffect(() => {
    if (request.formData && request.formData.length > 0) {
      // Restore form data from request
      const restoredPairs = [...request.formData];
      // Always ensure there's an empty pair at the end for adding new entries
      if (restoredPairs.length === 0 || restoredPairs[restoredPairs.length - 1].key !== '') {
        restoredPairs.push({ key: '', value: '', type: 'text', enabled: true });
      }
      setFormDataPairs(restoredPairs);
    }
  }, [request.formData]);

  // Sync bodyType with request
  useEffect(() => {
    if (request.bodyType) {
      setBodyType(request.bodyType);
    }
  }, [request.bodyType]);

  useEffect(() => {
    // Parse URL parameters when URL changes, but only if we don't already have parameters
    // This prevents clearing manually added parameters when switching tabs
    if (request.url && (!request.params || request.params.length === 0)) {
      try {
        const url = new URL(request.url);
        const urlParams = Array.from(url.searchParams.entries()).map(([key, value]) => ({
          key,
          value,
          enabled: true
        }));
        
        if (urlParams.length > 0) {
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

    // Prepare headers array for background script
    const headersForRequest = Array.isArray(headers) 
      ? headers.filter(h => h.enabled && h.key).reduce((acc, header) => {
          acc[header.key] = header.value;
          return acc;
        }, {})
      : headers || {};

    const requestData = {
      ...request,
      url: finalUrl,
      headers: headersForRequest,
      params: params.filter(p => p.enabled && p.key),
      formData: formDataPairs?.filter(pair => pair.enabled && pair.key) || [],
      bodyType: bodyType
    };

    // Update the current request state to preserve parameters for when user returns to request tab
    updateRequest({ 
      params: params, // Keep all params, not just enabled ones
      formData: formDataPairs,
      bodyType: bodyType
    });

    console.log('Sending request with data:', requestData);
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
    const currentHeaders = Array.isArray(headers) ? headers : [];
    updateRequest({ 
      headers: [...currentHeaders, { key: '', value: '', enabled: true }] 
    });
  };

  const updateHeader = (index, field, value) => {
    const currentHeaders = Array.isArray(headers) ? headers : [];
    const newHeaders = [...currentHeaders];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateRequest({ headers: newHeaders });
  };

  const removeHeader = (index) => {
    const currentHeaders = Array.isArray(headers) ? headers : [];
    const newHeaders = currentHeaders.filter((_, i) => i !== index);
    updateRequest({ headers: newHeaders });
  };

  // Reset/Clear functionality
  const handleResetRequest = () => {
    if (window.confirm('Are you sure you want to clear all request data? This action cannot be undone.')) {
      setFormDataPairs([{ key: '', value: '', type: 'text', enabled: true }]);
      updateRequest({
        method: 'GET',
        url: '',
        headers: [],
        body: '',
        params: [],
        formData: [],
        bodyType: 'json'
      });
      setBodyType('json');
      setActiveTab('params');
    }
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
        newPairs[index] = { 
          ...newPairs[index], 
          value: file.name, 
          file: file,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };
      }
    } else {
      newPairs[index] = { ...newPairs[index], [field]: value };
    }
    
    // Auto-add new empty row when the last row is filled
    if (index === formDataPairs.length - 1 && newPairs[index].key && (newPairs[index].value || newPairs[index].file)) {
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
        if (pair.key) urlencoded.append(pair.key, pair.value || '');
      });
      updateRequest({ 
        body: urlencoded.toString(),
        formData: enabledPairs,
        bodyType: 'x-www-form-urlencoded'
      });
      
      // Update or add Content-Type header
      const currentHeaders = Array.isArray(request.headers) ? request.headers : [];
      const headers = [...currentHeaders];
      const contentTypeIndex = headers.findIndex(h => h.key?.toLowerCase() === 'content-type');
      
      if (contentTypeIndex >= 0) {
        headers[contentTypeIndex] = { key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true };
      } else {
        headers.push({ key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true });
      }
      
      updateRequest({ headers });
    } else if (bodyType === 'form-data') {
      // For form-data, store the pairs directly for background script processing
      // Also create a display version for the textarea
      const formDataObj = {};
      enabledPairs.forEach(pair => {
        if (pair.key) {
          if (pair.type === 'file') {
            formDataObj[pair.key] = { 
              value: pair.value || '[File selected]', 
              type: 'file',
              fileName: pair.file?.name || pair.value
            };
          } else {
            formDataObj[pair.key] = { 
              value: pair.value || '', 
              type: 'text' 
            };
          }
        }
      });
      
      updateRequest({ 
        body: JSON.stringify(formDataObj, null, 2),
        formData: enabledPairs,
        bodyType: 'form-data'
      });
      
      // Remove Content-Type header for multipart/form-data - browser will set boundary
      const currentHeaders = Array.isArray(request.headers) ? request.headers : [];
      const filteredHeaders = currentHeaders.filter(h => h.key?.toLowerCase() !== 'content-type');
      
      updateRequest({ headers: filteredHeaders });
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

  // Resize handling functions
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const container = document.querySelector('.postman-request-builder');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    
    // Set minimum and maximum heights
    const minHeight = 120;
    const maxHeight = containerRect.height * 0.6; // Max 60% of container height
    
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    setAiPanelHeight(clampedHeight);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add global mouse events for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  // Toggle AI panel collapse
  const toggleAiPanel = () => {
    setAiPanelCollapsed(!aiPanelCollapsed);
  };

  // Save documentation for current request
  const handleSaveDocumentation = async () => {
    try {
      const currentRequestData = {
        method: request.method,
        url: request.url,
        headers: headers,
        params: params,
        body: request.body,
        formData: formDataPairs?.filter(pair => pair.enabled && pair.key) || [],
        bodyType: bodyType,
        timestamp: new Date().toISOString()
      };

      const documentation = await generateAPIDocumentation(currentRequestData);
      downloadDocumentation(documentation, currentRequestData);
    } catch (error) {
      console.error('Failed to generate documentation:', error);
      alert('Failed to generate documentation. Please try again.');
    }
  };

  const generateAPIDocumentation = async (requestData) => {
    // Generate professional documentation locally without external API calls
    return generateLocalAPIDocumentation(requestData);
  };

  const generateLocalAPIDocumentation = (requestData) => {
    const { method, url, headers, params, body, formData, bodyType } = requestData;
    
    // Parse URL to get useful information
    let urlInfo;
    try {
      urlInfo = new URL(url);
    } catch (e) {
      urlInfo = { hostname: 'unknown', pathname: url, search: '' };
    }

    const endpointName = urlInfo.pathname.split('/').pop() || 'endpoint';
    const serviceName = urlInfo.hostname.replace('api.', '').replace('.com', '').replace('.org', '').replace('.net', '');

    const documentation = `# ${method} ${endpointName} API Documentation

## Endpoint Overview
- **URL**: \`${url}\`
- **Method**: \`${method}\`
- **Service**: ${serviceName}
- **Content Type**: ${getContentTypeFromHeaders(headers) || getContentTypeFromBodyType(bodyType)}

## Description
${generateEndpointDescription(method, endpointName, url)}

## Request Format

### URL Structure
\`\`\`
${method} ${url}
\`\`\`

### Headers
${generateHeadersDocumentation(headers)}

### Query Parameters
${generateParametersDocumentation(params)}

### Request Body
${generateBodyDocumentation(body, formData, bodyType)}

## Code Examples

### cURL
\`\`\`bash
${generateCurlExample(requestData)}
\`\`\`

### JavaScript (Fetch API)
\`\`\`javascript
${generateJavaScriptExample(requestData)}
\`\`\`

### Python (Requests)
\`\`\`python
${generatePythonExample(requestData)}
\`\`\`

## Response Format
${generateResponseDocumentation(method)}

## Error Handling
${generateErrorHandlingDocumentation()}

## Best Practices
${generateBestPractices(method, bodyType)}

## Notes
- Generated automatically by PostExt Chrome Extension
- Test this endpoint with different parameters to understand the full response structure
- Always handle errors gracefully in your implementation
- Consider implementing retry logic for production use
`;

    return documentation;
  };

  const getContentTypeFromHeaders = (headers) => {
    if (!Array.isArray(headers)) return null;
    const contentTypeHeader = headers.find(h => h.key?.toLowerCase() === 'content-type');
    return contentTypeHeader?.value;
  };

  const getContentTypeFromBodyType = (bodyType) => {
    switch (bodyType) {
      case 'json': return 'application/json';
      case 'form-data': return 'multipart/form-data';
      case 'x-www-form-urlencoded': return 'application/x-www-form-urlencoded';
      case 'raw': return 'text/plain';
      default: return 'application/json';
    }
  };

  const generateEndpointDescription = (method, endpointName, url) => {
    const methodDescriptions = {
      GET: `Retrieves ${endpointName} data from the server. This is a read-only operation that fetches information without modifying any resources.`,
      POST: `Creates new ${endpointName} data on the server. This operation will add a new resource and typically returns the created object.`,
      PUT: `Updates existing ${endpointName} data on the server. This operation replaces the entire resource with the provided data.`,
      PATCH: `Partially updates existing ${endpointName} data on the server. This operation modifies only the specified fields.`,
      DELETE: `Removes ${endpointName} data from the server. This is a destructive operation that permanently deletes the resource.`
    };

    return methodDescriptions[method] || `Performs ${method} operation on ${endpointName} endpoint.`;
  };

  const generateHeadersDocumentation = (headers) => {
    if (!Array.isArray(headers) || headers.length === 0) {
      return `| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Content-Type | application/json | Yes | Specifies the media type of the request body |
| Accept | application/json | No | Specifies the media type that the client can process |`;
    }

    let table = `| Header | Value | Required | Description |
|--------|-------|----------|-------------|
`;

    headers.forEach(header => {
      if (header.key) {
        const description = getHeaderDescription(header.key);
        const required = isHeaderRequired(header.key) ? 'Yes' : 'No';
        table += `| ${header.key} | ${header.value || '[value]'} | ${required} | ${description} |
`;
      }
    });

    return table;
  };

  const getHeaderDescription = (headerName) => {
    const descriptions = {
      'content-type': 'Specifies the media type of the request body',
      'accept': 'Specifies the media type that the client can process',
      'authorization': 'Contains authentication credentials',
      'user-agent': 'Identifies the client application',
      'x-api-key': 'API key for authentication',
      'x-csrf-token': 'CSRF protection token',
      'cache-control': 'Specifies caching directives',
      'accept-encoding': 'Specifies content encoding that the client can understand'
    };
    return descriptions[headerName.toLowerCase()] || 'Custom header for this API';
  };

  const isHeaderRequired = (headerName) => {
    const requiredHeaders = ['content-type', 'authorization', 'x-api-key', 'x-csrf-token'];
    return requiredHeaders.includes(headerName.toLowerCase());
  };

  const generateParametersDocumentation = (params) => {
    if (!Array.isArray(params) || params.length === 0) {
      return `No query parameters required for this endpoint.

**Example query parameters you might want to add:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| page | integer | Page number for pagination | \`?page=1\` |
| limit | integer | Number of items per page | \`?limit=10\` |
| search | string | Search query | \`?search=keyword\` |`;
    }

    let table = `| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
`;

    params.forEach(param => {
      if (param.key) {
        const type = guessParameterType(param.value);
        const description = generateParameterDescription(param.key);
        table += `| ${param.key} | ${type} | ${param.enabled ? 'Yes' : 'No'} | ${description} | \`${param.value || '[value]'}\` |
`;
      }
    });

    return table;
  };

  const guessParameterType = (value) => {
    if (!value) return 'string';
    if (!isNaN(value)) return 'integer';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value.includes('@')) return 'email';
    return 'string';
  };

  const generateParameterDescription = (paramName) => {
    const name = paramName.toLowerCase();
    if (name.includes('id')) return 'Unique identifier';
    if (name.includes('page')) return 'Page number for pagination';
    if (name.includes('limit') || name.includes('size')) return 'Number of items to return';
    if (name.includes('search') || name.includes('query')) return 'Search query string';
    if (name.includes('sort')) return 'Sort order or field';
    if (name.includes('filter')) return 'Filter criteria';
    if (name.includes('date')) return 'Date parameter';
    return `Parameter for ${paramName}`;
  };

  const generateBodyDocumentation = (body, formData, bodyType) => {
    if (bodyType === 'none' || (!body && (!formData || formData.length === 0))) {
      return 'No request body required for this endpoint.';
    }

    let documentation = `**Body Type**: ${bodyType}\n\n`;

    if (bodyType === 'json' && body) {
      documentation += `**JSON Structure**:
\`\`\`json
${body}
\`\`\`

**Field Descriptions**:
${generateJsonFieldDescriptions(body)}`;
    } else if (bodyType === 'form-data' && Array.isArray(formData)) {
      documentation += `**Form Data Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
`;
      formData.forEach(field => {
        if (field.key) {
          documentation += `| ${field.key} | ${field.type || 'text'} | ${field.enabled ? 'Yes' : 'No'} | ${generateParameterDescription(field.key)} |
`;
        }
      });
    } else if (body) {
      documentation += `**Raw Body**:
\`\`\`
${body}
\`\`\``;
    }

    return documentation;
  };

  const generateJsonFieldDescriptions = (jsonBody) => {
    try {
      const parsed = JSON.parse(jsonBody);
      let descriptions = '';
      
      Object.keys(parsed).forEach(key => {
        const value = parsed[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        descriptions += `- **${key}** (${type}): ${generateParameterDescription(key)}\n`;
      });
      
      return descriptions || 'Field descriptions not available.';
    } catch (e) {
      return 'Unable to parse JSON structure for field descriptions.';
    }
  };

  const generateCurlExample = (requestData) => {
    const { method, url, headers, body, formData, bodyType } = requestData;
    
    let curlCommand = `curl -X ${method} "${url}"`;
    
    // Add headers
    if (Array.isArray(headers)) {
      headers.forEach(header => {
        if (header.key && header.enabled) {
          curlCommand += ` \\\n  -H "${header.key}: ${header.value}"`;
        }
      });
    }
    
    // Add body
    if (body && bodyType !== 'none') {
      if (bodyType === 'json') {
        curlCommand += ` \\\n  -d '${body}'`;
      } else if (bodyType === 'form-data' && Array.isArray(formData)) {
        formData.forEach(field => {
          if (field.key && field.enabled) {
            if (field.type === 'file') {
              curlCommand += ` \\\n  -F "${field.key}=@${field.value}"`;
            } else {
              curlCommand += ` \\\n  -F "${field.key}=${field.value}"`;
            }
          }
        });
      } else {
        curlCommand += ` \\\n  -d "${body}"`;
      }
    }
    
    return curlCommand;
  };

  const generateJavaScriptExample = (requestData) => {
    const { method, url, headers, body, bodyType } = requestData;
    
    let jsCode = `const response = await fetch('${url}', {
  method: '${method}',`;
    
    // Add headers
    if (Array.isArray(headers) && headers.some(h => h.key && h.enabled)) {
      jsCode += `
  headers: {`;
      headers.forEach(header => {
        if (header.key && header.enabled) {
          jsCode += `
    '${header.key}': '${header.value}',`;
        }
      });
      jsCode = jsCode.slice(0, -1); // Remove last comma
      jsCode += `
  },`;
    }
    
    // Add body
    if (body && bodyType !== 'none') {
      if (bodyType === 'json') {
        jsCode += `
  body: JSON.stringify(${body}),`;
      } else {
        jsCode += `
  body: '${body}',`;
      }
    }
    
    jsCode += `
});

const data = await response.json();
console.log(data);`;
    
    return jsCode;
  };

  const generatePythonExample = (requestData) => {
    const { method, url, headers, body, bodyType } = requestData;
    
    let pythonCode = `import requests

`;
    
    // Add headers
    if (Array.isArray(headers) && headers.some(h => h.key && h.enabled)) {
      pythonCode += `headers = {
`;
      headers.forEach(header => {
        if (header.key && header.enabled) {
          pythonCode += `    '${header.key}': '${header.value}',
`;
        }
      });
      pythonCode += `}

`;
    }
    
    pythonCode += `response = requests.${method.toLowerCase()}('${url}'`;
    
    if (Array.isArray(headers) && headers.some(h => h.key && h.enabled)) {
      pythonCode += `, headers=headers`;
    }
    
    if (body && bodyType !== 'none') {
      if (bodyType === 'json') {
        pythonCode += `, json=${body}`;
      } else {
        pythonCode += `, data='${body}'`;
      }
    }
    
    pythonCode += `)

print(response.json())`;
    
    return pythonCode;
  };

  const generateResponseDocumentation = (method) => {
    const responses = {
      GET: `**Success Response (200 OK)**:
\`\`\`json
{
  "status": "success",
  "data": {
    // Resource data here
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
\`\`\``,
      POST: `**Success Response (201 Created)**:
\`\`\`json
{
  "status": "success",
  "message": "Resource created successfully",
  "data": {
    "id": "12345",
    // Created resource data here
  }
}
\`\`\``,
      PUT: `**Success Response (200 OK)**:
\`\`\`json
{
  "status": "success",
  "message": "Resource updated successfully",
  "data": {
    // Updated resource data here
  }
}
\`\`\``,
      PATCH: `**Success Response (200 OK)**:
\`\`\`json
{
  "status": "success",
  "message": "Resource partially updated",
  "data": {
    // Updated fields here
  }
}
\`\`\``,
      DELETE: `**Success Response (204 No Content)**:
No response body, or:
\`\`\`json
{
  "status": "success",
  "message": "Resource deleted successfully"
}
\`\`\``
    };

    return responses[method] || `**Success Response (200 OK)**:
\`\`\`json
{
  "status": "success",
  "data": {
    // Response data here
  }
}
\`\`\``;
  };

  const generateErrorHandlingDocumentation = () => {
    return `**Common Error Responses**:

**400 Bad Request**:
\`\`\`json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "error description"
  }
}
\`\`\`

**401 Unauthorized**:
\`\`\`json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication credentials"
}
\`\`\`

**404 Not Found**:
\`\`\`json
{
  "error": "Not Found",
  "message": "Resource not found"
}
\`\`\`

**500 Internal Server Error**:
\`\`\`json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
\`\`\``;
  };

  const generateBestPractices = (method, bodyType) => {
    let practices = [
      '- Always validate input parameters before making requests',
      '- Implement proper error handling for all possible response codes',
      '- Use appropriate HTTP status codes in your API responses',
      '- Include rate limiting to prevent API abuse',
      '- Log API requests for monitoring and debugging purposes'
    ];

    if (method === 'POST' || method === 'PUT') {
      practices.push('- Validate all required fields before submitting data');
      practices.push('- Use idempotency keys for critical operations');
    }

    if (bodyType === 'json') {
      practices.push('- Always validate JSON structure before sending');
      practices.push('- Use consistent field naming conventions (camelCase or snake_case)');
    }

    if (method === 'GET') {
      practices.push('- Implement caching strategies for better performance');
      practices.push('- Use pagination for large datasets');
    }

    return practices.join('\n');
  };

  const downloadDocumentation = (documentation, requestData) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlPath = new URL(requestData.url).pathname.replace(/\//g, '_') || 'root';
    const filename = `API_Documentation_${requestData.method}_${urlPath}_${timestamp}.txt`;
    
    const content = `# API Documentation
Generated on: ${new Date().toLocaleString()}
Generated by: PostExt Chrome Extension
Endpoint: ${requestData.method} ${requestData.url}

${documentation}

---
Technical Details:
${JSON.stringify(requestData, null, 2)}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`Documentation saved as: ${filename}`);
  };



  return (
    <div className={`postman-request-builder ${darkMode ? 'dark-mode' : ''}`}>
      {/* Compact URL Section with integrated branding */}
      <div className="compact-url-section">
        {/* Modern Header with Gradient Logo */}
        <div className="modern-header">
          <div className="logo-section">
            <div className="logo-container">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                <path 
                  d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7Z" 
                  fill="url(#logoGradient)"
                />
                <path 
                  d="M8 9H16M8 12H14M8 15H12" 
                  stroke="white" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              </svg>
              <div className="logo-text">
                <span className="logo-name">PostExt</span>
                <span className="logo-tagline">API Builder</span>
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span className="status-text">Ready</span>
            </div>
            <button
              className="modern-theme-toggle"
              onClick={toggleDarkMode}
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              <div className="toggle-track">
                <div className={`toggle-thumb ${darkMode ? 'dark' : 'light'}`}>
                  {darkMode ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.64 13A9 9 0 1 1 11 2.36A13.5 13.5 0 0 0 21.64 13Z"/>
                    </svg>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
        
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

          <div className="button-group">
            <button
              className="reset-button"
              onClick={handleResetRequest}
              disabled={loading}
              title="Clear all request data"
            >
              <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
              </svg>
              Clear
            </button>
            
            <button
              className="save-docs-button"
              onClick={handleSaveDocumentation}
              disabled={loading || !request.url}
              title="Generate and save API documentation"
            >
              <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z M9 13V15H15V13H9Z M9 10V12H15V10H9Z"/>
              </svg>
              Save Docs
            </button>
            
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
      </div>

      {/* Main Content Area with Resizable Layout */}
      <div className="main-content-area">
        {/* Smart Tabs Container */}
        <div 
          className="smart-tabs-container"
          style={{ 
            height: aiPanelCollapsed 
              ? 'calc(100% - 120px)' 
              : `calc(100% - 120px - ${aiPanelHeight}px)`,
            transition: isResizing ? 'none' : 'height 0.2s ease'
          }}
        >
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
            {Array.isArray(headers) && headers.length > 0 && (
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
                {params.length > 0 && (
                  <button
                    className="section-clear-button"
                    onClick={() => updateRequest({ params: [] })}
                    title="Clear all parameters"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                    </svg>
                    Clear All
                  </button>
                )}
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
                {Array.isArray(headers) && headers.length > 0 && (
                  <button
                    className="section-clear-button"
                    onClick={() => updateRequest({ headers: [] })}
                    title="Clear all headers"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                    </svg>
                    Clear All
                  </button>
                )}
              </div>

              {Array.isArray(headers) && headers.length > 0 && (
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
                        {formDataPairs.some(pair => pair.key) && (
                          <button
                            className="section-clear-button"
                            onClick={() => {
                              setFormDataPairs([{ key: '', value: '', type: 'text', enabled: true }]);
                              updateRequest({ formData: [], body: '' });
                            }}
                            title="Clear all form data"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                            </svg>
                            Clear All
                          </button>
                        )}
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
                          {pair.type === 'file' ? (
                            <div className="file-input-container">
                              <input
                                type="file"
                                onChange={(e) => updateFormDataPair(index, 'value', e)}
                                className="form-data-file-input"
                                accept="*/*"
                                id={`file-${index}`}
                              />
                              <label htmlFor={`file-${index}`} className="file-input-label">
                                {pair.value || 'Choose file...'}
                              </label>
                              {pair.file && (
                                <small className="file-info">
                                  {Math.round(pair.fileSize / 1024)}KB - {pair.fileType}
                                </small>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="Value"
                              value={pair.value}
                              onChange={(e) => updateFormDataPair(index, 'value', e.target.value)}
                              className="form-data-input"
                            />
                          )}
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

        {/* Resizable AI Detection Panel */}
        {!aiPanelCollapsed && (
          <>
            {/* Resize Handle */}
            <div 
              className="resize-handle"
              onMouseDown={handleMouseDown}
              title="Drag to resize AI panel"
            >
              <div className="resize-handle-line"></div>
            </div>
            
            {/* AI Panel */}
            <div 
              className="resizable-ai-panel"
              style={{ 
                height: `${aiPanelHeight}px`,
                minHeight: '120px',
                maxHeight: '400px'
              }}
            >
              <div className="ai-panel-header">
                <div className="ai-panel-title-section">
                  <div className="ai-panel-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="ai-panel-title">AI Form Detection</h4>
                    <p className="ai-panel-subtitle">Analyze page forms and generate API requests</p>
                  </div>
                </div>
                <div className="ai-panel-controls">
                  <button
                    className="panel-collapse-button"
                    onClick={toggleAiPanel}
                    title="Collapse AI panel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13H5V11H19V13Z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="ai-panel-content">
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
                    <div className="suggestions-list">
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
                  </div>
                ) : !detectingForms && (
                  <div className="no-suggestions">
                    <p>🔍 No forms detected on current page</p>
                    <small>Try navigating to a page with forms or contact forms</small>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Collapsed AI Panel */}
        {aiPanelCollapsed && (
          <div className="collapsed-ai-panel">
            <button
              className="expand-ai-panel-button"
              onClick={toggleAiPanel}
              title="Expand AI panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
              </svg>
              <span>AI Form Detection</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
            </button>
          </div>
        )}
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
    </div>
  );
};

export default ModernPostmanRequestBuilder;