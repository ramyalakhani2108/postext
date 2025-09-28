import React, { useState, useEffect } from 'react';
import ModernPostmanRequestBuilder from './ModernPostmanRequestBuilder';
import ModernResponseViewer from './ModernResponseViewer';
import HistoryPanel from './HistoryPanel';
import SettingsPanel from './SettingsPanel';
import './ModernApp.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('request');
  const [currentRequest, setCurrentRequest] = useState({
    method: 'GET',
    url: '',
    headers: [],
    body: '',
    params: []
  });
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [settings, setSettings] = useState({
    openaiApiKey: '',
    theme: 'light',
    saveHistory: true
  });

  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    try {
      const result = await chrome.storage.local.get(['requests', 'settings']);
      if (result.requests) setRequests(result.requests);
      if (result.settings) setSettings(result.settings);
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  };

  const saveToStorage = async (key, data) => {
    try {
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  };

  const handleSendRequest = async (requestData) => {
    setLoading(true);
    setResponse(null);
    
    try {
      const startTime = performance.now();

      const response = await chrome.runtime.sendMessage({
        type: 'HTTP_REQUEST',
        data: requestData
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      const responseWithTiming = {
        ...response,
        responseTime,
        timestamp: new Date().toISOString()
      };

      setResponse(responseWithTiming);
      setActiveTab('response');

      if (settings.saveHistory) {
        const newRequest = {
          ...requestData,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          response: responseWithTiming
        };

        const updatedRequests = [newRequest, ...requests.slice(0, 49)];
        setRequests(updatedRequests);
        saveToStorage('requests', updatedRequests);
      }

    } catch (error) {
      setResponse({
        error: true,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      setActiveTab('response');
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

  const tabs = [
    {
      id: 'request',
      label: 'Request',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.5 5L11 2L13.5 5H16C17.1 5 18 5.9 18 7V19C18 20.1 17.1 21 16 21H8C6.9 21 6 20.1 6 19V7C6 5.9 6.9 5 8 5H8.5ZM12 3.5L10 5.5H14L12 3.5ZM8 7V19H16V7H8Z"/>
        </svg>
      ),
      badge: loading ? '●' : null
    },
    {
      id: 'response',
      label: 'Response',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
        </svg>
      ),
      badge: response ? (response.error ? '!' : '✓') : null
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 3C16.88 3 20 6.14 20 10.2C20 11.22 19.79 12.21 19.4 13.11L22.39 16.1L21 17.5L18 14.5C17.14 15.24 16.12 15.8 15 16.09V19H13V16.09C9.35 15.44 6.44 12.24 6.44 8.4C6.44 4.05 9.84 0.65 14.19 0.65C14.64 0.65 15.09 0.71 15.53 0.82L13 3ZM15 5V8L17.25 9.15L18.5 7.25L17 6.38V5H15Z"/>
        </svg>
      ),
      badge: requests.length > 0 ? requests.length : null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8C9.79 8 8 9.79 8 12S9.79 16 12 16 16 14.21 16 12 14.21 8 12 8ZM12 14C10.9 14 10 13.1 10 12S10.9 10 12 10 14 10.9 14 12 13.1 14 12 14Z"/>
          <path d="M12.04 2.05C11.53 2.05 11.04 2.4 10.94 2.9L10.64 4.55C10.29 4.69 9.96 4.85 9.65 5.04L8.09 4.5C7.6 4.33 7.06 4.55 6.81 5L5.85 6.73C5.6 7.18 5.71 7.74 6.09 8.06L7.35 9.15C7.31 9.5 7.31 9.85 7.35 10.2L6.09 11.29C5.71 11.61 5.6 12.17 5.85 12.62L6.81 14.35C7.06 14.8 7.6 15.02 8.09 14.85L9.65 14.31C9.96 14.5 10.29 14.66 10.64 14.8L10.94 16.45C11.04 16.95 11.53 17.3 12.04 17.3H13.96C14.47 17.3 14.96 16.95 15.06 16.45L15.36 14.8C15.71 14.66 16.04 14.5 16.35 14.31L17.91 14.85C18.4 15.02 18.94 14.8 19.19 14.35L20.15 12.62C20.4 12.17 20.29 11.61 19.91 11.29L18.65 10.2C18.69 9.85 18.69 9.5 18.65 9.15L19.91 8.06C20.29 7.74 20.4 7.18 20.15 6.73L19.19 5C18.94 4.55 18.4 4.33 17.91 4.5L16.35 5.04C16.04 4.85 15.71 4.69 15.36 4.55L15.06 2.9C14.96 2.4 14.47 2.05 13.96 2.05H12.04Z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="modern-app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" opacity="0.8"/>
                <path d="M2 17L12 22L22 17" opacity="0.6"/>
                <path d="M2 12L12 17L22 12" opacity="0.4"/>
              </svg>
            </div>
            <div className="brand-text">
              <h1 className="brand-title">PostExt</h1>
              <span className="brand-subtitle">AI-Powered API Testing</span>
            </div>
          </div>
          {loading && (
            <div className="header-status">
              <div className="loading-indicator">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        <div className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="tab-icon">{tab.icon}</div>
              <span className="tab-label">{tab.label}</span>
              {tab.badge && (
                <div className={`tab-badge ${typeof tab.badge === 'string' && tab.badge.includes('!') ? 'error' : ''}`}>
                  {tab.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        <div className="content-container">
          {activeTab === 'request' && (
            <div className="content-panel">
              <ModernPostmanRequestBuilder
                request={currentRequest}
                onRequestChange={setCurrentRequest}
                onSendRequest={handleSendRequest}
                loading={loading}
                settings={settings}
              />
            </div>
          )}
          
          {activeTab === 'response' && (
            <div className="content-panel">
              <ModernResponseViewer response={response} loading={loading} />
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="content-panel">
              <HistoryPanel 
                requests={requests} 
                onLoadRequest={handleLoadRequest}
                onClearHistory={() => {
                  setRequests([]);
                  saveToStorage('requests', []);
                }}
              />
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="content-panel">
              <SettingsPanel 
                settings={settings}
                onSettingsUpdate={handleSettingsUpdate}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;