// Default preset prompts as defined in the PRD
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

let presetPrompts = { ...defaultPresetPrompts };

// Save popup state before it closes
window.addEventListener('beforeunload', () => {
  savePopupState();
});

// Function to save popup state
function savePopupState() {
  const state = {
    summaryPrompt: document.getElementById('summaryPrompt').value,
    contentType: document.getElementById('contentType').value,
    aiProvider: document.getElementById('aiProvider').value,
    progressVisible: document.getElementById('progress').style.display === 'block',
    progressText: document.getElementById('progressText').textContent,
    errorVisible: document.getElementById('errorDisplay').style.display === 'block',
    errorText: document.getElementById('errorDisplay').textContent,
    convertBtnDisabled: document.getElementById('convertBtn').disabled,
    convertBtnText: document.getElementById('convertBtn').textContent
  };
  
  chrome.storage.local.set({ popupState: state });
}

// Load saved settings and prompts
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.local.get([
      'summaryPrompt',
      'contentType',
      'customPresets',
      'aiProvider',
      'ollamaEndpoint',
      'ollamaModel',
      'popupState'
    ]);

    if (result.customPresets) {
      presetPrompts = { ...defaultPresetPrompts, ...result.customPresets };
    }
    
    // First restore the basic settings
    if (result.contentType) {
      document.getElementById('contentType').value = result.contentType;
    }
    
    if (result.summaryPrompt) {
      document.getElementById('summaryPrompt').value = result.summaryPrompt;
    } else {
      // Set default prompt based on content type
      const contentType = document.getElementById('contentType').value;
      document.getElementById('summaryPrompt').value = presetPrompts[contentType];
    }

    if (result.aiProvider) {
      document.getElementById('aiProvider').value = result.aiProvider;
    }

    // Then check if we have a saved popup state to restore
    if (result.popupState) {
      restorePopupState(result.popupState);
    } else {
      // Run content type detection only if we don't have a saved state
      detectContentType();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showError('Failed to load settings. Please try again.');
  }
});

// Function to restore popup state
function restorePopupState(state) {
  if (!state) return;
  
  // Restore form values
  if (state.summaryPrompt) {
    document.getElementById('summaryPrompt').value = state.summaryPrompt;
  }
  
  if (state.contentType) {
    document.getElementById('contentType').value = state.contentType;
  }
  
  if (state.aiProvider) {
    document.getElementById('aiProvider').value = state.aiProvider;
  }
  
  // Restore progress and error states
  if (state.progressVisible) {
    document.getElementById('progress').style.display = 'block';
    document.getElementById('progressText').textContent = state.progressText;
    
    // If progress message indicates completion, ensure button is enabled
    if (state.progressText && (
        state.progressText.includes("completed successfully") || 
        state.progressText.includes("Conversion and summary completed")
      )) {
      document.getElementById('convertBtn').disabled = false;
      document.getElementById('convertBtn').textContent = 'Convert and Save';
      
      // Automatically hide the success message after 5 seconds if it's a completion message
      setTimeout(() => {
        document.getElementById('progress').style.display = 'none';
        // Save state after hiding the message
        savePopupState();
      }, 5000);
    }
  }
  
  if (state.errorVisible) {
    document.getElementById('errorDisplay').style.display = 'block';
    document.getElementById('errorDisplay').textContent = state.errorText;
    
    // If there's an error, ensure button is enabled
    document.getElementById('convertBtn').disabled = false;
    document.getElementById('convertBtn').textContent = 'Convert and Save';
  }
  
  // Restore button state only if not in a completed or error state
  if (!state.progressText || (
      !state.progressText.includes("completed successfully") && 
      !state.progressText.includes("Conversion and summary completed")
    )) {
    if (state.convertBtnDisabled) {
      document.getElementById('convertBtn').disabled = true;
      document.getElementById('convertBtn').textContent = state.convertBtnText;
    }
  }
}

// Check Ollama connection
async function checkOllamaConnection(endpoint, model) {
  try {
    // Send a message to check the connection
    chrome.runtime.sendMessage({
      action: "checkOllamaConnection",
      endpoint: endpoint,
      model: model
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking Ollama connection:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.error('Error checking Ollama connection:', error);
  }
}

// Handle content type changes
document.getElementById('contentType').addEventListener('change', (e) => {
  const type = e.target.value;
  const promptArea = document.getElementById('summaryPrompt');
  if (type !== 'custom') {
    promptArea.value = presetPrompts[type];
    // Save the selected content type
    chrome.storage.local.set({ contentType: type });
  }
  // Save popup state after content type change
  savePopupState();
});

// Configure preset button
document.getElementById('configPreset').addEventListener('click', () => {
  const type = document.getElementById('contentType').value;
  if (type !== 'custom') {
    const presetConfig = document.getElementById('presetConfig');
    const presetTemplate = document.getElementById('presetTemplate');
    presetTemplate.value = presetPrompts[type];
    presetConfig.style.display = 'block';
    // Save popup state after showing config panel
    savePopupState();
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
  
  // Save popup state after updating preset
  savePopupState();
});

// Reset preset to default
document.getElementById('resetPreset').addEventListener('click', () => {
  const type = document.getElementById('contentType').value;
  const defaultTemplate = defaultPresetPrompts[type];
  document.getElementById('presetTemplate').value = defaultTemplate;
  
  // Save popup state after resetting preset
  savePopupState();
});

// Close config panel
document.getElementById('closeConfig').addEventListener('click', () => {
  document.getElementById('presetConfig').style.display = 'none';
  
  // Save popup state after closing config panel
  savePopupState();
});

// Auto-detect content type
function detectContentType() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // Check if we have a valid tab
    if (!tabs || !tabs[0] || !tabs[0].id) {
      console.warn('No valid tab found');
      return;
    }

    // Check if we can access this tab
    const url = tabs[0].url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
      showError('Cannot access browser system pages. Please try on a regular webpage.');
      return;
    }

    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: () => {
        // Simple detection logic based on page content and URL
        const hasPDF = document.querySelector('embed[type="application/pdf"]');
        const hasNews = document.querySelector('article') || 
                       window.location.href.includes('news');
        const hasDocs = document.querySelector('technical') || 
                       window.location.href.includes('docs');
        const hasBlog = document.querySelector('blog') ||
                       window.location.href.includes('blog');
        
        return {
          isPaper: hasPDF,
          isNews: hasNews,
          isDocs: hasDocs,
          isBlog: hasBlog
        };
      }
    }).then((results) => {
      if (!results || !results[0]) return;
      
      const type = results[0].result;
      const select = document.getElementById('contentType');
      
      if (type.isPaper) select.value = 'paper';
      else if (type.isNews) select.value = 'news';
      else if (type.isDocs) select.value = 'docs';
      else if (type.isBlog) select.value = 'blog';
      
      // Trigger change event to update prompt
      select.dispatchEvent(new Event('change'));
    }).catch((error) => {
      console.error('Error detecting content type:', error);
      // Don't show error to user as this is not critical
    });
  });
}

// Handle AI provider changes
document.getElementById('aiProvider').addEventListener('change', (e) => {
  chrome.storage.local.set({ aiProvider: e.target.value });
  
  // Save popup state after AI provider change
  savePopupState();
});

// Configure API settings
document.getElementById('configureAPI').addEventListener('click', () => {
  try {
    console.log('Opening options page...');
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      // Fallback for browsers that don't support openOptionsPage
      const optionsUrl = chrome.runtime.getURL('settings.html');
      console.log('Opening options URL:', optionsUrl);
      chrome.tabs.create({ url: optionsUrl });
    }
  } catch (error) {
    console.error('Error opening options page:', error);
    // Direct fallback
    window.open(chrome.runtime.getURL('settings.html'), '_blank');
  }
});

// Add message listener for progress updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "progress") {
    showProgress(message.message);
    
    // Check if this is a completion message
    if (message.message && (
        message.message.includes("completed successfully") || 
        message.message.includes("Conversion and summary completed")
      )) {
      // Re-enable the convert button when conversion is complete
      enableConvertButton();
      
      // Automatically hide the success message after 5 seconds
      setTimeout(() => {
        document.getElementById('progress').style.display = 'none';
        // Save state after hiding the message
        savePopupState();
      }, 5000);
    }
  } else if (message.action === "error") {
    showError(message.error);
    enableConvertButton();
  } else if (message.action === "connectionStatus") {
    if (message.status === "success") {
      showProgress("Ollama connection successful!");
      setTimeout(() => {
        document.getElementById('progress').style.display = 'none';
        // Save state after hiding the message
        savePopupState();
      }, 3000);
    } else {
      showError(message.error || "Could not connect to Ollama server");
    }
  }
});

function showProgress(message) {
  const progress = document.getElementById('progress');
  const progressText = document.getElementById('progressText');
  const errorDisplay = document.getElementById('errorDisplay');
  
  progress.style.display = 'block';
  errorDisplay.style.display = 'none';
  progressText.textContent = message;
  
  // Save state after updating UI
  savePopupState();
}

function showError(message) {
  const progress = document.getElementById('progress');
  const errorDisplay = document.getElementById('errorDisplay');
  
  progress.style.display = 'none';
  errorDisplay.style.display = 'block';
  errorDisplay.textContent = `Error: ${message}`;
  
  // Save state after updating UI
  savePopupState();
}

function disableConvertButton() {
  const convertBtn = document.getElementById('convertBtn');
  convertBtn.disabled = true;
  convertBtn.textContent = 'Converting...';
  
  // Save state after updating UI
  savePopupState();
}

function enableConvertButton() {
  const convertBtn = document.getElementById('convertBtn');
  convertBtn.disabled = false;
  convertBtn.textContent = 'Convert and Save';
  
  // Save state after updating UI
  savePopupState();
}

// Modify the convert button click handler
document.getElementById('convertBtn').addEventListener('click', async () => {
  try {
    // First check if we have a valid tab
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || !tabs[0] || !tabs[0].id) {
      throw new Error('No valid tab found. Please try again on a webpage.');
    }

    // Check if we can access this tab
    const url = tabs[0].url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
      throw new Error('Cannot access browser system pages. Please try on a regular webpage.');
    }

    const prompt = document.getElementById('summaryPrompt').value;
    const aiProvider = document.getElementById('aiProvider').value;
    
    // Get settings
    const settings = await chrome.storage.local.get([
      'ollamaEndpoint',
      'ollamaModel',
      'openaiKey',
      'openaiBaseUrl',
      'openaiModel'
    ]);
    
    // Validate settings
    if (aiProvider === 'ollama') {
      if (!settings.ollamaEndpoint || !settings.ollamaModel) {
        throw new Error('Ollama settings not configured. Please configure API settings first.');
      }
      
      // Test connection when user clicks convert button
      showProgress('Testing Ollama connection...');
      await checkOllamaConnection(settings.ollamaEndpoint, settings.ollamaModel);
    } else if (aiProvider === 'openai') {
      if (!settings.openaiKey) {
        throw new Error('OpenAI API key not configured. Please configure API settings first.');
      }
    }
    
    // Save current prompt and settings
    await chrome.storage.local.set({ 
      summaryPrompt: prompt,
      aiProvider: aiProvider
    });

    // Show loading state
    disableConvertButton();
    showProgress('Initializing conversion...');

    // Hide any previous error
    const errorDisplay = document.getElementById('errorDisplay');
    errorDisplay.style.display = 'none';

    // Send message to background script to start conversion
    chrome.runtime.sendMessage({
      action: "convert",
      prompt: prompt,
      aiProvider: aiProvider
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        showError('Could not establish connection. Receiving end does not exist.');
        enableConvertButton();
      }
    });

    // 
  } catch (error) {
    console.error('Conversion error:', error);
    showError(error.message);
    enableConvertButton();
  }
});

// Add event listener for summary prompt changes
document.getElementById('summaryPrompt').addEventListener('input', () => {
  // Save popup state when user types in the prompt area
  savePopupState();
}); 