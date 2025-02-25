Product Requirements Document (PRD) for "MarkItDown" Chrome Extension
1. Overview
1.1 Purpose
The "MarkItDown" Chrome Extension allows users to convert the content of the current website into a markdown (.md) file, generate a basic summary of the website, and save the resulting file to their computer. This tool is designed to streamline content extraction and summarization for writers, researchers, and anyone needing to archive or process web content in markdown format.
1.2 Target Audience
Writers and content creators who prefer working in markdown.
Researchers archiving webpage content for documentation.
Developers or technical users familiar with markdown syntax.
General users seeking a quick way to save and summarize web content.
1.3 Objectives
Enable users to convert HTML content of a webpage to markdown with a single click.
Provide a basic summary including the page title and introductory text.
Save the markdown file locally with minimal user effort.
Ensure privacy by processing data locally without external server dependencies.
2. Features
2.1 MarkItDown Conversion
Description: Convert the HTML content of the current webpage into markdown format.
Details: 
Use the Turndown JavaScript library to parse and convert HTML to markdown.
Capture the entire document.body content for conversion.
Output: A markdown string representing the webpage content.
2.2 Summary Generation
Description: Generate an AI-powered summary of the webpage using OpenAI or Ollama APIs and include it in the markdown file.
Details: 
- Extract the webpage title (document.title) as the primary summary heading
- Support multiple AI providers for summary generation:
  - OpenAI API (GPT models)
  - Ollama API (local models)
- Allow users to configure their preferred AI provider and API settings
- Support customizable prompts with preset templates:
  - Default prompt template provided
  - Preset prompts for different content types:
    1. Academic Paper:
       "Summarize this paper in four sections:
       1. TL;DR (one paragraph)
       2. Motivation and Research Goals
       3. Methods and Approach
       4. Key Conclusions and Implications"
    
    2. News Article:
       "Provide a structured summary of this news article:
       1. TL;DR (2-3 sentences)
       2. Background Context
       3. Key Arguments/Points
       4. Timeline of Events"
    
    3. Technical Documentation:
       "Summarize this technical documentation:
       1. TL;DR (what problem does it solve?)
       2. Key Features/Components
       3. Implementation Details
       4. Usage Examples"
    
    4. Blog Post:
       "Provide a reader-friendly summary:
       1. Main Takeaway
       2. Key Points
       3. Supporting Arguments
       4. Practical Applications"
  - Users can modify preset prompts or create custom ones
  - Save last used prompt as user preference
  - Auto-detect content type and suggest appropriate preset
- Generate a concise summary using the selected AI service and prompt
- Include both the AI summary and first paragraph in the markdown output
Output: A markdown section with the title, AI-generated summary, first paragraph, followed by the full converted content.
2.3 Save as .md File
Description: Save the generated markdown content, including the summary, as a .md file on the user's computer.
Details: 
Use Chrome's Downloads API to save the file.
Generate a filename based on the webpage title (sanitized to remove special characters) or default to page.md.
Prompt the user to choose a save location via the browser's native download dialog.
Output: A .md file downloaded to the user's chosen location.
2.4 User Interface
Description: Provide a simple interface to trigger the conversion and saving process.
Details: 
A browser action (toolbar icon) that opens a popup.
A single "Convert and Save" button in the popup to initiate the process.
Output: A minimal popup UI with a clear call-to-action.
3. Functional Requirements
3.1 Extension Architecture
Manifest Version: Use Manifest V3 for compatibility with modern Chrome standards.
Components:
Popup: popup.html and popup.js for user interaction.
Background Service Worker: background.js to handle scripting, API calls, and downloads.
Injected Script: convert.js to process webpage content and generate markdown.
Library: turndown.js for HTML-to-markdown conversion.
Settings: settings.html and settings.js for API configuration
Permissions:
activeTab: Access the current tab when the extension is invoked.
downloads: Enable saving files to the user's computer.
scripting: Inject scripts into the current tab.
storage: Store API keys and preferences
3.2 Workflow
User Action: User clicks the extension icon in the Chrome toolbar.
Popup Display: A popup opens with:
- "Convert and Save" button
- AI provider selection dropdown (OpenAI/Ollama)
- Settings icon to configure API keys
Initial Setup:
- User configures API settings (keys, endpoints) via settings page
- Settings are stored securely in Chrome storage
Trigger: User clicks the button, sending a message to the background script.
Script Injection: Background script injects turndown.js and convert.js into the current tab.
Content Processing: 
- convert.js extracts the webpage content
- Sends content to background script
- Background script calls selected AI API for summary generation
- Converts document.body.innerHTML to markdown using Turndown
- Combines AI summary, content summary and markdown
File Saving: Background script creates a blob and saves via Downloads API.
Completion: Download prompt appears, and user saves the file.
3.3 File Naming
Default: Use the webpage title, sanitized (e.g., replace non-alphanumeric characters with underscores, lowercase), as the filename (e.g., my_page_title.md).
Fallback: If the title is unavailable or empty, use page.md.
4. Non-Functional Requirements
4.1 Performance
Speed: 
- Conversion and saving should complete within 5 seconds for average-sized webpages
- AI summary generation should complete within 10 seconds
- Prompt saving and loading should be instantaneous
Resource Usage: 
- Minimize memory and CPU usage
- Cache API responses when possible
- Handle API rate limits gracefully
- Store prompt history efficiently
4.2 Privacy
Local Processing: HTML-to-markdown conversion occurs client-side
API Security:
- Store API keys securely in Chrome storage
- Send only necessary content to AI APIs
- Support for local Ollama deployment
User Control: 
- Users choose AI provider
- Option to disable AI summary
- Full control over saved file location
4.3 Compatibility
Browser: Compatible with Google Chrome (latest stable version).
Webpages: Works on most standard HTML webpages; graceful fallback for pages with no <p> elements.
4.4 Maintainability
Modularity: Separate concerns into popup, background, and injected scripts.
Extensibility: Allow for future enhancements (e.g., advanced summarization via API).
5. Implementation Details
5.1 File Structure
website-to-markdown/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── convert.js
├── turndown.js
├── settings.html
├── settings.js
└── api/
    ├── openai.js
    └── ollama.js
5.2 Code Snippets
manifest.json
json
{
  "manifest_version": 3,
  "name": "MarkItDown",
  "version": "1.0",
  "description": "Convert current MarkItDown and save as .md file",
  "permissions": ["activeTab", "downloads", "scripting", "storage"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
popup.html
html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Convert to Markdown</title>
  <style>
    .prompt-area {
      margin: 10px 0;
    }
    textarea {
      width: 100%;
      min-height: 80px;
    }
    .preset-selector {
      margin-bottom: 10px;
    }
    .custom-prompt {
      margin-top: 10px;
    }
    .preset-config {
      margin: 10px 0;
    }
    .preset-config textarea {
      min-height: 100px;
    }
    .config-button {
      margin: 5px;
    }
  </style>
</head>
<body>
  <div class="prompt-area">
    <div class="preset-selector">
      <label for="contentType">Content Type:</label>
      <select id="contentType">
        <option value="custom">Custom Prompt</option>
        <option value="paper">Academic Paper</option>
        <option value="news">News Article</option>
        <option value="docs">Technical Documentation</option>
        <option value="blog">Blog Post</option>
      </select>
      <button id="configPreset" class="config-button">⚙️ Configure Preset</button>
    </div>
    
    <div id="presetConfig" class="preset-config" style="display: none;">
      <h3>Configure Preset Template</h3>
      <textarea id="presetTemplate"></textarea>
      <div>
        <button id="savePreset">Save Preset</button>
        <button id="resetPreset">Reset to Default</button>
        <button id="closeConfig">Close</button>
      </div>
    </div>

    <div class="custom-prompt">
      <label for="summaryPrompt">Summary Prompt:</label>
      <textarea id="summaryPrompt"></textarea>
    </div>
  </div>
  <button id="convertBtn">Convert and Save</button>
  <script src="popup.js"></script>
</body>
</html>
popup.js
javascript
const defaultPresetPrompts = {
  paper: `Summarize this paper in four sections:
1. TL;DR (one paragraph)
2. Motivation and Research Goals
3. Methods and Approach
4. Key Conclusions and Implications`,
  
  news: `Provide a structured summary of this news article:
1. TL;DR (2-3 sentences)
2. Background Context
3. Key Arguments/Points
4. Timeline of Events`,
  
  docs: `Summarize this technical documentation:
1. TL;DR (what problem does it solve?)
2. Key Features/Components
3. Implementation Details
4. Usage Examples`,
  
  blog: `Provide a reader-friendly summary:
1. Main Takeaway
2. Key Points
3. Supporting Arguments
4. Practical Applications`
};

let presetPrompts = {};

// Load saved prompts and content type from storage
chrome.storage.local.get(['summaryPrompt', 'contentType', 'customPresets'], (result) => {
  if (result.customPresets) {
    presetPrompts = { ...defaultPresetPrompts, ...result.customPresets };
  } else {
    presetPrompts = { ...defaultPresetPrompts };
  }
  
  if (result.contentType) {
    document.getElementById('contentType').value = result.contentType;
  }
  if (result.summaryPrompt) {
    document.getElementById('summaryPrompt').value = result.summaryPrompt;
  }
});

// Handle content type changes
document.getElementById('contentType').addEventListener('change', (e) => {
  const type = e.target.value;
  const promptArea = document.getElementById('summaryPrompt');
  if (type !== 'custom') {
    promptArea.value = presetPrompts[type];
  }
});

// Configure preset button
document.getElementById('configPreset').addEventListener('click', () => {
  const type = document.getElementById('contentType').value;
  if (type !== 'custom') {
    const presetConfig = document.getElementById('presetConfig');
    const presetTemplate = document.getElementById('presetTemplate');
    presetTemplate.value = presetPrompts[type];
    presetConfig.style.display = 'block';
  }
});

// Save preset configuration
document.getElementById('savePreset').addEventListener('click', () => {
  const type = document.getElementById('contentType').value;
  const newTemplate = document.getElementById('presetTemplate').value;
  presetPrompts[type] = newTemplate;
  
  // Save to storage
  chrome.storage.local.get(['customPresets'], (result) => {
    const customPresets = result.customPresets || {};
    customPresets[type] = newTemplate;
    chrome.storage.local.set({ customPresets });
  });
  
  // Update current prompt
  document.getElementById('summaryPrompt').value = newTemplate;
  document.getElementById('presetConfig').style.display = 'none';
});

// Reset preset to default
document.getElementById('resetPreset').addEventListener('click', () => {
  const type = document.getElementById('contentType').value;
  const defaultTemplate = defaultPresetPrompts[type];
  document.getElementById('presetTemplate').value = defaultTemplate;
});

// Close config panel
document.getElementById('closeConfig').addEventListener('click', () => {
  document.getElementById('presetConfig').style.display = 'none';
});

// Auto-detect content type
function detectContentType() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: () => {
        // Simple detection logic
        const hasPDF = document.querySelector('embed[type="application/pdf"]');
        const hasNews = document.querySelector('article') || 
                       window.location.href.includes('news');
        const hasDocs = document.querySelector('technical') || 
                       window.location.href.includes('docs');
        return {
          isPaper: hasPDF,
          isNews: hasNews,
          isDocs: hasDocs
        };
      }
    }, (results) => {
      const type = results[0].result;
      const select = document.getElementById('contentType');
      if (type.isPaper) select.value = 'paper';
      else if (type.isNews) select.value = 'news';
      else if (type.isDocs) select.value = 'docs';
      // Trigger change event to update prompt
      select.dispatchEvent(new Event('change'));
    });
  });
}

// Run detection on popup open
detectContentType();

document.getElementById('convertBtn').addEventListener('click', () => {
  const prompt = document.getElementById('summaryPrompt').value;
  // Save prompt for next use
  chrome.storage.local.set({ summaryPrompt: prompt });
  // Send message with prompt
  chrome.runtime.sendMessage({
    action: "convert",
    prompt: prompt
  });
});
background.js
javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "convert") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const tabId = tabs[0].id;
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['turndown.js', 'convert.js']
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.markdown) {
    const blob = new Blob([message.markdown], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);
    const filename = message.title ? `${message.title}.md` : 'page.md';
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }
});
convert.js
javascript
const turndownService = new TurndownService();
const title = document.title;
const firstParagraph = document.querySelector('p')?.innerText || '';
const summary = `# Summary\n\n**Title:** ${title}\n\n**First Paragraph:** ${firstParagraph}\n\n`;
const markdown = summary + turndownService.turndown(document.body.innerHTML);
const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
chrome.runtime.sendMessage({markdown: markdown, title: safeTitle});
turndown.js
Download from Turndown GitHub and include in the extension folder.
settings.html
html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MarkItDown Settings</title>
</head>
<body>
  <h2>API Settings</h2>
  <select id="aiProvider">
    <option value="openai">OpenAI</option>
    <option value="ollama">Ollama</option>
  </select>
  
  <div id="openaiSettings">
    <label>OpenAI API Key:
      <input type="password" id="openaiKey">
    </label>
  </div>
  
  <div id="ollamaSettings">
    <label>Ollama Endpoint:
      <input type="text" id="ollamaEndpoint" value="http://localhost:11434">
    </label>
    <label>Model Name:
      <input type="text" id="ollamaModel" value="llama2">
    </label>
  </div>
  
  <button id="saveSettings">Save Settings</button>
  <script src="settings.js"></script>
</body>
</html>
5.3 Dependencies
Turndown: A lightweight, client-side JavaScript library for converting HTML to markdown. No external APIs or server-side processing required.
6. User Experience
6.1 User Flow
Invoke Extension: Click the extension icon in the Chrome toolbar.
Popup Interaction: See a popup with a "Convert and Save" button and click it.
Processing: Extension processes the webpage content (transparent to the user).
Download Prompt: Browser displays a save dialog with a suggested filename (e.g., page_title.md).
Completion: User selects a save location, and the .md file is downloaded.
6.2 Error Handling
No Paragraphs: If no <p> element exists, the summary includes only the title with an empty "First Paragraph" field.
Empty Page: If the page has no content, save a markdown file with just the summary section.
Permission Denial: Notify the user via console logs (future versions could add popup alerts).
7. Future Enhancements
Support for additional AI providers
Prompt templates library
Prompt history and favorites
Custom prompt variables (e.g., {title}, {url})
Summary length configuration
Batch processing of multiple pages
Export summary statistics
Support for additional output formats
8. Testing Plan
Unit Tests: Validate Turndown conversion for common HTML elements (headings, paragraphs, lists).
Integration Tests: Ensure message passing between popup, background, and injected scripts works seamlessly.
User Tests: Test on various websites (blogs, news, documentation) to verify markdown accuracy and usability.
Edge Cases: Test on pages with no text, heavy JavaScript, or iframes.
9. Success Metrics
Adoption: 100+ downloads within the first month post-launch.
Usability: Positive user feedback on ease of use and file output quality.
Performance: 95% of conversions complete within 5 seconds.
10. Conclusion
The "MarkItDown" Chrome Extension provides a simple, privacy-focused solution for converting webpages to markdown and saving them with a basic summary. By leveraging local processing and Chrome's native APIs, it delivers a lightweight and efficient tool that meets the needs of markdown enthusiasts and casual users alike.
