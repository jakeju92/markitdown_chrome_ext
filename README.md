# MarkItDown Chrome Extension

MarkItDown is a Chrome extension that converts web pages to markdown format with AI-powered summaries. It supports both OpenAI and Ollama for generating summaries.

## Features

- Convert web pages to markdown format
- Generate AI-powered summaries using OpenAI or Ollama
- Customizable summary prompts with preset templates
- Support for different content types (Academic Papers, News Articles, Technical Documentation, Blog Posts)
- Save markdown files locally with organized structure

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon in Chrome toolbar
2. Click the "Configure API Settings" link
3. Choose your preferred AI provider (OpenAI or Ollama)
4. Configure the API settings:
   - For OpenAI: Enter your API key and select the model
   - For Ollama: Configure the endpoint URL and model name

## Usage

1. Navigate to any webpage you want to convert
2. Click the MarkItDown extension icon
3. Select a content type or use a custom prompt
4. Click "Convert and Save"
5. Choose where to save the markdown file

## Preset Templates

The extension includes preset templates for different content types:

- Academic Paper
- News Article
- Technical Documentation
- Blog Post

You can customize these templates or create your own in the extension popup.

## Development

### Prerequisites

- Chrome browser
- Node.js and npm (for development)
- OpenAI API key or Ollama setup for AI summaries

### Project Structure

```
markitdown/
├── manifest.json        # Extension configuration
├── popup.html          # Extension popup UI
├── popup.js           # Popup functionality
├── background.js      # Core extension logic
├── settings.html      # API settings page
├── settings.js        # Settings functionality
└── turndown.js        # HTML to Markdown conversion
```

### Building from Source

1. Clone the repository
2. Install dependencies (if any)
3. Load the extension in Chrome as an unpacked extension

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 