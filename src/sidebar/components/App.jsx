import React, { useState, useEffect } from 'react';
import Header from './Header';
import TabInfo from './TabInfo';
import ActionButtons from './ActionButtons';

const App = () => {
  const [currentTab, setCurrentTab] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current tab information
    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        setCurrentTab(tab);
      } catch (error) {
        console.error('Error getting current tab:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentTab();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <div className="content">
        <TabInfo tab={currentTab} />
        <ActionButtons tab={currentTab} />
      </div>
    </div>
  );
};

export default App;