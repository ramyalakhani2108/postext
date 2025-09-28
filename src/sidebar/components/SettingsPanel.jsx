import React, { useState } from 'react';

const SettingsPanel = ({ settings, onSettingsUpdate }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApi, setTestingApi] = useState(false);

  const handleSave = () => {
    onSettingsUpdate(localSettings);
    alert('Settings saved successfully! 🎉');
  };

  const handleReset = () => {
    const defaultSettings = {
      openaiApiKey: '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',
      timeout: 30000,
      theme: 'light'
    };
    setLocalSettings(defaultSettings);
    onSettingsUpdate(defaultSettings);
    alert('Settings reset to defaults! 🔄');
  };

  const testAIFeatures = async () => {
    if (!localSettings.openaiApiKey) {
      alert('Please enter your OpenAI API key first!');
      return;
    }

    setTestingApi(true);
    try {
      const testRequest = {
        method: 'GET',
        url: 'https://api.openai.com/v1/models',
        headers: {
          'Authorization': `Bearer ${localSettings.openaiApiKey}`
        }
      };

      const response = await chrome.runtime.sendMessage({
        action: 'sendRequest',
        requestData: testRequest
      });

      if (response.status === 200) {
        alert('✅ AI features are working perfectly!');
      } else {
        alert(`❌ AI test failed: ${response.statusText}`);
      }
    } catch (error) {
      alert(`❌ AI test failed: ${error.message}`);
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>⚙️ Settings</h3>
        <p>Configure your AI Postman extension</p>
      </div>

      <div className="settings-sections">
        {/* AI Features Configuration */}
        <div className="settings-section">
          <h4>🤖 AI-Powered Features</h4>
          <div className="ai-status">
            <div className="status-indicator">
              <span className="status-dot active"></span>
              <strong>AI Engine: Active</strong>
            </div>
            <p className="ai-description">
              AI features are powered by OpenAI and automatically analyze web pages to generate API requests. 
              No setup required - just click "Generate from Page" on any form!
            </p>
          </div>
          <div className="ai-features-list">
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <div className="feature-text">
                <strong>Smart Form Detection</strong>
                <small>Automatically finds forms and input fields on pages</small>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div className="feature-text">
                <strong>Auto API Generation</strong>
                <small>Converts form data into proper API requests</small>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <div className="feature-text">
                <strong>Context Awareness</strong>
                <small>Understands page content and suggests appropriate endpoints</small>
              </div>
            </div>
          </div>
          <div className="ai-test-section">
            <button
              className="ai-test-btn"
              onClick={testAIFeatures}
              disabled={testingApi}
            >
              {testingApi ? (
                <>
                  <div className="spinner-small"></div>
                  Testing...
                </>
              ) : (
                <>🧪 Test AI Features</>
              )}
            </button>
          </div>
        </div>

        {/* OpenAI API Key Configuration */}
        <div className="settings-section">
          <h4>🔑 OpenAI API Key</h4>
          <div className="setting-item">
            <label htmlFor="apiKey">Your OpenAI API Key:</label>
            <div className="api-key-input">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                className="input-field"
                placeholder="sk-proj-..."
                value={localSettings.openaiApiKey}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  openaiApiKey: e.target.value
                })}
              />
              <button
                className="toggle-btn"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Hide API Key' : 'Show API Key'}
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>
            <small className="help-text">
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>. 
              Required for AI form detection and request generation features.
            </small>
          </div>
        </div>

        {/* Request Configuration */}
        <div className="settings-section">
          <h4>🌐 Request Configuration</h4>
          <div className="setting-item">
            <label htmlFor="timeout">Request Timeout (ms):</label>
            <input
              id="timeout"
              type="number"
              className="input-field"
              min="1000"
              max="120000"
              step="1000"
              value={localSettings.timeout}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                timeout: parseInt(e.target.value)
              })}
            />
            <small className="help-text">
              Maximum time to wait for a response (1-120 seconds)
            </small>
          </div>
        </div>

        {/* Theme Configuration */}
        <div className="settings-section">
          <h4>🎨 Appearance</h4>
          <div className="setting-item">
            <label htmlFor="theme">Theme:</label>
            <select
              id="theme"
              className="select-field"
              value={localSettings.theme}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                theme: e.target.value
              })}
            >
              <option value="light">🌞 Light</option>
              <option value="dark">🌙 Dark</option>
              <option value="auto">🔄 Auto</option>
            </select>
            <small className="help-text">
              Choose your preferred color scheme
            </small>
          </div>
        </div>

        {/* Storage Information */}
        <div className="settings-section">
          <h4>💾 Storage Information</h4>
          <div className="storage-info">
            <div className="info-item">
              <strong>Request History:</strong>
              <span>Last 50 requests are saved locally</span>
            </div>
            <div className="info-item">
              <strong>Settings:</strong>
              <span>Synced across Chrome instances</span>
            </div>
            <div className="info-item">
              <strong>API Keys:</strong>
              <span>Stored locally and encrypted</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="settings-section">
          <h4>ℹ️ About</h4>
          <div className="about-info">
            <p><strong>AI Postman Extension</strong></p>
            <p>Version: 1.0.0</p>
            <p>An AI-powered API testing tool for Chrome</p>
            <div className="features-list">
              <div className="feature-item">✅ REST API Testing</div>
              <div className="feature-item">✅ OpenAI Integration</div>
              <div className="feature-item">✅ Request History</div>
              <div className="feature-item">✅ Response Analysis</div>
              <div className="feature-item">✅ AI-Assisted Requests</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button className="save-btn" onClick={handleSave}>
          💾 Save Settings
        </button>
        <button className="reset-btn" onClick={handleReset}>
          🔄 Reset to Defaults
        </button>
      </div>

      {/* Quick Tips */}
      <div className="tips-section">
        <h4>💡 Quick Tips</h4>
        <ul className="tips-list">
          <li>Use the AI assist feature to generate complex requests</li>
          <li>Set your OpenAI API key to unlock AI features</li>
          <li>Browse your request history to reuse previous calls</li>
          <li>Use preset requests to get started quickly</li>
          <li>Export responses as JSON files for analysis</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPanel;