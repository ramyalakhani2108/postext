// Content script injected into web pages
console.log('Content script loaded');

// Example: Add a floating button to open sidebar
const addFloatingButton = () => {
  const button = document.createElement('button');
  button.textContent = '📋';
  button.title = 'Open React Sidebar';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px;
    background: linear-gradient(135deg, #4285f4, #34a853);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    width: 50px;
    height: 50px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  });
  
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openSidebar' });
  });
  
  document.body.appendChild(button);
};

// Listen for messages from sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrollToTop') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    sendResponse({ success: true });
  } else if (request.action === 'highlightLinks') {
    highlightAllLinks();
    sendResponse({ success: true });
  }
});

// Function to highlight all links on the page
const highlightAllLinks = () => {
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    link.style.cssText += `
      background-color: yellow !important;
      padding: 2px 4px !important;
      border-radius: 2px !important;
      transition: all 0.3s ease !important;
    `;
  });
  
  // Remove highlighting after 3 seconds
  setTimeout(() => {
    links.forEach(link => {
      link.style.backgroundColor = '';
      link.style.padding = '';
      link.style.borderRadius = '';
    });
  }, 3000);
};

// Add button when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addFloatingButton);
} else {
  addFloatingButton();
}