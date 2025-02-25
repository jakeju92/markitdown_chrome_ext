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

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "convert") {
    // Handle the conversion asynchronously
    (async () => {
      try {
        console.log('Content script received convert message');
        
        // Try to inject Turndown if not available
        try {
          await injectTurndownLibrary();
        } catch (error) {
          console.error('Error injecting Turndown:', error);
        }
        
        // Wait for Turndown to be available
        await waitForTurndown();
        
        // Get the page title
        let title = '';
        const postTitleElement = document.querySelector('h1.Post-Title, h1.post-title, h1[class*="Post-Title"], h1[class*="post-title"]');
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
        console.log('Finding main content element...');
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
        sendResponse({ success: true, title, content: mainContent });
      } catch (error) {
        console.error('Content extraction error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Keep the message channel open for async response
  }
}); 