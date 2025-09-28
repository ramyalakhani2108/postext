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