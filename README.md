# MarkItDown Chrome Extension

## Introduction

MarkItDown is a powerful Chrome extension that transforms web pages into well-formatted markdown documents with AI-powered summaries. It's designed for researchers, writers, developers, and anyone who needs to save, organize, and summarize web content efficiently. Especially useful for those who use Obsidian as their note-taking app.

The extension leverages advanced AI capabilities through either OpenAI's API or local Ollama models to generate comprehensive summaries of web content, making it perfect for research, content curation, and knowledge management.

## Features

- **Web Page to Markdown Conversion**: Instantly convert any web page to clean, well-formatted markdown
- **AI-Powered Summaries**: Generate intelligent summaries using:
  - OpenAI API (GPT models)
  - Ollama API (local models)
- **Customizable Summary Prompts**: Choose from preset templates or create your own:
  - Academic Paper
  - News Article
  - Technical Documentation
  - Blog Post
- **Flexible Configuration**:
  - Custom OpenAI API base URL support
  - Model selection for both OpenAI and Ollama
  - Detailed error handling with helpful troubleshooting messages
- **User-Friendly Interface**:
  - Clean, modern UI design
  - Simple one-click conversion process
  - Progress indicators during conversion and summary generation
- **Privacy-Focused**:
  - Local processing of HTML-to-markdown conversion
  - Option to use local Ollama models instead of cloud APIs
  - Secure storage of API keys

## TODOs

- [ ] Add support for PDF website export
- [ ] Add support for more AI providers (Claude, Anthropic, etc.)
- [ ] Add export options for different formats (PDF etc.)
- [ ] Implement content type auto-detection to suggest appropriate summary templates

## Installation Tutorial

### Method 1: Loading the Unpacked Extension (Development)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/markitdown_chrome_ext.git
   cd markitdown_chrome_ext
   ```

2. **Install Dependencies** (if needed)
   ```bash
   ./download_deps.sh
   ```

3. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" using the toggle in the top-right corner
   - Click "Load unpacked" and select the extension directory
   - The MarkItDown icon should appear in your Chrome toolbar

4. **Configure the Extension**
   - Click the MarkItDown icon in the toolbar
   - Click "Configure API Settings"
   - Choose your preferred AI provider:
     - For OpenAI: Enter your API key, base URL (optional), and select a model
     - For Ollama: Configure the endpoint URL and model name
   - Save your settings

### Method 2: Installing from Chrome Web Store (Coming Soon)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link will be updated when available)
2. Search for "MarkItDown" or use the direct link
3. Click "Add to Chrome"
4. Configure your API settings as described above

## About Me

I'm a passionate developer focused on creating tools that enhance productivity and knowledge management. With a background in AI and computer science, I built MarkItDown to solve my own challenges with research and note-taking.

I believe in creating tools that respect user privacy while leveraging the power of AI to enhance human capabilities. MarkItDown represents my commitment to open-source development and creating practical solutions for everyday problems.

---

If you find MarkItDown useful, consider starring the repository and contributing to its development. Your feedback and contributions are always welcome! 