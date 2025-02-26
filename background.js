// Function to generate summary using OpenAI
async function generateOpenAISummary(content, prompt, apiKey, model, baseUrl = 'https://api.openai.com') {
  // Log the prompt and content
  console.log('OpenAI API Request:');
  console.log('==================');
  console.log(`Prompt:\n${prompt}\n`);
  console.log(`Content:\n${content}\n`);
  console.log(`Base URL: ${baseUrl}`);
  console.log('==================');

  // Remove trailing slash and ensure proper format
  baseUrl = baseUrl.replace(/\/$/, '');
  
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
      const errorData = await response.text();
      console.error('OpenAI API error response:', errorData);
      
      try {
        // Try to parse the error as JSON
        const errorJson = JSON.parse(errorData);
        if (errorJson.error) {
          throw new Error(`OpenAI API error: ${errorJson.error.message || errorJson.error.type || 'Unknown error'}`);
        }
      } catch (parseError) {
        // If parsing fails, use the status text or raw error data
        throw new Error(`OpenAI API error (${response.status}): ${response.statusText || errorData}`);
      }
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API request failed:', error);
    
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(
        `Could not connect to OpenAI API at ${baseUrl}.\n\n` +
        'Please check:\n' +
        '1. Your internet connection\n' +
        '2. The API base URL is correct\n' +
        '3. No firewall is blocking the connection'
      );
    }
    
    // Re-throw the error with the original message
    throw error;
  }
}

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
    
    // Write the updated content back to the file using chrome.downloads.download
    const blob = new Blob([newContent], { type: 'text/markdown' });
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to create data URL'));
      reader.readAsDataURL(blob);
    });
    
    // Use chrome.downloads.download with data URL
    const filename = filePath.split('/').pop();
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(downloadId);
        }
      });
    });
    
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
    
    // Test connection with a simple request
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': chrome.runtime.getURL(''),
        'Access-Control-Allow-Origin': '*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Ollama server returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Ollama connection successful, available models:', data);
    
    // Check if the specified model is available
    if (model && data.models) {
      const modelExists = data.models.some(m => m.name === model);
      if (!modelExists) {
        throw new Error(`Model "${model}" not found on Ollama server. Available models: ${data.models.map(m => m.name).join(', ')}`);
      }
    }
    
    // Send success message to popup
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

// Track which tabs have content scripts ready
const contentScriptReadyTabs = new Set();

// Function to check if content script is ready in a tab
async function isContentScriptReady(tabId) {
  // If we already know it's ready, return true
  if (contentScriptReadyTabs.has(tabId)) {
    return true;
  }
  
  // Otherwise, ping the content script
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: "ping" }, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    if (response && response.success) {
      contentScriptReadyTabs.add(tabId);
      return true;
    }
    return false;
  } catch (error) {
    console.log('Content script not ready:', error.message);
    return false;
  }
}

// Listen for content script ready messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "contentScriptReady" && sender.tab && sender.tab.id) {
    console.log('Content script ready in tab:', sender.tab.id);
    contentScriptReadyTabs.add(sender.tab.id);
    sendResponse({ received: true });
    return false;
  }
  return true;
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (contentScriptReadyTabs.has(tabId)) {
    contentScriptReadyTabs.delete(tabId);
    console.log('Removed tab from ready list:', tabId);
  }
});

// Message handler for content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "convert") {
    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        chrome.runtime.sendMessage({
          action: "error",
          error: "No valid tab found. Please try again on a webpage."
        }).catch(err => console.error('Error sending message:', err));
        return;
      }
      
      // Execute conversion task directly instead of using queue
      try {
        // Get settings
        const settings = await chrome.storage.local.get([
          'aiProvider',
          'openaiKey',
          'openaiModel',
          'ollamaEndpoint',
          'ollamaModel',
          'openaiBaseUrl'
        ]);

        // Send progress update
        try {
          await chrome.runtime.sendMessage({
            action: "progress",
            message: "Extracting page content..."
          });
        } catch (error) {
          console.warn('Could not send progress message, popup might be closed:', error);
          // Continue with the process even if we can't update the UI
        }

        // Check if the tab still exists before sending message
        const tabExists = await new Promise(resolve => {
          chrome.tabs.get(tabs[0].id, tab => {
            resolve(!chrome.runtime.lastError && tab);
          });
        });

        if (!tabExists) {
          throw new Error('The tab no longer exists. Please try again on an open webpage.');
        }
        
        // Check if content script is ready
        const contentScriptReady = await isContentScriptReady(tabs[0].id);
        if (!contentScriptReady) {
          // Try to inject the content script
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['turndown.js', 'content.js']
            });
            
            // Wait a bit for the content script to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check again
            const retryReady = await isContentScriptReady(tabs[0].id);
            if (!retryReady) {
              throw new Error('Content script could not be initialized. Please refresh the page and try again.');
            }
          } catch (error) {
            throw new Error('Failed to inject content script: ' + error.message);
          }
        }

        // Send message to content script to extract content
        const response = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "convert" }, response => {
            if (chrome.runtime.lastError) {
              // Check if it's the "receiving end does not exist" error
              if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                reject(new Error('Content script is not ready. Please refresh the page and try again.'));
              } else {
                reject(chrome.runtime.lastError);
              }
            } else if (!response) {
              reject(new Error('No response from content script. Please refresh the page and try again.'));
            } else {
              resolve(response);
            }
          });
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to extract content from the page');
        }

        const { title, content, url } = response;

        // Create initial markdown content without summary
        const initialMarkdown = `# ${title}\n\n## AI-Generated Summary\n\nGenerating summary...\n\n## Original Content\n\n[Original website](${url})\n\n${content}`;

        // Send progress update for summary generation
        try {
          await chrome.runtime.sendMessage({
            action: "progress",
            message: "Generating AI summary..."
          });
        } catch (error) {
          console.warn('Could not send progress message, popup might be closed:', error);
          // Continue with the process even if we can't update the UI
        }

        // Generate summary
        let summary;
        try {
          if (settings.aiProvider === 'ollama') {
            summary = await generateOllamaSummary(
              content,
              message.prompt || "Please provide a comprehensive summary of this content.",
              settings.ollamaEndpoint,
              settings.ollamaModel
            );
          } else if (settings.aiProvider === 'openai') {
            // Validate OpenAI settings before making the API call
            if (!settings.openaiKey) {
              throw new Error('OpenAI API key is not configured. Please configure it in the settings.');
            }
            
            if (!settings.openaiModel) {
              console.warn('OpenAI model not specified, using default model');
            }
            
            if (!settings.openaiBaseUrl) {
              console.warn('OpenAI base URL not specified, using default URL');
            }
            
            try {
              summary = await generateOpenAISummary(
                content,
                message.prompt || "Please provide a comprehensive summary of this content.",
                settings.openaiKey,
                settings.openaiModel,
                settings.openaiBaseUrl
              );
            } catch (openaiError) {
              console.error('OpenAI API error:', openaiError);
              
              // Provide more user-friendly error messages for common issues
              if (openaiError.message.includes('401')) {
                throw new Error('OpenAI API authentication failed. Please check your API key.');
              } else if (openaiError.message.includes('429')) {
                throw new Error('OpenAI API rate limit exceeded. Please try again later.');
              } else if (openaiError.message.includes('model')) {
                throw new Error('Invalid model specified. Please check your model selection in settings.');
              } else {
                throw openaiError; // Re-throw the original error
              }
            }
          } else {
            throw new Error('Unknown AI provider selected');
          }
        } catch (error) {
          console.error('Summary generation error:', error);
          summary = "Failed to generate summary: " + error.message;
        }

        // Update the file with the summary
        try {
          await chrome.runtime.sendMessage({
            action: "progress",
            message: "Saving file with summary..."
          });
        } catch (error) {
          console.warn('Could not send progress message, popup might be closed:', error);
          // Continue with the process even if we can't update the UI
        }

        // Create the final markdown with the summary
        const finalMarkdown = `# ${title}\n\n## AI-Generated Summary\n\n${summary}\n\n## Original Content\n\n[Original website](${url})\n\n${content}`;
        
        // Create a Blob with the final content and use data URL
        const finalBlob = new Blob([finalMarkdown], { type: 'text/markdown' });
        const finalDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to create data URL'));
          reader.readAsDataURL(finalBlob);
        });
        
        // Download the final file
        const finalFilename = `${title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase()}.md`;
        await new Promise((resolve, reject) => {
          chrome.downloads.download({
            url: finalDataUrl,
            filename: finalFilename,
            saveAs: true
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(downloadId);
            }
          });
        });
        
        // No need to revoke data URLs

        // Send completion message
        try {
          await chrome.runtime.sendMessage({
            action: "progress",
            message: "Conversion and summary completed successfully!"
          });
        } catch (error) {
          console.warn('Could not send completion message, popup might be closed:', error);
          // Process completed successfully even if we can't update the UI
        }

      } catch (error) {
        console.error('Conversion error:', error);
        try {
          await chrome.runtime.sendMessage({
            action: "error",
            error: error.message
          });
        } catch (msgError) {
          console.warn('Could not send error message, popup might be closed:', msgError);
        }
      }
    });
  } else if (message.action === "checkOllamaConnection") {
    // Check Ollama connection
    checkOllamaConnection(message.endpoint, message.model).catch(error => {
      console.error('Error checking Ollama connection:', error);
    });
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