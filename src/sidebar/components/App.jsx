import React, { useState, useEffect } from 'react';
import Header from './Header';
import PostmanRequestBuilder from './PostmanRequestBuilder';
import ResponseViewer from './ResponseViewer';
import HistoryPanel from './HistoryPanel';
import SettingsPanel from './SettingsPanel';

const App = () => {
  const [activeTab, setActiveTab] = useState('request');
  const [requests, setRequests] = useState([]);
  const [currentRequest, setCurrentRequest] = useState({
    method: 'GET',
    url: 'https://api.openai.com/v1/models',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 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'
    },
    body: '',
    params: {}
  });
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    openaiApiKey: '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',
    timeout: 30000,
    theme: 'light'
  });

  useEffect(() => {
    // Load saved data from Chrome storage
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const result = await chrome.storage.local.get(['requests', 'settings']);
      if (result.requests) {
        setRequests(result.requests);
      }
      if (result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveToStorage = async (key, data) => {
    try {
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  const handleSendRequest = async (requestData) => {
    setLoading(true);
    setResponse(null);

    try {
      const startTime = Date.now();
      
      const response = await chrome.runtime.sendMessage({
        action: 'sendRequest',
        requestData: requestData,
        apiKey: settings.openaiApiKey
      });

      const endTime = Date.now();
      const responseWithTiming = {
        ...response,
        timing: endTime - startTime,
        timestamp: new Date().toISOString()
      };

      setResponse(responseWithTiming);

      // Save to history
      const newRequest = {
        ...requestData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        response: responseWithTiming
      };

      const updatedRequests = [newRequest, ...requests.slice(0, 49)]; // Keep last 50
      setRequests(updatedRequests);
      saveToStorage('requests', updatedRequests);

    } catch (error) {
      setResponse({
        error: true,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRequest = (request) => {
    setCurrentRequest({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      params: request.params
    });
    setActiveTab('request');
  };

  const handleSettingsUpdate = (newSettings) => {
    setSettings(newSettings);
    saveToStorage('settings', newSettings);
  };

  return (
    <div className="app">
      <Header />
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          🚀 Request
        </button>
        <button 
          className={`tab-btn ${activeTab === 'response' ? 'active' : ''}`}
          onClick={() => setActiveTab('response')}
        >
          📋 Response
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="content">
        {activeTab === 'request' && (
          <PostmanRequestBuilder
            request={currentRequest}
            onRequestChange={setCurrentRequest}
            onSendRequest={handleSendRequest}
            loading={loading}
            settings={settings}
          />
        )}
        {activeTab === 'response' && (
          <ResponseViewer response={response} loading={loading} />
        )}
        {activeTab === 'history' && (
          <HistoryPanel 
            requests={requests} 
            onLoadRequest={handleLoadRequest}
            onClearHistory={() => {
              setRequests([]);
              saveToStorage('requests', []);
            }}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel 
            settings={settings}
            onSettingsUpdate={handleSettingsUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default App;