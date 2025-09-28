# AI-Powered Postman Chrome Extension 🤖

A powerful Chrome extension that brings AI-powered API testing capabilities directly to your browser - like having Postman with OpenAI integration built right in!

## ✨ Features

- **� Smart Form Detection**: Automatically analyzes any webpage and generates API requests from forms
- **🤖 AI-Powered Request Generation**: Built-in OpenAI integration (no API key required)
- **� Complete API Testing Suite**: Full REST API testing capabilities like Postman
- **📋 Intelligent Page Analysis**: Understands form fields, page content, and context
- **📚 Request History**: Save and replay your API calls with analytics
- **💾 Local Storage**: All data stays on your device, secure and private
- **🎨 Modern UI**: Beautiful React-powered interface with real-time updates
- **⚡ One-Click Generation**: From webpage to API request in seconds

## 🏗️ Project Structure

```
src/
├── manifest.json              # Extension manifest with API permissions
├── background.js              # HTTP request handler & extension logic
├── content.js                # Floating API button injection
├── popup.html/js             # Extension popup interface
└── sidebar/                   # React-powered API testing suite
    ├── sidebar.html          # Main sidebar template
    ├── sidebar.jsx           # React app entry point
    ├── components/           # Modular React components
    │   ├── App.jsx           # Main app with tab navigation
    │   ├── Header.jsx        # AI Postman branding
    │   ├── RequestBuilder.jsx # API request configuration
    │   ├── ResponseViewer.jsx # Response analysis & display
    │   ├── HistoryPanel.jsx  # Request history management
    │   └── SettingsPanel.jsx # OpenAI & app configuration
    └── styles/
        └── sidebar.css       # Modern Postman-like styling
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

### 4. Setup OpenAI API Key

1. **Get API Key**: Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Create new key**: Click "Create new secret key"
3. **Copy the key**: It starts with `sk-proj-...`
4. **Add to extension**: Open extension → Settings tab → Paste your API key
5. **Test**: Click "🧪 Test AI Features" to verify it works

### 5. Test the Extension

- **Extension Icon**: Click the AI Postman icon in Chrome toolbar
- **Floating Button**: Look for the 🤖 API button on any webpage  
- **Sidebar Access**: Click either to open the full API testing suite
- **AI Features**: Now work with your OpenAI API key

### 6. Try Smart Form Detection

1. **Visit any website with forms** (e.g., contact forms, login pages, signup forms)
2. **Open the extension** and go to the Request tab
3. **Click "🤖 Generate from Current Page"** in the Smart Page Analysis section
4. **Watch AI analyze** the page and auto-generate a complete API request
5. **Customize and send** the generated request

## 🔧 Core Functionality

### 🚀 Request Builder
- **Method Selection**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **URL Input**: Full URL with parameter support
- **Headers Management**: Add/remove custom headers dynamically
- **Body Editor**: JSON, XML, text with formatting
- **AI Assistance**: Describe requests in plain English
- **Quick Presets**: OpenAI models, Chat completions, test APIs

### 📋 Response Viewer
- **Status Codes**: Color-coded success/error indicators
- **Response Timing**: Performance monitoring
- **Body Analysis**: JSON formatting, search, highlighting
- **Headers Inspection**: Complete response header details
- **Raw Data**: Full response object inspection
- **Export Options**: Copy to clipboard, download as JSON

### 📚 History Management
- **Request Storage**: Last 50 API calls saved locally
- **Search & Filter**: Find requests by URL, method, status
- **One-Click Reload**: Instantly replay previous requests
- **Success Analytics**: Track API success rates
- **Export History**: Copy request configurations

### 🤖 AI Integration
- **OpenAI Powered**: Uses your OpenAI API key for intelligent features
- **Smart Form Analysis**: Automatically detects and analyzes webpage forms
- **Context-Aware Generation**: Understands page content, titles, and form purposes  
- **Intelligent Field Mapping**: Maps form fields to appropriate API request structure
- **One-Click API Creation**: From any webpage form to complete API request instantly

## 🛠️ Development

```bash
# Development with auto-rebuild
npm run dev

# Production build  
npm run build

# Clean build folder
npm run clean
```

**Extension Reload**: After changes, go to `chrome://extensions/` → Find "AI-Powered Postman" → Click reload button## 🎯 Real-World Examples

### 📝 Contact Form → API Request
**Scenario**: You see a contact form on a website
1. Click "🤖 Generate from Current Page"
2. AI detects: name field, email field, message textarea
3. **Generates**: `POST /api/contact` with proper JSON body
4. **Result**: Ready-to-test API request with realistic endpoint

### 🛒 E-commerce Form → API Request  
**Scenario**: Shopping cart or product form
1. AI analyzes: product fields, quantity, price, customer info
2. **Generates**: `POST /api/orders` with complete order structure
3. **Includes**: Proper headers, authentication placeholders, validation

### 👤 User Registration → API Request
**Scenario**: Signup form with multiple fields
1. AI detects: username, email, password, profile fields
2. **Generates**: `POST /api/users/register` with user object
3. **Smart mapping**: Understands field types and purposes

## 🎯 Use Cases

### For Developers
- **Form-to-API Development**: Instantly create backend APIs from frontend forms
- **API Prototyping**: Generate realistic API structures from any webpage
- **Debug Frontend Forms**: Test what API calls your forms should make
- **Rapid Development**: Skip the "what should my API look like?" phase

### For QA Teams  
- **API Testing**: Validate endpoint responses and status codes
- **Performance Monitoring**: Track response times across requests
- **Test Data Generation**: Use AI to create test scenarios
- **Regression Testing**: Replay historical requests

### For DevOps
- **Health Checks**: Monitor API availability and performance
- **Configuration Testing**: Validate different environments
- **Integration Testing**: Test service-to-service communications

## ⚙️ Configuration

### OpenAI Setup
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open extension → Settings tab
3. Paste API key and test connection
4. Use AI features in Request Builder

### Custom Headers
- Authorization tokens (Bearer, API keys)
- Content-Type specifications
- Custom business headers
- CORS headers for testing

## 🔐 Security & Privacy

- **Local Storage**: All data stored locally in Chrome
- **API Keys**: Encrypted and never transmitted except to OpenAI
- **Request History**: Kept on device, never uploaded
- **CORS Handling**: Background script bypasses browser CORS limitations

## 🚀 Advanced Features

### AI Request Generation
```
Prompt: "Create a POST request to add a new user with name and email"
AI Output: Complete request configuration with proper headers and JSON body
```

### Batch Testing
- Save multiple request configurations
- Execute test suites from history
- Monitor success/failure rates

### Response Analysis
- JSON path searching
- Response time analytics  
- Status code tracking
- Export capabilities

## 📦 Build Architecture

**Webpack Configuration**:
- React JSX → ES5 JavaScript
- CSS injection and hot reloading
- Multi-entry bundling for extension parts
- Production optimization with minification

**Chrome APIs**:
- `chrome.sidePanel` - Modern sidebar interface
- `chrome.storage` - Persistent settings and history  
- `chrome.runtime` - Background HTTP request handling
- Host permissions for cross-origin requests

## 🔧 Requirements

- **Node.js**: 16+ for build process
- **Chrome**: 114+ (Side Panel API support)
- **OpenAI API**: Optional, for AI features
- **Internet**: Required for API testing

## 🤝 Contributing

This is a complete, production-ready API testing tool. Perfect for:
- Learning Chrome extension development
- Understanding React integration
- API testing workflows
- OpenAI API integration patterns