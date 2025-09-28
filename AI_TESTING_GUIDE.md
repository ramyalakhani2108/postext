# AI Features Testing Guide

## 🚀 How to Test the AI-Powered Features

### 1. Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select the `dist` folder
4. The extension should now be loaded

### 2. Test AI Form Detection

#### Option A: Test on a page with forms
1. Go to any website with forms (e.g., login pages, contact forms, sign-up pages)
2. Click the PostExt extension icon or the floating 🤖 button
3. In the sidebar, go to the "Request" tab
4. Scroll down to the "AI Form Detection" panel
5. Click "Detect Forms" button
6. The AI should analyze the page and generate API request suggestions

#### Option B: Test on sample pages
Try these URLs that have forms:
- `https://www.w3schools.com/html/html_forms.asp`
- `https://developer.mozilla.org/en-US/docs/Learn/Forms/Your_first_form`
- Any login page (Gmail, Facebook, etc.)

### 3. Expected AI Behavior

#### ✅ Successful Detection
- Forms detected → generates POST/GET requests with form fields
- API endpoints detected → generates REST API calls
- No forms found → provides sample API requests (JSONPlaceholder)

#### 🔍 What the AI Detects
- **HTML Forms**: Converts to API requests with proper method and parameters
- **Form Fields**: Maps to request body or query parameters
- **API Links**: Detects links containing `/api/`, `/v1/`, etc.
- **Input Types**: Generates appropriate sample values (email, phone, etc.)

### 4. Testing Features

#### Form Analysis
```javascript
// The AI analyzes:
- Form action URLs
- HTTP methods (GET/POST)
- Input fields and types
- Required fields
- Placeholders and labels
```

#### Smart Suggestions
```javascript
// Generates:
- Proper Content-Type headers
- Sample request bodies
- Query parameters for GET requests
- JSON format for complex forms
- Multipart for file uploads
```

### 5. Debugging

#### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for AI detection logs:
   - "Starting AI form detection for tab: X"
   - "Forms data received: {...}"
   - "Generated suggestions: [...]"

#### Check Extension Console
1. Go to `chrome://extensions/`
2. Find PostExt extension
3. Click "Inspect views: background page"
4. Check console for background script logs

### 6. Sample Test Cases

#### Test Case 1: Simple Contact Form
```html
<form action="/contact" method="POST">
  <input name="name" placeholder="Your Name" required>
  <input name="email" type="email" placeholder="Email" required>
  <textarea name="message" placeholder="Message"></textarea>
  <input type="submit" value="Send">
</form>
```
**Expected**: POST request to `/contact` with name, email, message fields

#### Test Case 2: Search Form
```html
<form action="/search" method="GET">
  <input name="q" placeholder="Search query">
  <input type="submit" value="Search">
</form>
```
**Expected**: GET request to `/search` with query parameter

#### Test Case 3: No Forms
On a page with no forms (e.g., Wikipedia article)
**Expected**: Sample API requests using JSONPlaceholder

### 7. Using Generated Suggestions

1. Click on any generated suggestion
2. The request builder will be populated with:
   - HTTP method
   - URL
   - Headers
   - Parameters/Body
3. Click "Send" to test the request
4. View response in the Response tab

### 8. Troubleshooting

#### Common Issues:
- **"No forms detected"**: Normal for pages without forms, sample requests will be provided
- **Permission errors**: Make sure the extension has "All sites" permission
- **Script injection fails**: Check if the page blocks content scripts (rare)

#### Error Recovery:
- The AI always provides fallback suggestions even if detection fails
- Sample requests using JSONPlaceholder API for testing
- Error messages are logged in console for debugging

### 9. Advanced Features

#### Smart Field Detection:
- Email fields → generates `user@example.com`
- Phone fields → generates `+1234567890`
- Name fields → generates `John Doe`
- Password fields → generates secure passwords
- Date fields → generates current date format

#### Content-Type Intelligence:
- Regular forms → `application/x-www-form-urlencoded`
- File uploads → `multipart/form-data`
- JSON-like fields → `application/json`

## 🎯 Success Criteria

The AI features are working correctly if:
1. ✅ Form detection runs without errors
2. ✅ Generates relevant API requests from forms
3. ✅ Provides fallback suggestions when no forms found
4. ✅ Generated requests can be sent successfully
5. ✅ UI updates with suggestions and allows selection
6. ✅ Console shows proper logging for debugging

## 🚨 If Something Doesn't Work

1. Check the browser console for error messages
2. Reload the extension (`chrome://extensions/` → reload button)
3. Make sure you're on a page that allows content scripts
4. Try on a different website with forms
5. Check the background script console for detailed logs

The AI system is designed to be robust and always provide useful suggestions even if form detection encounters issues!