// Load saved settings when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get([
    'aiProvider',
    'openaiKey',
    'openaiBaseUrl',
    'openaiModel',
    'ollamaEndpoint',
    'ollamaModel'
  ]);

  // Set AI provider
  if (result.aiProvider) {
    // Update the tab UI
    document.querySelectorAll('.provider-option').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.provider-option[data-provider="${result.aiProvider}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    // Show the appropriate settings section
    toggleProviderSettings(result.aiProvider);
  }

  // Set OpenAI settings
  if (result.openaiKey) {
    document.getElementById('openaiKey').value = result.openaiKey;
  }
  if (result.openaiBaseUrl) {
    document.getElementById('openaiBaseUrl').value = result.openaiBaseUrl;
  }
  if (result.openaiModel) {
    document.getElementById('openaiModel').value = result.openaiModel;
  }

  // Set Ollama settings
  if (result.ollamaEndpoint) {
    document.getElementById('ollamaEndpoint').value = result.ollamaEndpoint;
  }
  if (result.ollamaModel) {
    document.getElementById('ollamaModel').value = result.ollamaModel;
  }

  // Setup toggle password button
  const toggleButton = document.getElementById('toggleOpenaiKey');
  const openaiKeyInput = document.getElementById('openaiKey');
  
  toggleButton.addEventListener('click', () => {
    if (openaiKeyInput.type === 'password') {
      openaiKeyInput.type = 'text';
      toggleButton.textContent = 'Hide';
    } else {
      openaiKeyInput.type = 'password';
      toggleButton.textContent = 'Show';
    }
  });
  
  // Setup provider tabs
  document.querySelectorAll('.provider-option').forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab UI
      document.querySelectorAll('.provider-option').forEach(t => {
        t.classList.remove('active');
      });
      tab.classList.add('active');
      
      // Show corresponding settings
      const provider = tab.getAttribute('data-provider');
      toggleProviderSettings(provider);
    });
  });
});

// Toggle between OpenAI and Ollama settings
function toggleProviderSettings(provider) {
  const openaiSettings = document.getElementById('openaiSettings');
  const ollamaSettings = document.getElementById('ollamaSettings');

  if (provider === 'openai') {
    openaiSettings.style.display = 'block';
    ollamaSettings.style.display = 'none';
  } else {
    openaiSettings.style.display = 'none';
    ollamaSettings.style.display = 'block';
  }
}

// Test Ollama connection
async function testOllamaConnection(endpoint, model) {
  try {
    showStatus('Testing Ollama connection...', 'info');

    // Remove trailing slash and ensure proper format
    endpoint = endpoint.replace(/\/$/, '');
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = 'http://' + endpoint;
    }

    // Then test with a simple generation request
    console.log('Testing Ollama connection to:', endpoint);
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
        prompt: 'Say "Connection successful!" if you can read this.',
        stream: false,
        options: {
          temperature: 0.7
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
      
      throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('Ollama successful response:', data);

    if (!data.response) {
      throw new Error('Invalid response from Ollama API');
    }

    showStatus('Connection test successful!', 'success');
    return true;
  } catch (error) {
    console.error('Ollama connection test error:', error);
    
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

// Save settings
document.getElementById('saveSettings').addEventListener('click', async () => {
  // Get the active provider from the UI
  const activeTab = document.querySelector('.provider-option.active');
  const aiProvider = activeTab ? activeTab.getAttribute('data-provider') : 'openai';
  
  const openaiKey = document.getElementById('openaiKey').value;
  const openaiBaseUrl = document.getElementById('openaiBaseUrl').value;
  const openaiModel = document.getElementById('openaiModel').value;
  const ollamaEndpoint = document.getElementById('ollamaEndpoint').value;
  const ollamaModel = document.getElementById('ollamaModel').value;

  try {
    // Validate settings based on provider
    if (aiProvider === 'openai') {
      if (!openaiKey) {
        throw new Error('OpenAI API key is required');
      }
      if (!openaiBaseUrl) {
        throw new Error('OpenAI API base URL is required');
      }
      // Validate URL format
      try {
        new URL(openaiBaseUrl);
      } catch (e) {
        throw new Error('Invalid OpenAI API base URL format');
      }
    }

    if (aiProvider === 'ollama') {
      if (!ollamaEndpoint) {
        throw new Error('Ollama endpoint is required');
      }
      if (!ollamaModel) {
        throw new Error('Ollama model name is required');
      }

      // Test Ollama connection before saving
      await testOllamaConnection(ollamaEndpoint, ollamaModel);
    }

    // Save settings to chrome.storage
    await chrome.storage.local.set({
      aiProvider,
      openaiKey,
      openaiBaseUrl,
      openaiModel,
      ollamaEndpoint,
      ollamaModel
    });

    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Settings save error:', error);
    showStatus(error.message, 'error');
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status-message';
  
  if (type === 'success') {
    status.classList.add('status-success');
  } else if (type === 'error') {
    status.classList.add('status-error');
  } else if (type === 'info') {
    status.classList.add('status-info');
  }
  
  status.style.display = 'block';

  // Only auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
} 