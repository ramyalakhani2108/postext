// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Listen for action button click
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel
  chrome.sidePanel.open({ tabId: tab.id });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidebar') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ success: true });
  }
});