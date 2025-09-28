// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const openSidebarBtn = document.getElementById('openSidebar');
  const optionsBtn = document.getElementById('options');
  
  openSidebarBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    } catch (error) {
      console.error('Error opening sidebar:', error);
    }
  });
  
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});