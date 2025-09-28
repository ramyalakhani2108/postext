import React from 'react';

const TabInfo = ({ tab }) => {
  if (!tab) {
    return (
      <div className="tab-info">
        <h3>No tab information available</h3>
      </div>
    );
  }

  return (
    <div className="tab-info">
      <h3>Current Tab</h3>
      <div className="tab-details">
        <div className="detail-item">
          <strong>Title:</strong>
          <span>{tab.title}</span>
        </div>
        <div className="detail-item">
          <strong>URL:</strong>
          <span className="url">{tab.url}</span>
        </div>
        <div className="detail-item">
          <strong>Status:</strong>
          <span className={`status ${tab.status}`}>{tab.status}</span>
        </div>
      </div>
    </div>
  );
};

export default TabInfo;