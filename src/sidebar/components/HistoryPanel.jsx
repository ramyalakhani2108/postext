import React, { useState } from 'react';

const HistoryPanel = ({ requests, onLoadRequest, onClearHistory, settings }) => {
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

  const generateDocumentation = async (request) => {
    try {
      // Generate documentation locally without external API calls
      const documentation = await generateAPIDocumentation(request);
      
      // Create and download the file
      downloadDocumentation(documentation, request);
    } catch (error) {
      console.error('Failed to generate documentation:', error);
      alert('Failed to generate documentation. Please try again.');
    }
  };

  const generateAPIDocumentation = async (request) => {
    // Generate professional documentation locally without external API calls
    return generateLocalAPIDocumentation(request);
  };

  const generateLocalAPIDocumentation = (requestData) => {
    const { method, url, headers, params, body, formData, bodyType, response } = requestData;
    
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
- **Last Tested**: ${requestData.timestamp ? new Date(requestData.timestamp).toLocaleString() : 'Unknown'}

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

## Response Information
${generateActualResponseDocumentation(response)}

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

## Error Handling
${generateErrorHandlingDocumentation()}

## Best Practices
${generateBestPractices(method, bodyType)}

## Notes
- Generated automatically by PostExt Chrome Extension from actual request history
- This documentation is based on a real request that was executed
- Response data and timing information included where available
- Test this endpoint with different parameters to understand the full response structure
`;

    return documentation;
  };

  // Helper functions for documentation generation
  const getContentTypeFromHeaders = (headers) => {
    if (!headers) return null;
    if (Array.isArray(headers)) {
      const contentTypeHeader = headers.find(h => h.key?.toLowerCase() === 'content-type');
      return contentTypeHeader?.value;
    } else if (typeof headers === 'object') {
      return headers['Content-Type'] || headers['content-type'];
    }
    return null;
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
    if (!headers) {
      return `No custom headers were used in this request.`;
    }

    let headerArray = [];
    if (Array.isArray(headers)) {
      headerArray = headers;
    } else if (typeof headers === 'object') {
      headerArray = Object.entries(headers).map(([key, value]) => ({ key, value, enabled: true }));
    }

    if (headerArray.length === 0) {
      return `No custom headers were used in this request.`;
    }

    let table = `| Header | Value | Description |
|--------|-------|-------------|
`;

    headerArray.forEach(header => {
      if (header.key) {
        const description = getHeaderDescription(header.key);
        table += `| ${header.key} | ${header.value || '[value]'} | ${description} |
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
      'cache-control': 'Specifies caching directives'
    };
    return descriptions[headerName.toLowerCase()] || 'Custom header for this API';
  };

  const generateParametersDocumentation = (params) => {
    if (!Array.isArray(params) || params.length === 0) {
      return `No query parameters were used in this request.`;
    }

    let table = `| Parameter | Value | Description |
|-----------|-------|-------------|
`;

    params.forEach(param => {
      if (param.key) {
        const description = generateParameterDescription(param.key);
        table += `| ${param.key} | ${param.value || '[value]'} | ${description} |
`;
      }
    });

    return table;
  };

  const generateParameterDescription = (paramName) => {
    const name = paramName.toLowerCase();
    if (name.includes('id')) return 'Unique identifier';
    if (name.includes('page')) return 'Page number for pagination';
    if (name.includes('limit') || name.includes('size')) return 'Number of items to return';
    if (name.includes('search') || name.includes('query')) return 'Search query string';
    if (name.includes('sort')) return 'Sort order or field';
    if (name.includes('filter')) return 'Filter criteria';
    return `Parameter for ${paramName}`;
  };

  const generateBodyDocumentation = (body, formData, bodyType) => {
    if (bodyType === 'none' || (!body && (!formData || formData.length === 0))) {
      return 'No request body was sent with this request.';
    }

    let documentation = `**Body Type**: ${bodyType}\n\n`;

    if (body) {
      if (bodyType === 'json') {
        documentation += `**JSON Body**:
\`\`\`json
${body}
\`\`\``;
      } else {
        documentation += `**Request Body**:
\`\`\`
${body}
\`\`\``;
      }
    }

    if (Array.isArray(formData) && formData.length > 0) {
      documentation += `\n\n**Form Data Fields**:
| Field | Value | Type |
|-------|-------|------|
`;
      formData.forEach(field => {
        if (field.key) {
          documentation += `| ${field.key} | ${field.value || '[value]'} | ${field.type || 'text'} |
`;
        }
      });
    }

    return documentation;
  };

  const generateActualResponseDocumentation = (response) => {
    if (!response) {
      return `**Response**: No response data available for this request.`;
    }

    let doc = `**Response Status**: ${response.status || 'Unknown'} ${response.statusText || ''}
**Response Time**: ${response.responseTime || 'N/A'}ms
`;

    if (response.error) {
      doc += `**Error**: ${response.message || 'Unknown error occurred'}`;
    } else if (response.data) {
      doc += `
**Response Body**:
\`\`\`json
${JSON.stringify(response.data, null, 2)}
\`\`\``;
    }

    if (response.headers && typeof response.headers === 'object') {
      doc += `

**Response Headers**:
\`\`\`
${Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\n')}
\`\`\``;
    }

    return doc;
  };

  const generateCurlExample = (requestData) => {
    const { method, url, headers, body } = requestData;
    
    let curlCommand = `curl -X ${method} "${url}"`;
    
    // Add headers
    if (headers) {
      let headerArray = Array.isArray(headers) ? headers : Object.entries(headers).map(([key, value]) => ({ key, value }));
      headerArray.forEach(header => {
        if (header.key) {
          curlCommand += ` \\\n  -H "${header.key}: ${header.value}"`;
        }
      });
    }
    
    // Add body
    if (body) {
      curlCommand += ` \\\n  -d '${body}'`;
    }
    
    return curlCommand;
  };

  const generateJavaScriptExample = (requestData) => {
    const { method, url, headers, body } = requestData;
    
    let jsCode = `const response = await fetch('${url}', {
  method: '${method}',`;
    
    // Add headers
    if (headers) {
      let headerArray = Array.isArray(headers) ? headers : Object.entries(headers).map(([key, value]) => ({ key, value }));
      if (headerArray.some(h => h.key)) {
        jsCode += `
  headers: {`;
        headerArray.forEach(header => {
          if (header.key) {
            jsCode += `
    '${header.key}': '${header.value}',`;
          }
        });
        jsCode = jsCode.slice(0, -1); // Remove last comma
        jsCode += `
  },`;
      }
    }
    
    // Add body
    if (body) {
      jsCode += `
  body: '${body}',`;
    }
    
    jsCode += `
});

const data = await response.json();
console.log(data);`;
    
    return jsCode;
  };

  const generatePythonExample = (requestData) => {
    const { method, url, headers, body } = requestData;
    
    let pythonCode = `import requests
import json

`;
    
    // Add headers
    if (headers) {
      let headerArray = Array.isArray(headers) ? headers : Object.entries(headers).map(([key, value]) => ({ key, value }));
      if (headerArray.some(h => h.key)) {
        pythonCode += `headers = {
`;
        headerArray.forEach(header => {
          if (header.key) {
            pythonCode += `    '${header.key}': '${header.value}',
`;
          }
        });
        pythonCode += `}

`;
      }
    }
    
    pythonCode += `response = requests.${method.toLowerCase()}('${url}'`;
    
    if (headers && Object.keys(headers).length > 0) {
      pythonCode += `, headers=headers`;
    }
    
    if (body) {
      pythonCode += `, data='${body}'`;
    }
    
    pythonCode += `)

print(response.json())`;
    
    return pythonCode;
  };

  const generateErrorHandlingDocumentation = () => {
    return `**Common HTTP Status Codes**:
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error occurred`;
  };

  const generateBestPractices = (method, bodyType) => {
    let practices = [
      '- Always handle HTTP errors gracefully',
      '- Implement retry logic for transient failures',
      '- Use appropriate timeouts for requests',
      '- Validate input data before sending requests',
      '- Log requests and responses for debugging'
    ];

    if (method === 'POST' || method === 'PUT') {
      practices.push('- Validate required fields before submission');
    }

    if (bodyType === 'json') {
      practices.push('- Ensure JSON is properly formatted');
    }

    return practices.join('\n');
  };

  const downloadDocumentation = (documentation, request) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `API_Documentation_${request.method}_${timestamp}.txt`;
    
    const content = `# API Documentation
Generated on: ${new Date().toLocaleString()}
Generated by: PostExt Chrome Extension

${documentation}

---
Generated from request data:
${JSON.stringify(request, null, 2)}
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
  };

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
                      body: request.body,
                      params: request.params,
                      formData: request.formData
                    }, null, 2));
                    alert('Request copied to clipboard!');
                  }}
                  title="Copy request"
                >
                  📋
                </button>
                <button
                  className="save-docs-btn"
                  onClick={() => generateDocumentation(request)}
                  title="Generate API documentation"
                >
                  📝 Docs
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