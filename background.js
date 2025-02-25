// Function to generate summary using OpenAI
async function generateOpenAISummary(content, prompt, apiKey, model) {
  // Log the prompt and content
  console.log('OpenAI API Request:');
  console.log('==================');
  console.log(`Prompt:\n${prompt}\n`);
  console.log(`Content:\n${content}\n`);
  console.log('==================');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes web content.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nContent to summarize:\n${content}`
        }
      ],
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Task queue implementation
class TaskQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async addTask(task) {
    this.queue.push(task);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue[0];
      try {
        await task();
      } catch (error) {
        console.error('Task processing error:', error);
      }
      this.queue.shift();
    }
    this.isProcessing = false;
  }
}

const taskQueue = new TaskQueue();

// Function to generate summary using Ollama
async function generateOllamaSummary(content, prompt, endpoint, model) {
  try {
    console.log('Generating summary using Ollama...');
    
    // Remove trailing slash and ensure proper format
    endpoint = endpoint.replace(/\/$/, '');
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = 'http://' + endpoint;
    }

    console.log('Sending request to Ollama at:', endpoint);
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': chrome.runtime.getURL(''),
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        model: model,
        prompt: `You are a helpful assistant that summarizes web content. Please summarize the following content according to this prompt:\n\n${prompt}\n\nContent to summarize:\n${content}`,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      })
    });

    console.log('Ollama response status:', response.status);
    console.log('Ollama response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama error response:', errorText);
      
      if (response.status === 403) {
        throw new Error(
          'Access forbidden. Please check:\n' +
          '1. Ollama server is running with correct permissions\n' +
          '2. No firewall or security policy is blocking the connection\n' +
          '3. The server is configured to accept requests from the extension\n' +
          '4. Try running: ollama serve --allow-origins "*"'
        );
      }
      
      throw new Error(`Ollama API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('Ollama summary generation successful, response:', data);

    if (!data.response) {
      throw new Error('Invalid response from Ollama API');
    }

    return data.response.trim();
  } catch (error) {
    console.error('Ollama summary generation error:', error);
    
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(
        `Could not connect to Ollama server at ${endpoint}.\n\n` +
        'Please check:\n' +
        '1. Ollama server is running (run: ollama serve)\n' +
        '2. The endpoint URL is correct\n' +
        '3. Your network connection\n' +
        '4. No firewall is blocking the connection\n' +
        '5. Try running: ollama serve --allow-origins "*"'
      );
    }
    
    throw error;
  }
}

// Function to update markdown file with summary
async function updateMarkdownWithSummary(filePath, summary) {
  try {
    // Read the current content
    const response = await fetch(`file://${filePath}`);
    const content = await response.text();
    
    // Find the position of the AI Summary section
    const summarySection = '## AI-Generated Summary\n\n';
    const summaryIndex = content.indexOf(summarySection);
    
    if (summaryIndex === -1) {
      throw new Error('Could not find AI Summary section in the markdown file');
    }
    
    // Replace the placeholder with actual summary
    const newContent = content.replace(
      summarySection + "AI summary generation is currently disabled for testing.",
      summarySection + summary
    );
    
    // Write the updated content back to the file
    const blob = new Blob([newContent], { type: 'text/markdown' });
    const writer = await window.showSaveFilePicker({
      suggestedName: filePath.split('/').pop(),
      types: [{
        description: 'Markdown files',
        accept: { 'text/markdown': ['.md'] }
      }]
    });
    const writable = await writer.createWritable();
    await writable.write(blob);
    await writable.close();
    
    return true;
  } catch (error) {
    console.error('Error updating markdown file:', error);
    throw error;
  }
}

// Function to check Ollama connection
async function checkOllamaConnection(endpoint, model) {
  try {
    console.log('Checking Ollama connection to:', endpoint);
    
    // Remove trailing slash and ensure proper format
    endpoint = endpoint.replace(/\/$/, '');
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = 'http://' + endpoint;
    }

    // First check if the server is running
    try {
      const versionResponse = await fetch(`${endpoint}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!versionResponse.ok) {
        throw new Error(`Server returned ${versionResponse.status}: ${versionResponse.statusText}`);
      }
      
      const versionData = await versionResponse.json();
      console.log('Ollama version:', versionData.version);
    } catch (error) {
      console.error('Ollama server check failed:', error);
      throw new Error(`Could not connect to Ollama server at ${endpoint}. Please check if the server is running.`);
    }
    
    // Then check if the model is available
    try {
      const modelResponse = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!modelResponse.ok) {
        throw new Error(`Server returned ${modelResponse.status}: ${modelResponse.statusText}`);
      }
      
      const modelData = await modelResponse.json();
      console.log('Available models:', modelData.models);
      
      const modelExists = modelData.models.some(m => m.name === model);
      if (!modelExists) {
        throw new Error(`Model "${model}" not found. Please pull the model first with: ollama pull ${model}`);
      }
    } catch (error) {
      console.error('Ollama model check failed:', error);
      if (error.message.includes('Model')) {
        throw error;
      } else {
        throw new Error(`Could not check available models. Please ensure Ollama server is running correctly.`);
      }
    }
    
    // Connection successful
    chrome.runtime.sendMessage({
      action: "connectionStatus",
      status: "success"
    });
    
    return true;
  } catch (error) {
    console.error('Ollama connection check error:', error);
    chrome.runtime.sendMessage({
      action: "connectionStatus",
      status: "error",
      error: error.message
    });
    return false;
  }
}

// Message handler for content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "convert") {
    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        chrome.runtime.sendMessage({
          action: "error",
          error: "No valid tab found. Please try again on a webpage."
        });
        return;
      }
      
      // Add the conversion task to the queue
      taskQueue.addTask(async () => {
        try {
          // Get settings
          const settings = await chrome.storage.local.get([
            'aiProvider',
            'openaiKey',
            'openaiModel',
            'ollamaEndpoint',
            'ollamaModel'
          ]);

          // Send progress update
          chrome.runtime.sendMessage({
            action: "progress",
            message: "Extracting page content..."
          });

          // Send message to content script to extract content
          const response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "convert" }, (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to extract content from the page');
          }

          const { title, content } = response;

          // Create initial markdown content without summary
          const initialMarkdown = `# ${title}\n\n## AI-Generated Summary\n\nGenerating summary...\n\n## Original Content\n\n${content}`;

          // Show save dialog
          const handle = await window.showSaveFilePicker({
            suggestedName: `${title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase()}.md`,
            types: [{
              description: 'Markdown files',
              accept: { 'text/markdown': ['.md'] }
            }]
          });

          // Save initial content
          const writable = await handle.createWritable();
          await writable.write(initialMarkdown);
          await writable.close();

          // Generate summary
          chrome.runtime.sendMessage({
            action: "progress",
            message: "Generating AI summary..."
          });

          let summary;
          if (settings.aiProvider === 'ollama') {
            try {
              summary = await generateOllamaSummary(
                content,
                message.prompt || "Please provide a comprehensive summary of this content.",
                settings.ollamaEndpoint,
                settings.ollamaModel
              );
            } catch (error) {
              console.error('Summary generation error:', error);
              summary = "Failed to generate summary: " + error.message;
            }
          } else {
            throw new Error('Only Ollama is supported for now');
          }

          // Update the file with the summary
          chrome.runtime.sendMessage({
            action: "progress",
            message: "Updating file with summary..."
          });

          const finalMarkdown = `# ${title}\n\n## AI-Generated Summary\n\n${summary}\n\n## Original Content\n\n${content}`;
          
          // Save final content
          const finalWritable = await handle.createWritable();
          await finalWritable.write(finalMarkdown);
          await finalWritable.close();

          // Send completion message
          chrome.runtime.sendMessage({
            action: "progress",
            message: "Conversion and summary completed successfully!"
          });

        } catch (error) {
          console.error('Task error:', error);
          chrome.runtime.sendMessage({
            action: "error",
            error: error.message
          });
        }
      });
    });
  } else if (message.action === "checkOllamaConnection") {
    // Check Ollama connection
    checkOllamaConnection(message.endpoint, message.model);
  }
});

// Function to extract main content from a webpage
async function extractMainContent() {
  try {
    // Get the page title
    const title = document.title || 'Untitled Page';

    // Ensure TurndownService is available
    if (typeof TurndownService === 'undefined') {
      throw new Error('Turndown library not loaded properly. Please reload the page and try again.');
    }

    console.log('TurndownService is available:', !!TurndownService);

    // Initialize TurndownService with options
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
      bulletListMarker: '-',
      hr: '---',
    });

    // Configure Turndown to handle code blocks better
    turndownService.addRule('fencedCodeBlock', {
      filter: function (node, options) {
        return (
          node.nodeName === 'PRE' &&
          node.firstChild &&
          node.firstChild.nodeName === 'CODE'
        );
      },
      replacement: function (content, node, options) {
        const code = node.firstChild.textContent;
        const lang = node.firstChild.className.replace('language-', '');
        return '\n```' + lang + '\n' + code + '\n```\n';
      }
    });

    // Get the main content
    let mainElement = null;
    const article = document.querySelector('article');
    const main = document.querySelector('main');
    
    if (article) {
      mainElement = article;
      console.log('Using article element for content');
    } else if (main) {
      mainElement = main;
      console.log('Using main element for content');
    } else {
      // Find the div with the most content
      let maxLength = 0;
      document.querySelectorAll('div').forEach(div => {
        // Skip certain elements that typically don't contain main content
        if (div.id && (
          div.id.toLowerCase().includes('nav') ||
          div.id.toLowerCase().includes('header') ||
          div.id.toLowerCase().includes('footer') ||
          div.id.toLowerCase().includes('menu')
        )) {
          return;
        }
        
        if (div.className && (
          div.className.toLowerCase().includes('nav') ||
          div.className.toLowerCase().includes('header') ||
          div.className.toLowerCase().includes('footer') ||
          div.className.toLowerCase().includes('menu')
        )) {
          return;
        }

        const length = div.textContent.length;
        if (length > maxLength) {
          maxLength = length;
          mainElement = div;
        }
      });
      
      if (!mainElement) {
        mainElement = document.body;
      }
      console.log('Using fallback element for content:', mainElement);
    }

    // Convert HTML to Markdown
    console.log('Converting content to markdown...');
    const mainContent = turndownService.turndown(mainElement);

    if (!mainContent.trim()) {
      throw new Error('No content found on the page');
    }

    console.log('Content extraction successful');
    return { title, content: mainContent };
  } catch (error) {
    console.error('Content extraction error:', error);
    throw new Error(`Failed to extract content: ${error.message}`);
  }
} 