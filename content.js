// Function to wait for Turndown to be available
function waitForTurndown(maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkTurndown = () => {
      attempts++;
      if (typeof TurndownService !== 'undefined') {
        console.log('Turndown library found after', attempts, 'attempts');
        resolve(true);
      } else if (attempts >= maxAttempts) {
        reject(new Error('Turndown library failed to load after ' + maxAttempts + ' attempts'));
      } else {
        console.log('Waiting for Turndown library... Attempt', attempts);
        setTimeout(checkTurndown, 500);
      }
    };
    
    checkTurndown();
  });
}

// Function to inject Turndown library if not already available
function injectTurndownLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof TurndownService !== 'undefined') {
      console.log('Turndown already available');
      resolve(true);
      return;
    }
    
    console.log('Injecting Turndown library...');
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('turndown.js');
    script.onload = () => {
      console.log('Turndown library loaded successfully');
      resolve(true);
    };
    script.onerror = (error) => {
      console.error('Failed to load Turndown library:', error);
      reject(new Error('Failed to load Turndown library'));
    };
    document.head.appendChild(script);
  });
}

// Notify background script that content script is ready
function notifyContentScriptReady() {
  try {
    chrome.runtime.sendMessage({ action: "contentScriptReady" }, response => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to notify background script:', chrome.runtime.lastError);
      } else if (response && response.received) {
        console.log('Background script acknowledged content script is ready');
      }
    });
  } catch (error) {
    console.error('Error notifying background script:', error);
  }
}

// Initialize content script
async function initializeContentScript() {
  try {
    // Try to inject Turndown if not available
    await injectTurndownLibrary();
    // Wait for Turndown to be available
    await waitForTurndown(5);
    // Notify that we're ready
    notifyContentScriptReady();
    console.log('Content script initialized successfully');
  } catch (error) {
    console.error('Content script initialization error:', error);
  }
}

// Run initialization
initializeContentScript();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);
  
  if (request.action === "convert") {
    // Handle the conversion asynchronously
    (async () => {
      try {
        console.log('Content script processing convert message');
        
        // Make sure Turndown is available
        if (typeof TurndownService === 'undefined') {
          try {
            await injectTurndownLibrary();
            await waitForTurndown();
          } catch (error) {
            console.error('Failed to load Turndown:', error);
            sendResponse({ 
              success: false, 
              error: 'Failed to load HTML to Markdown converter: ' + error.message 
            });
            return;
          }
        }
        
        // Get the page title and URL
        let title = '';
        const pageUrl = window.location.href;
        
        const postTitleElement = document.querySelector('h1.Post-Title, h1.post-title, h1[class*="Post-Title"], h1[class*="post-title"], h1.entry-title, h1.article-title, h1.title');
        if (postTitleElement) {
          title = postTitleElement.textContent.trim();
        }
        // Fallback to document.title if no h1 title found
        if (!title) {
          title = document.title || 'Untitled Page';
        }

        console.log('Initializing TurndownService...');
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
            return node.nodeName === 'PRE';
          },
          replacement: function (content, node, options) {
            // Process the content to handle <br> tags as newlines
            let code = node.innerHTML;
            // Replace <br> tags with actual newlines
            code = code.replace(/<br\s*\/?>/gi, '\n');
            // Remove other HTML tags
            code = code.replace(/<\/?[^>]+(>|$)/g, '');
            // Decode HTML entities
            const textarea = document.createElement('textarea');
            textarea.innerHTML = code;
            code = textarea.value;
            
            // Detect language from class if available
            let lang = '';
            if (node.className) {
              const langMatch = node.className.match(/language-(\w+)/);
              if (langMatch) {
                lang = langMatch[1];
              }
            }
            
            return '\n```' + lang + '\n' + code + '\n```\n';
          }
        });

        // Improve heading handling to maintain hierarchy
        turndownService.addRule('headings', {
          filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
          replacement: function (content, node, options) {
            const hLevel = node.nodeName.charAt(1);
            const hPrefix = '#'.repeat(hLevel);
            return `\n\n${hPrefix} ${content}\n\n`;
          }
        });

        // Find the main content of the page
        console.log('Finding main content...');
        
        // Try to find the main content container using common selectors
        const mainContentSelectors = [
          'article', 
          'main', 
          '.article-content',
          '.post-content',
          '.entry-content',
          '.content-area',
          '#content',
          '.main-content'
        ];
        
        let mainElement = null;
        
        // Try each selector until we find a match
        for (const selector of mainContentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim().length > 100) {
            mainElement = element;
            console.log(`Found main content using selector: ${selector}`);
            break;
          }
        }
        
        // If no match found with selectors, use heuristics
        if (!mainElement) {
          console.log('No main content found with selectors, using heuristics...');
          
          // Find the element with the most content, excluding navigation, header, footer, etc.
          let maxLength = 0;
          let bestElement = null;
          
          // Function to check if an element should be excluded
          const shouldExclude = (element) => {
            if (!element) return true;
            
            // Check tag name
            const tagName = element.tagName.toLowerCase();
            if (['nav', 'header', 'footer', 'aside', 'menu'].includes(tagName)) {
              return true;
            }
            
            // Check id
            if (element.id && /nav|header|footer|menu|sidebar|comment/i.test(element.id)) {
              return true;
            }
            
            // Check class
            if (element.className && typeof element.className === 'string') {
              // Check for speechify-ignore class
              if (element.className.includes('speechify-ignore')) {
                return true;
              }
              
              // Check for other common non-content classes
              if (/nav|header|footer|menu|sidebar|comment/i.test(element.className)) {
                return true;
              }
            }
            
            return false;
          };
          
          // Function to score an element based on content quality
          const scoreElement = (element) => {
            if (shouldExclude(element)) return 0;
            
            let score = element.textContent.trim().length;
            
            // Bonus for elements with paragraphs
            const paragraphs = element.querySelectorAll('p');
            score += paragraphs.length * 20;
            
            // Bonus for elements with headings
            const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
            score += headings.length * 50;
            
            // Bonus for elements with images
            const images = element.querySelectorAll('img');
            score += images.length * 30;
            
            // Penalty for very short text nodes
            const textNodes = Array.from(element.childNodes)
              .filter(node => node.nodeType === Node.TEXT_NODE);
            const shortTextNodes = textNodes.filter(node => node.textContent.trim().length < 20);
            score -= shortTextNodes.length * 10;
            
            return score;
          };
          
          // Score all potential content containers
          document.querySelectorAll('div, section, article').forEach(element => {
            const score = scoreElement(element);
            if (score > maxLength) {
              maxLength = score;
              bestElement = element;
            }
          });
          
          if (bestElement) {
            mainElement = bestElement;
            console.log('Found main content using heuristics');
          } else {
            // Last resort: use body
            mainElement = document.body;
            console.log('Using body as main content (last resort)');
          }
        }
        
        // Create a clone of the main element to avoid modifying the original page
        const mainClone = mainElement.cloneNode(true);
        
        // Remove unwanted elements from the clone
        const unwantedSelectors = [
          'nav', 'header', 'footer', 'aside', '.nav', '.navigation', '.menu', 
          '.sidebar', '.comments', '.related', '.share', '.social', 
          'script', 'style', 'iframe', 'form', '.ad', '.advertisement',
          '.speechify-ignore', '[class*="speechify-ignore"]'
        ];
        
        unwantedSelectors.forEach(selector => {
          mainClone.querySelectorAll(selector).forEach(el => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
        });
        
        // Convert HTML to Markdown
        console.log('Converting content to markdown...');
        const mainContent = turndownService.turndown(mainClone);
        
        if (!mainContent.trim()) {
          throw new Error('No content found on the page after processing');
        }
        
        console.log('Content extraction successful');
        sendResponse({ success: true, title, content: mainContent, url: pageUrl });
      } catch (error) {
        console.error('Content extraction error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Keep the message channel open for async response
  } else if (request.action === "ping") {
    // Simple ping to check if content script is loaded
    sendResponse({ success: true, message: "Content script is ready" });
    return false; // No async response needed
  }
}); 