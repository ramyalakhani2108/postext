# Chrome Extension with React Sidebar

A Chrome extension with a React-powered sidebar panel.

## Features

- **React Sidebar**: Modern React components with hooks
- **Side Panel API**: Uses Chrome's official side panel API
- **Content Script**: Adds floating button to web pages
- **Background Script**: Handles extension lifecycle and messaging
- **Modern Build**: Webpack + Babel for React/JSX support

## Project Structure

```
src/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script for web pages
├── popup.html            # Extension popup
├── popup.js              # Popup functionality
└── sidebar/              # React sidebar components
    ├── sidebar.html      # Sidebar HTML template
    ├── sidebar.jsx       # React entry point
    ├── components/       # React components
    │   ├── App.jsx
    │   ├── Header.jsx
    │   ├── TabInfo.jsx
    │   └── ActionButtons.jsx
    └── styles/
        └── sidebar.css   # Sidebar styles
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### 4. Test the Extension

- Click the extension icon in the toolbar to open popup
- Click "Open Sidebar" to open the React sidebar
- The sidebar shows current tab information and action buttons
- A floating button is also added to web pages

## Development

- **Watch Mode**: Run `npm run dev` for automatic rebuilds
- **Clean Build**: Run `npm run clean` then `npm run build`
- **Reload Extension**: Go to `chrome://extensions/` and click reload

## Extension Features

### Sidebar Panel
- Shows current tab information (title, URL, status)
- Action buttons for tab manipulation
- Modern React components with hooks
- Responsive design with CSS gradients

### Content Script
- Adds floating button to all web pages
- Communicates with background script
- Can be extended for page manipulation

### Background Script
- Handles extension lifecycle
- Manages side panel opening
- Message passing between components

## Customization

- **Styles**: Edit `src/sidebar/styles/sidebar.css`
- **Components**: Add new React components in `src/sidebar/components/`
- **Permissions**: Update `src/manifest.json` for additional Chrome APIs
- **Content Features**: Extend `src/content.js` for page interactions

## Build Process

The project uses Webpack to bundle:
- React JSX components → JavaScript
- CSS styles → Injected styles
- Multiple entry points for different extension parts
- Development and production modes

## Chrome APIs Used

- `chrome.sidePanel` - Side panel management
- `chrome.tabs` - Tab information and control
- `chrome.runtime` - Extension messaging
- `chrome.action` - Extension icon clicks

## Requirements

- Node.js 16+ 
- Chrome 114+ (for side panel API)
- Modern browser with ES6+ support