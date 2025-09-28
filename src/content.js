// Content script injected into web pages
console.log('Content script loaded');

// Add floating AI Postman button
const addFloatingButton = () => {
  const button = document.createElement('button');
  button.innerHTML = '🤖<br><small>API</small>';
  button.title = 'Open AI Postman - API Testing Tool';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 8px;
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 16px;
    width: 60px;
    height: 60px;
    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-weight: 600;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1) translateY(-2px)';
    button.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1) translateY(0)';
    button.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
  });
  
  button.addEventListener('click', () => {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = 'scale(1.1) translateY(-2px)';
    }, 100);
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
  } else if (request.action === 'highlightForms') {
    highlightPageForms();
    sendResponse({ success: true });
  }
});

// Function to highlight forms on the page
const highlightPageForms = () => {
  const forms = document.querySelectorAll('form');
  const inputs = document.querySelectorAll('input, select, textarea');
  
  // Highlight forms
  forms.forEach(form => {
    form.style.cssText += `
      outline: 3px solid #48bb78 !important;
      outline-offset: 2px !important;
      background-color: rgba(72, 187, 120, 0.1) !important;
      border-radius: 4px !important;
      transition: all 0.3s ease !important;
    `;
  });
  
  // Highlight individual inputs
  inputs.forEach(input => {
    input.style.cssText += `
      outline: 2px solid #667eea !important;
      outline-offset: 1px !important;
      background-color: rgba(102, 126, 234, 0.1) !important;
      transition: all 0.3s ease !important;
    `;
  });
  
  // Add floating indicator
  const indicator = document.createElement('div');
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #48bb78, #38a169);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 600;
    ">
      🤖 ${forms.length} Forms & ${inputs.length} Fields Detected
    </div>
  `;
  document.body.appendChild(indicator);
  
  // Remove highlighting after 5 seconds
  setTimeout(() => {
    forms.forEach(form => {
      form.style.outline = '';
      form.style.outlineOffset = '';
      form.style.backgroundColor = '';
      form.style.borderRadius = '';
    });
    
    inputs.forEach(input => {
      input.style.outline = '';
      input.style.outlineOffset = '';
      input.style.backgroundColor = '';
    });
    
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 5000);
};

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