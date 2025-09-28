import React, { useState } from 'react';

const ActionButtons = ({ tab }) => {
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    try {
      await chrome.tabs.reload(tab.id);
      setMessage('Tab refreshed successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error refreshing tab');
      console.error('Error:', error);
    }
  };

  const handleScroll = async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'scrollToTop' });
      setMessage('Scrolled to top!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error scrolling');
      console.error('Error:', error);
    }
  };

  const handleHighlight = async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'highlightLinks' });
      setMessage('Links highlighted!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error highlighting links');
      console.error('Error:', error);
    }
  };

  return (
    <div className="action-buttons">
      <h3>Actions</h3>
      {message && <div className="message">{message}</div>}
      <div className="buttons-grid">
        <button className="action-btn" onClick={handleRefresh}>
          🔄 Refresh Tab
        </button>
        <button className="action-btn" onClick={handleScroll}>
          ⬆️ Scroll to Top
        </button>
        <button className="action-btn" onClick={handleHighlight}>
          🔗 Highlight Links
        </button>
        <button className="action-btn" onClick={() => window.close()}>
          ❌ Close Sidebar
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;