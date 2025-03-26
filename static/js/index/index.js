// HTML entity decoder function for Mermaid diagrams
function decodeHtmlEntities(text) {
  if (!text) return text;
  
  // Fixes for arrow syntax (most critical fix)
  text = text.replace(/--&gt;/g, '-->');
  
  // Common HTML entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  // Replace all encoded entities with their decoded versions
  return text.replace(/&[a-z0-9#]+;/gi, entity => {
    if (entities[entity]) {
      return entities[entity];
    }
    
    // Handle numeric entities
    if (entity.startsWith('&#')) {
      try {
        const tempEl = document.createElement('span');
        tempEl.innerHTML = entity;
        return tempEl.innerText;
      } catch(e) {
        return entity;
      }
    }
    
    return entity;
  });
}

$(document).ready(function() {
  // DOM elements
  const messageInput = $('#message-input');
  const sendButton = $('#send-button');
  const messagesContainer = $('#messages-container');
  const characterCount = $('#character-count');
  const clearButton = $('#clear-button');
  const regenerateButton = $('#regenerate-button');
  const fileUpload = $('#file-upload');
  const filePreviewContainer = $('#file-preview-container');
  const mobileSidebarToggle = $('#mobile-sidebar-toggle');
  const closeSidebarBtn = $('#close-sidebar-btn');
  const sidebarBackdrop = $('#sidebar-backdrop');
  const mobileSidebar = $('#mobile-topics-sidebar');
  const newChatBtn = $('#new-chat-btn');
  const mobileNewChatBtn = $('#mobile-new-chat-btn');
  
  // Fix for mobile menu after a short delay to ensure DOM is fully loaded
  setTimeout(function() {
    // console.log('Checking mobile menu functionality...');
    const hamburgerBtn = document.getElementById('mobile-sidebar-toggle');
    
    if (hamburgerBtn) {
      // console.log('Found hamburger button, adding click handler');
      
      // Add additional direct click handler
      hamburgerBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        // console.log('Hamburger button clicked (direct onclick)');
        
        const sidebar = document.getElementById('mobile-topics-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        
        if (sidebar && backdrop) {
          sidebar.classList.add('show');
          backdrop.classList.add('show');
          // console.log('Added show classes to sidebar and backdrop');
        } else {
          console.error('Could not find sidebar or backdrop elements');
        }
      };
      
      // Also add a direct event listener in case onclick doesn't work
      hamburgerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // console.log('Hamburger button clicked (direct event listener)');
        
        const sidebar = document.getElementById('mobile-topics-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        
        if (sidebar && backdrop) {
          sidebar.classList.add('show');
          backdrop.classList.add('show');
          // console.log('Added show classes to sidebar and backdrop (from event listener)');
        } else {
          console.error('Could not find sidebar or backdrop elements (from event listener)');
        }
      });
    } else {
      console.error('Could not find hamburger button by ID');
    }
  }, 1000);
  
  // System prompt elements
  const editSystemPromptBtn = $('#edit-system-prompt-btn');
  const systemPromptDisplay = $('#system-prompt-display');
  const systemPromptForm = $('#system-prompt-form');
  const systemPromptInput = $('#system-prompt-input');
  const cancelSystemPromptBtn = $('#cancel-system-prompt');
  const saveSystemPromptBtn = $('#save-system-prompt');
  
  // Mobile system prompt elements
  const mobileEditSystemPromptBtn = $('#mobile-edit-system-prompt-btn');
  const mobileSystemPromptDisplay = $('#mobile-system-prompt-display');
  const mobileSystemPromptForm = $('#mobile-system-prompt-form');
  const mobileSystemPromptInput = $('#mobile-system-prompt-input');
  const mobileCancelSystemPromptBtn = $('#mobile-cancel-system-prompt');
  const mobileSaveSystemPromptBtn = $('#mobile-save-system-prompt');
  
  // Initialize Mermaid.js
  // console.log('Initializing Mermaid with our custom config');
  if (typeof mermaid !== 'undefined') {
    // Configure mermaid with optimal settings
    mermaid.initialize({
      startOnLoad: false,  // We will manually control when diagrams are rendered
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      logLevel: 5, // Error level only - reduces console messages
      securityLevel: 'loose',
      fontFamily: 'Poppins, sans-serif',
      flowchart: {
        htmlLabels: true,
        useMaxWidth: true,
        curve: 'linear'
      },
    });
    
    // Add mermaid error styles
    addMermaidErrorStyles();
    
    // Show notification that Mermaid rendering has been improved
    setTimeout(() => {
      createNotification('Mermaid diagram rendering has been improved', 'info');
    }, 1000);
    
    // Override mermaid.init to add our own logging for debugging
    const originalInit = mermaid.init;
    mermaid.init = function(config, nodes) {
      // console.log('mermaid.init called with:', { 
      //   config, 
      //   nodesCount: nodes ? (nodes.length || 'unknown') : 'all'
      // });
      try {
        return originalInit.apply(this, arguments);
      } catch (err) {
        console.error('Error in mermaid.init:', err);
        throw err;
      }
    };
    
    // Process any diagrams already in the page with some delay
    // to ensure everything is loaded
    setTimeout(() => {
      // console.log('Running initial Mermaid diagram processing');
      
      // First run debug to see what's in the DOM
      debugMermaidDiagrams();
      
      // Then try to process
      processMermaidDiagrams();
      
      // Schedule another check in case first attempt missed some
      setTimeout(() => {
        const unprocessed = Array.from(document.querySelectorAll('.mermaid')).filter(div => {
          return div.getAttribute('data-processed') !== 'true';
        });
        
        if (unprocessed.length > 0) {
          // console.log(`Found ${unprocessed.length} diagrams still unprocessed, trying again...`);
          processMermaidDiagrams();
          
          // Try direct Mermaid init as a last resort
          setTimeout(() => {
            try {
              // console.log('Attempting direct mermaid.init call...');
              mermaid.init(undefined, unprocessed);
            } catch (e) {
              console.error('Error in direct mermaid.init call:', e);
            }
          }, 300);
        }
      }, 500);
    }, 500);
    
    // Enable Mermaid observer
    enableMermaidObserver();
  } else {
    console.warn('Mermaid library not found');
  }
  
  // State variables
  let currentTopic = "Getting started with Wisdomizer";
  let lastUserMessage = "";
  let uploadedFile = null;
  let isAiResponding = false;
  let currentStreamController = null;
  let currentChatUUID = null;
  let currentTopicLoadingId = null;
  let systemPrompt = "You are a helpful AI assistant. Format your responses using Markdown for better readability. Use code blocks with language specification for code examples.";
  
  // Configure Marked.js for Markdown rendering
  configureMarkdown();
  
  // Initialize syntax highlighting if available
  try {
    if (typeof hljs !== 'undefined') {
      hljs.configure({
        ignoreUnescapedHTML: true
      });
      hljs.highlightAll();
    } else {
      console.warn('Highlight.js not loaded. Syntax highlighting is disabled.');
    }
    
    // Initialize mermaid if available
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'dark',
        securityLevel: 'loose',
        logLevel: 5, // Error level only - reduces console messages
        fontFamily: 'Poppins, sans-serif',
        flowchart: {
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: {
          diagramMarginX: 50,
          diagramMarginY: 10,
          actorMargin: 50
        },
        // Completely suppress debugging output
        debug: false,
        verbose: false,
        logger: {
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: console.error
        }
      });
      
      // Force global render attempts on page load
      setTimeout(() => {
        try {
          // console.log('Attempting global mermaid render...');
          mermaid.run();
          // console.log('Initial mermaid.run() executed');
        } catch (err) {
          console.error('Error during initial mermaid run:', err);
        }
        
        // Try a second time in case the first attempt failed
        setTimeout(() => {
          try {
            mermaid.run();
            // console.log('Secondary mermaid.run() executed');
          } catch (err) {
            console.error('Error during secondary mermaid run:', err);
          }
        }, 2000);
      }, 1000);
      
      // Call forceMermaidRendering once at the start 
      setTimeout(() => {
        processMermaidDiagrams();
      }, 1000);
      
      // Enable Mermaid observer to automatically process diagrams when they're added
      enableMermaidObserver();
      
      // console.log('Mermaid initialization complete');
    } else {
      console.warn('Mermaid.js not loaded. Diagram rendering is disabled.');
    }
  } catch (e) {
    console.error('Error initializing libraries:', e);
  }
  
  // Character count updating
  messageInput.on('input', function() {
    const count = $(this).val().length;
    characterCount.text(`${count}/4000`);
    
    // Disable send button if no input or if over character limit
    if (count > 0 && count <= 4000) {
      sendButton.prop('disabled', false);
    } else {
      sendButton.prop('disabled', true);
    }
  });
  
  // Configure Markdown parser
  function configureMarkdown() {
    // Configure the Markdown renderer
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false
    });

    // Create a custom renderer
    const renderer = new marked.Renderer();
    
    // Original code function to preserve
    const originalCodeRenderer = renderer.code;
    
    // Override the code renderer to handle mermaid diagrams
    renderer.code = function(code, language, escaped) {
      // For mermaid diagrams, create a div with the mermaid class
      if (language === 'mermaid') {
        // console.log('Detected mermaid code block, creating diagram container', { 
        //   codeLength: code.length,
        //   codePreview: code.substring(0, 50),
        //   timestamp: Date.now()
        // });
        
        // Create a unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        // Clean the mermaid code - remove any HTML entities
        const cleanedCode = decodeHtmlEntities(code.trim());
        
        // Store the original code in a data attribute for reliable retrieval
        // Make sure content is properly encoded to avoid HTML interpretation issues
        const encodedContent = encodeURIComponent(cleanedCode);
        
        // Create a div with the mermaid class that will be processed by our renderer
        const html = `<div class="mermaid" id="${id}" data-processed="false" data-content="${encodedContent}">${cleanedCode}</div>`;
        
        // console.log(`Created mermaid HTML: ${html.substring(0, 100)}...`);
        
        // Set a marker in window to track mermaid diagrams
        if (!window.mermaidDiagrams) {
          window.mermaidDiagrams = [];
        }
        window.mermaidDiagrams.push({
          id,
          content: cleanedCode,
          timestamp: Date.now()
        });
        
        // Schedule a check for this specific diagram
        setTimeout(() => {
          const diagram = document.getElementById(id);
          if (diagram) {
            // console.log(`Checking if diagram ${id} was processed`);
            if (diagram.getAttribute('data-processed') !== 'true') {
              // console.log(`Diagram ${id} was not processed, forcing processing`);
              processMermaidDiagrams();
            }
          } else {
            // console.warn(`Diagram ${id} not found in DOM`);
          }
        }, 1000);
        
        return html;
      }
      
      // For all other code blocks, use the original renderer
      return originalCodeRenderer.call(this, code, language, escaped);
    };
    
    // Use the custom renderer
    marked.use({ renderer });
  }
  
  // System prompt handling - desktop
  editSystemPromptBtn.on('click', function() {
    systemPromptForm.removeClass('hidden');
    systemPromptDisplay.addClass('hidden');
    systemPromptInput.val(systemPrompt);
    systemPromptInput.focus();
  });
  
  cancelSystemPromptBtn.on('click', function() {
    systemPromptForm.addClass('hidden');
    systemPromptDisplay.removeClass('hidden');
  });
  
  saveSystemPromptBtn.on('click', function() {
    const newPrompt = systemPromptInput.val().trim();
    if (newPrompt) {
      systemPrompt = newPrompt;
      systemPromptDisplay.text(systemPrompt);
      mobileSystemPromptDisplay.text(systemPrompt);
      systemPromptForm.addClass('hidden');
      systemPromptDisplay.removeClass('hidden');
      localStorage.setItem('systemPrompt', systemPrompt);
      createNotification('System prompt updated', 'success');
    } else {
      createNotification('System prompt cannot be empty', 'error');
    }
  });
  
  // System prompt handling - mobile
  mobileEditSystemPromptBtn.on('click', function() {
    mobileSystemPromptForm.removeClass('hidden');
    mobileSystemPromptDisplay.addClass('hidden');
    mobileSystemPromptInput.val(systemPrompt);
    mobileSystemPromptInput.focus();
  });
  
  mobileCancelSystemPromptBtn.on('click', function() {
    mobileSystemPromptForm.addClass('hidden');
    mobileSystemPromptDisplay.removeClass('hidden');
  });
  
  mobileSaveSystemPromptBtn.on('click', function() {
    const newPrompt = mobileSystemPromptInput.val().trim();
    if (newPrompt) {
      systemPrompt = newPrompt;
      systemPromptDisplay.text(systemPrompt);
      mobileSystemPromptDisplay.text(systemPrompt);
      mobileSystemPromptForm.addClass('hidden');
      mobileSystemPromptDisplay.removeClass('hidden');
      localStorage.setItem('systemPrompt', systemPrompt);
      createNotification('System prompt updated', 'success');
    } else {
      createNotification('System prompt cannot be empty', 'error');
    }
  });
  
  // Load saved system prompt if available
  const savedSystemPrompt = localStorage.getItem('systemPrompt');
  if (savedSystemPrompt) {
    systemPrompt = savedSystemPrompt;
    systemPromptDisplay.text(systemPrompt);
    mobileSystemPromptDisplay.text(systemPrompt);
  }
  
  // Send message on button click or enter key
  sendButton.on('click', sendMessage);
  messageInput.on('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Clear chat
  clearButton.on('click', function() {
    // Confirm before clearing
    if (confirm('Are you sure you want to clear this chat?')) {
      messagesContainer.empty();
      // Add the welcome message back
      addWelcomeMessage();
    }
  });
  
  // Regenerate last AI response
  regenerateButton.on('click', function() {
    if (lastUserMessage) {
      // Find and remove the last AI message
      $('.chat-ai').last().remove();
      // Resend the last user message
      processUserMessage(lastUserMessage);
    } else {
      createNotification('Nothing to regenerate', 'warning');
    }
  });
  
  // File upload handling
  fileUpload.on('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      uploadedFile = file;
      showFilePreview(file);
    }
  });
  
  // Mobile sidebar toggle
  mobileSidebarToggle.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    // console.log('Mobile sidebar toggle clicked');
    mobileSidebar.addClass('show');
    sidebarBackdrop.addClass('show');
  });
  
  closeSidebarBtn.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    // console.log('Close sidebar button clicked');
    mobileSidebar.removeClass('show');
    sidebarBackdrop.removeClass('show');
  });
  
  sidebarBackdrop.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    // console.log('Sidebar backdrop clicked');
    mobileSidebar.removeClass('show');
    sidebarBackdrop.removeClass('show');
  });
  
  // New chat button
  newChatBtn.on('click', startNewChat);
  mobileNewChatBtn.on('click', startNewChat);
  
  // Topic management
  $(document).on('click', '.topic-item', function(e) {
    // Don't trigger if clicking on action buttons
    if ($(e.target).closest('.topic-actions').length) {
      return;
    }
    
    // Load the selected topic
    const topicName = $(this).find('.topic-name').text();
    const topicUUID = $(this).data('uuid');
    loadTopic(topicName, topicUUID);
    
    // Update UI
    $('.topic-item').removeClass('bg-gray-700/50').addClass('hover:bg-gray-700/30');
    $('.topic-item').removeClass('text-gray-100').addClass('text-gray-300');
    $(this).removeClass('hover:bg-gray-700/30').addClass('bg-gray-700/50');
    $(this).removeClass('text-gray-300').addClass('text-gray-100');
    
    // Close mobile sidebar if open
    mobileSidebar.removeClass('show');
    sidebarBackdrop.removeClass('show');
  });
  
  // Topic rename
  $(document).on('click', '.topic-rename', function(e) {
    e.stopPropagation();
    const topicItem = $(this).closest('.topic-item');
    const topicName = topicItem.find('.topic-name').text();
    const topicUUID = topicItem.data('uuid');
    
    const newName = prompt('Enter new topic name:', topicName);
    if (newName && newName !== topicName) {
      renameTopic(topicUUID, newName);
    }
  });
  
  // Topic delete
  $(document).on('click', '.topic-delete', function(e) {
    e.stopPropagation();
    const topicItem = $(this).closest('.topic-item');
    const topicName = topicItem.find('.topic-name').text();
    const topicUUID = topicItem.data('uuid');
    
    if (confirm(`Are you sure you want to delete "${topicName}"?`)) {
      deleteTopic(topicUUID);
    }
  });
  
  // Functions
  function sendMessage() {
    const message = messageInput.val().trim();
    if (message.length === 0) return;
    
    // Add user message to chat
    addUserMessage(message);
    
    // Process the message
    processUserMessage(message);
    
    // Clear input
    messageInput.val('');
    characterCount.text('0/4000');
    
    // Store last message for regeneration
    lastUserMessage = message;
    
    // Clear any uploaded file
    if (uploadedFile) {
      uploadedFile = null;
      filePreviewContainer.addClass('hidden');
    }
  }
  
  function addUserMessage(message) {
    const time = getCurrentTime();
    const messageHtml = `
      <div class="chat chat-end">
        <div class="chat-image">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center p-0">
            <i class="fas fa-user text-white text-sm transform translate-y-[1px]"></i>
          </div>
        </div>
        <div class="chat-header opacity-70 text-xs">
          You <span class="message-time">${time}</span>
        </div>
        <div class="chat-bubble msg-user bg-blue-600/70 text-white shadow-md border border-blue-500/30 backdrop-blur-sm">
          <p>${formatMessage(message)}</p>
        </div>
        <div class="chat-footer opacity-70 text-xs">
          Seen
        </div>
      </div>
    `;
    
    messagesContainer.append(messageHtml);
    applyHighlighting();
    scrollToBottom();
  }
  
  function addAiMessage(message, isComplete = false) {
    // console.log('Adding AI message:', { isComplete, messageLength: message?.length });
    
    const time = getCurrentTime();
    const messageHtml = `
      <div class="chat chat-start chat-ai">
        <div class="chat-image">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center p-0">
            <i class="fas fa-robot text-white text-sm transform translate-y-[1px]"></i>
          </div>
        </div>
        <div class="chat-header opacity-70 text-xs">
          Wisdomizer <span class="message-time">${time}</span>
        </div>
        <div class="chat-bubble msg-ai bg-gray-700/70 text-gray-100 shadow-md border border-gray-600/30 backdrop-blur-sm">
          ${isComplete ? formatMessage(message) : `
            <div class="typing-indicator" id="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          `}
        </div>
        <div class="chat-footer opacity-70 text-xs">
          ${isComplete ? 'Delivered' : 'Typing...'}
        </div>
      </div>
    `;
    
    messagesContainer.append(messageHtml);
    
    // Apply highlighting and render diagrams
    applyHighlighting();
    
    scrollToBottom();
    
    // Only add animation delay for incomplete messages
    if (!isComplete) {
      setTimeout(() => {
        const aiMessageBubble = $('.chat-ai').last().find('.chat-bubble');
        aiMessageBubble.html(formatMessage(message));
        
        // Apply highlighting after updating content
        applyHighlighting();
        
        scrollToBottom();
      }, 500);
    }
    
    // console.log('AI message added:', { isComplete, messageLength: message?.length });
  }
  
  function addWelcomeMessage() {
    // console.log('Adding welcome message with mermaid diagram');
    
    const markdownWelcome = `# Welcome to Wisdomizer! 👋

I'm your AI assistant, ready to help with information, explanations, and creative tasks.

## What I can do:

* Answer questions on a wide range of topics
* Generate and explain code in multiple languages
* Help with writing and creative tasks
* Format responses with **bold**, *italic*, and \`code\` styling
* Create diagrams with mermaid syntax

### Code example:

\`\`\`javascript
// A simple function in JavaScript
function greet(name) {
  return \`Hello, \${name}! Welcome to Wisdomizer.\`;
}
\`\`\`

### Diagram example:

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it a question?}
    B -->|Yes| C[Research and analyze]
    B -->|No| D[Generate creative content]
    C --> E[Provide answer]
    D --> E
    E --> F[End]
\`\`\`

How can I assist you today?`;

    const time = getCurrentTime();
    const formattedContent = formatMessage(markdownWelcome);
    
    const messageHtml = `
      <div class="chat chat-start">
        <div class="chat-image avatar">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center">
            <i class="fas fa-robot text-white text-center"></i>
          </div>
        </div>
        <div class="chat-header opacity-70 text-xs">
          Wisdomizer <span class="message-time">${time}</span>
        </div>
        <div class="chat-bubble msg-ai bg-gray-700/70 text-gray-100 shadow-md border border-gray-600/30 backdrop-blur-sm">
          ${formattedContent}
        </div>
        <div class="chat-footer opacity-70 text-xs">
          Delivered
        </div>
      </div>
    `;
    
    messagesContainer.append(messageHtml);
    
    // Give a small delay to ensure DOM insertion before attempting to render diagrams
    setTimeout(() => {
      applyHighlighting();
      processMermaidDiagrams();
      
      // Multiple attempts with increasing delays to ensure diagram rendering
      setTimeout(() => {
        processMermaidDiagrams();
      }, 500);
      
      setTimeout(() => {
        processMermaidDiagrams();
      }, 1500);
    }, 100);
    
    scrollToBottom();
  }
  
  function processUserMessage(message) {
    // Show AI is typing
    addTypingIndicator();
    
    // Prepare API request data
    const requestData = {
      message: message,
      topic: currentTopic,
      chat_uuid: currentChatUUID
    };
    
    // Add file data if available
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = function(e) {
        // Add file data to request
        requestData.file = {
          name: uploadedFile.name,
          content: e.target.result.split(',')[1], // Get base64 data without the prefix
          type: uploadedFile.type
        };
        
        // Send to API with file
        sendToApi(requestData);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      // Send to API without file
      sendToApi(requestData);
    }
  }
  
  function sendToApi(requestData) {
    // console.log('Sending to API:', requestData);
    
    // Add system prompt to the request
    requestData.system = systemPrompt;
    
    // If running in development mode, use simulated response
    if (window.location.hostname === 'localhost' && false) {
      simulateStreamResponse(requestData.message);
      return;
    }
    
    // URL will be filled in later - using a dummy URL for now
    const apiUrl = '/chat'; // Use relative path instead of hardcoded URL
    
    // If there's an ongoing stream, abort it
    if (currentStreamController) {
      currentStreamController.abort();
      currentStreamController = null;
    }
    
    // Create new abort controller for this request
    currentStreamController = new AbortController();
    const { signal } = currentStreamController;
    
    // Custom streaming implementation
    streamRequest(apiUrl, requestData, signal);
  }
  
  /**
   * Performs a streaming request to the server
   * @param {string} url - The URL to send the request to
   * @param {object} data - The data to send in the request
   * @param {AbortSignal} signal - AbortController signal for cancellation
   */
  function streamRequest(url, data, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.responseType = 'text';
      xhr.timeout = 60000; // 60 seconds timeout
      
      // Set up abort controller
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Request aborted'));
        });
      }
      
      let aiMessage = '';
      let isFirstChunk = true;
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          // Start processing any available data
          readStream();
        }
        
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            // Request completed successfully
            resolve(aiMessage);
          } else {
            // Handle errors
            console.error('Stream request failed:', xhr.status, xhr.statusText);
            reject(new Error(`Request failed with status ${xhr.status}`));
          }
        }
      };
      
      function readStream() {
        let newData = xhr.responseText;
        
        // Split the response by event delimiter and process each event
        const events = newData.split('data: ');
        
        for (let i = 0; i < events.length; i++) {
          const event = events[i].trim();
          if (!event) continue;
          
          try {
            const parsed = JSON.parse(event);
            
            // Check for DONE marker
            if (parsed.content === '|DONE|') {
              // Remove typing indicator if it exists
              removeTypingIndicator();
              
              // Complete message is done, add final message if not already added
              if (aiMessage && isFirstChunk) {
                addAiMessage(aiMessage, true);
                isFirstChunk = false;
              }
              
              continue;
            }
            
            // Handle content chunks
            if (parsed.content) {
              // Remove typing indicator on first content
              if (isFirstChunk) {
                removeTypingIndicator();
                
                // Add initial message
                addAiMessage(parsed.content, false);
                aiMessage = parsed.content;
                isFirstChunk = false;
              } else {
                // Append to existing message
                aiMessage += parsed.content;
                
                // Update message in UI
                updateAiMessage(aiMessage);
              }
            }
          } catch (e) {
            console.error('Error parsing event stream:', e, event);
          }
        }
      }
      
      xhr.send(JSON.stringify(data));
    });
  }
  
  /**
   * For testing only: Simulates a streaming response
   * @param {string} userMessage - The user's message
   */
  function simulateStreamResponse(userMessage) {
    let response = '';
    const totalChunks = 20;
    let chunkIndex = 0;
    
    // Generate a response based on user message
    const baseResponse = getSimulatedResponse(userMessage);
    const chunkSize = Math.ceil(baseResponse.length / totalChunks);
    
    // Simulate streaming with delays
    const streamInterval = setInterval(() => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, baseResponse.length);
      
      if (start >= baseResponse.length) {
        clearInterval(streamInterval);
        addAiMessage(response, true);
        return;
      }
      
      // Add the next chunk
      const chunk = baseResponse.substring(start, end);
      response += chunk;
      
      // Update the message
      addAiMessage(response, false);
      
      chunkIndex++;
    }, 100);
  }
  
  /**
   * For testing only: Returns a simulated response
   * @param {string} message - The user's message
   * @returns {string} - A simulated AI response
   */
  function getSimulatedResponse(message) {
    // Simple test responses
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      return "Hello there! 👋 How can I assist you today with Wisdomizer? I'm here to help answer your questions and provide insights on various topics.";
    } else if (message.toLowerCase().includes('help')) {
      return "I'm Wisdomizer, your AI assistant. Here's what I can help you with:\n\n- Answer questions on almost any topic\n- Provide explanations and summaries\n- Assist with brainstorming and creative thinking\n- Help with problem-solving and decision-making\n\nJust type your question or request, and I'll do my best to assist you!";
    } else if (message.toLowerCase().includes('thank')) {
      return "You're welcome! It's my pleasure to help. Is there anything else you'd like to know about?";
    } else if (message.toLowerCase().includes('how are you')) {
      return "As an AI, I don't have feelings, but I'm functioning well and ready to assist you! How can I help you today?";
    } else {
      return `Thanks for your message: "${message}"\n\nI'm a simulated response for testing purposes. In the actual implementation, I would provide a meaningful and helpful response based on your query. Is there anything specific you'd like to know about Wisdomizer?`;
    }
  }
  
  function startNewChat() {
    // Create a new topic with timestamp
    const timestamp = new Date().toLocaleString().replace(/[/:\\]/g, '-');
    const newTopicName = `New Chat ${timestamp}`;
    
    // Make API call to create topic
    fetch('/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: newTopicName,
        description: 'New chat topic'
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to create topic: ${response.statusText}`);
      }
      return response.json();
    })
    .then(topic => {
      // Add to the topics list
      addTopicToSidebar(topic.title, topic.uuid, true);
      
      // Set as current topic and chat UUID
      currentTopic = topic.title;
      currentChatUUID = topic.uuid;
      
      // Clear the chat and add welcome message
      messagesContainer.empty();
      addWelcomeMessage();
      
      // Close mobile sidebar if open
      mobileSidebar.removeClass('show');
      sidebarBackdrop.removeClass('show');
      
      // Update UI to show active topic
      $('.topic-item').removeClass('bg-gray-700/50').addClass('hover:bg-gray-700/30');
      $('.topic-item').removeClass('text-gray-100').addClass('text-gray-300');
      $(`.topic-item[data-uuid="${topic.uuid}"]`).removeClass('hover:bg-gray-700/30').addClass('bg-gray-700/50');
      $(`.topic-item[data-uuid="${topic.uuid}"]`).removeClass('text-gray-300').addClass('text-gray-100');
      
      // console.log('New chat created and loaded:', { topicTitle: topic.title, topicUUID: topic.uuid });
    })
    .catch(error => {
      console.error('Error creating topic:', error);
      createNotification('Failed to create new topic', 'error');
    });
  }
  
  function addTopicToSidebar(topicName, topicUUID, isActive = false) {
    const topicHtml = `
      <div class="topic-item flex items-center gap-2 p-2 rounded-lg ${isActive ? 'bg-gray-700/50 text-gray-100' : 'hover:bg-gray-700/30 text-gray-300'} cursor-pointer group" data-uuid="${topicUUID}">
        <i class="fas fa-comment-alt text-xs ${isActive ? 'text-gray-400' : 'text-gray-500'}"></i>
        <span class="topic-name truncate flex-grow text-sm">${topicName}</span>
        <div class="topic-actions ${window.innerWidth >= 768 ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''} flex gap-1">
          <button class="topic-rename p-1 text-gray-400 hover:text-gray-200"><i class="fas fa-pencil-alt text-xs"></i></button>
          <button class="topic-delete p-1 text-gray-400 hover:text-gray-200"><i class="fas fa-trash-alt text-xs"></i></button>
        </div>
      </div>
    `;
    
    // Add to both desktop and mobile sidebars
    $('#topics-sidebar .overflow-y-auto').prepend(topicHtml);
    $('#mobile-topics-sidebar .overflow-y-auto').prepend(topicHtml);
  }
  
  function loadTopic(topicName, topicUUID) {
    // console.log('Loading topic:', { topicName, topicUUID });
    
    // Generate a unique ID for this topic loading operation
    const loadingId = Date.now().toString();
    currentTopicLoadingId = loadingId;
    
    // Update state variables
    currentTopic = topicName;
    currentChatUUID = topicUUID;
    
    // Stop any ongoing message streaming
    if (currentStreamController) {
      currentStreamController.abort();
      currentStreamController = null;
    }
    
    // Clear the existing messages
    messagesContainer.empty();
    
    // Show loading state
    const loadingHtml = `
      <div id="loading-indicator" class="flex justify-center items-center h-full">
        <div class="text-gray-400">
          <i class="fas fa-spinner fa-spin mr-2"></i>
          Loading chat history...
        </div>
      </div>
    `;
    messagesContainer.html(loadingHtml);
    
    // Fetch chat history
    // console.log('Fetching chat history from:', `/chat/${topicUUID}`);
    return fetch(`/chat/${topicUUID}`)
      .then(response => {
        // If another topic has started loading, abort this one
        if (currentTopicLoadingId !== loadingId) {
          // console.log('Aborting topic load - newer load in progress');
          return Promise.reject(new Error('Topic load aborted'));
        }
        
        // console.log('Chat history response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to load chat history: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // If another topic has started loading, abort this one
        if (currentTopicLoadingId !== loadingId) {
          // console.log('Aborting topic processing - newer load in progress');
          return Promise.reject(new Error('Topic load aborted'));
        }
        
        // console.log('Received chat history data:', {
        //   chat: data.chat,
        //   messageCount: data.messages?.length || 0
        // });
        
        // Clear everything in the messages container
        messagesContainer.empty();
        
        // Add each message from history
        if (data.messages && data.messages.length > 0) {
          // console.log('Adding messages to chat:', data.messages.length);
          let processedCount = 0;
          
          // Process messages sequentially with a delay to ensure proper rendering
          const processMessage = (index) => {
            // If another topic has started loading, abort this one
            if (currentTopicLoadingId !== loadingId) {
              // console.log('Aborting message processing - newer load in progress');
              return;
            }
            
            if (index >= data.messages.length) {
              // All messages processed, add topic change message
              const messageHtml = `
                <div class="flex justify-center my-4">
                  <div class="bg-gray-800/70 text-gray-400 text-xs py-1 px-3 rounded-full border border-gray-700/50">
                    Switched to topic: ${topicName}
                  </div>
                </div>
              `;
              messagesContainer.append(messageHtml);
              applyHighlighting();
              scrollToBottom();
              
              // Final verification
              setTimeout(() => {
                if (currentTopicLoadingId !== loadingId) return;
                
                const renderedMessages = messagesContainer.find('.chat').length;
                // console.log('Final message count verification:', {
                //   expected: data.messages.length,
                //   rendered: renderedMessages,
                //   difference: data.messages.length - renderedMessages,
                //   processedCount
                // });
              }, 500);
              
              return;
            }
            
            const msg = data.messages[index];
            // console.log(`Processing message ${index + 1}/${data.messages.length}:`, { 
            //   role: msg.role, 
            //   contentLength: msg.content?.length
            // });
            
            if (msg.role === 'user') {
              addUserMessage(msg.content);
              lastUserMessage = msg.content;
              processedCount++;
            } else if (msg.role === 'assistant') {
              addAiMessage(msg.content, true);
              processedCount++;
            } else {
              console.warn(`Unknown message role: ${msg.role}`);
            }
            
            // Process next message after a short delay
            setTimeout(() => processMessage(index + 1), 50);
          };
          
          // Start processing messages
          processMessage(0);
        } else {
          // console.log('No messages found in chat history');
          addWelcomeMessage();
        }
        
        // console.log('Chat history loaded successfully');
      })
      .catch(error => {
        // If this is an intentional abort, don't show an error
        if (error.message === 'Topic load aborted') {
          // console.log('Topic load was intentionally aborted');
          return;
        }
        
        // Only handle the error if this is still the current loading operation
        if (currentTopicLoadingId === loadingId) {
          console.error('Error loading chat history:', error);
          messagesContainer.empty();
          addWelcomeMessage();
          createNotification('Failed to load chat history', 'error');
        }
        
        throw error;
      });
  }
  
  function renameTopic(topicUUID, newName) {
    fetch(`/topics/${topicUUID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: newName
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to rename topic: ${response.statusText}`);
      }
      return response.json();
    })
    .then(topic => {
      // Update the topic name in the UI
      $(`.topic-item[data-uuid="${topicUUID}"] .topic-name`).text(topic.title);
      
      if (currentTopic === topic.title) {
        currentTopic = topic.title;
      }
      
      createNotification(`Topic renamed to "${topic.title}"`, 'success');
    })
    .catch(error => {
      console.error('Error renaming topic:', error);
      createNotification('Failed to rename topic', 'error');
    });
  }
  
  function deleteTopic(topicUUID) {
    // console.log('Deleting topic:', topicUUID);
    
    // First, clear the chat if this is the current topic
    if (currentChatUUID === topicUUID) {
      messagesContainer.empty();
      addWelcomeMessage();
      
      // Reset state variables
      currentTopic = "Getting started with Wisdomizer";
      currentChatUUID = null;
      lastUserMessage = "";
    }
    
    // Remove the topic from the UI immediately
    $(`.topic-item[data-uuid="${topicUUID}"]`).remove();
    
    // Make API call to delete topic
    fetch(`/topics/${topicUUID}`, {
      method: 'DELETE'
    })
    .then(response => {
      // console.log('Delete topic response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to delete topic: ${response.statusText}`);
      }
      return response.json();
    })
    .then(() => {
      // console.log('Topic deleted successfully');
      
      // If this was the current topic, start a new chat
      if (currentChatUUID === topicUUID) {
        // Start a new chat after a short delay to ensure UI is updated
        setTimeout(() => {
          startNewChat();
        }, 100);
      }
      
      createNotification('Topic deleted', 'info');
    })
    .catch(error => {
      console.error('Error deleting topic:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        topicUUID
      });
      
      // Restore the topic in UI if deletion failed
      if (currentChatUUID === topicUUID) {
        currentTopic = "Getting started with Wisdomizer";
        currentChatUUID = null;
        lastUserMessage = "";
        startNewChat();
      }
      
      createNotification('Failed to delete topic', 'error');
    });
  }
  
  function showFilePreview(file) {
    const fileSizeStr = formatFileSize(file.size);
    const filePreviewHtml = `
      <div class="file-preview bg-gray-700/30 p-2 max-w-[300px]">
        <div class="flex items-center gap-2">
          <i class="fas fa-file ${getFileIcon(file.type)} text-blue-400"></i>
          <span class="file-name text-sm truncate flex-1">${file.name}</span>
          <span class="file-size text-xs opacity-70">${fileSizeStr}</span>
          <div class="file-remove text-gray-300 hover:text-white">
            <i class="fas fa-times text-xs"></i>
          </div>
        </div>
      </div>
    `;
    
    filePreviewContainer.html(filePreviewHtml).removeClass('hidden');
    
    // Add click handler for removing file
    $('.file-remove').on('click', function() {
      uploadedFile = null;
      filePreviewContainer.addClass('hidden');
      fileUpload.val('');
    });
  }
  
  // Helper functions
  function formatMessage(message) {
    // console.log('Formatting message:', message.substring(0, 50) + '...');
    
    try {
      // Check if markdown libraries are available
      if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
        console.error('Markdown libraries not available');
        return `<div class="markdown-content"><p>${escapeHtml(message)}</p></div>`;
      }
      
      // First, check for mermaid code blocks in the raw message
      const hasMermaidCodeBlocks = message.includes('```mermaid') || message.includes('~~~mermaid');
      
      if (hasMermaidCodeBlocks) {
        // console.log('Message contains mermaid code blocks, will need special processing');
        
        // Find all mermaid code blocks for logging
        const mermaidRegex = /```mermaid\n([\s\S]*?)```|~~~mermaid\n([\s\S]*?)~~~/g;
        let match;
        let matchCount = 0;
        
        while ((match = mermaidRegex.exec(message)) !== null) {
          matchCount++;
          const content = match[1] || match[2];
          // console.log(`Found mermaid block #${matchCount}:`, content.substring(0, 50) + '...');
        }
      }
      
      // Decode any HTML entities in the message first
      const decodedMessage = decodeHtmlEntities(message);
      
      // Convert markdown to HTML
      // console.log('Converting markdown to HTML');
      const rawHtml = marked.parse(decodedMessage);
      
      // Check if the raw HTML contains mermaid divs
      const containsMermaidDiv = rawHtml.includes('class="mermaid"');
      // console.log('Raw HTML contains mermaid divs:', containsMermaidDiv);
      
      if (containsMermaidDiv) {
        // console.log('Raw HTML from markdown contains mermaid divs, sample:', 
        //   rawHtml.substring(rawHtml.indexOf('class="mermaid"') - 50, rawHtml.indexOf('class="mermaid"') + 200));
      }
      
      // Use permissive sanitization settings to preserve Mermaid diagrams
      const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['mermaid'],
        ADD_ATTR: ['target', 'data-content', 'data-processed', 'id'],
        ALLOW_DATA_ATTR: true,
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
          'p', 'br', 'hr', 'ol', 'ul', 'li', 
          'blockquote', 'pre', 'code', 'span', 'div',
          'strong', 'em', 'a', 'table', 'thead', 
          'tbody', 'tr', 'th', 'td', 'img', 'details', 
          'summary', 'del', 'input', 'svg', 'g', 'path',
          'circle', 'rect', 'polygon', 'ellipse', 'line',
          'polyline', 'text', 'foreignObject', 'marker',
          'mermaid'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'class', 'style', 'type', 'checked',
          'data-processed', 'data-content', 'id', 'viewBox', 'd', 'fill',
          'stroke', 'stroke-width', 'x', 'y', 'cx', 'cy', 'r', 'width', 
          'height', 'transform', 'points', 'marker-end', 'marker-start',
          'text-anchor', 'font-family', 'font-size', 'dominant-baseline'
        ]
      });
      
      // Check if sanitized HTML contains mermaid divs
      const containsMermaidDivAfterSanitize = sanitizedHtml.includes('class="mermaid"');
      // console.log('HTML after sanitization contains mermaid divs:', containsMermaidDivAfterSanitize);
      
      // Check for mermaid divs using DOM parsing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizedHtml;
      const mermaidDivs = tempDiv.querySelectorAll('.mermaid');
      // console.log(`Found ${mermaidDivs.length} mermaid divs using DOM parsing`);
      
      // If we have mermaid code blocks but no mermaid divs after parsing, our renderer isn't working correctly
      if (hasMermaidCodeBlocks && mermaidDivs.length === 0) {
        // console.warn('Mermaid code blocks were detected but not converted to mermaid divs, attempting manual conversion');
        
        // Replace markdown mermaid code blocks with explicit mermaid divs
        let modifiedMessage = message;
        const mermaidCodeBlockRegex = /```mermaid\n([\s\S]*?)```|~~~mermaid\n([\s\S]*?)~~~/g;
        let blockCount = 0;
        
        modifiedMessage = modifiedMessage.replace(mermaidCodeBlockRegex, (match, codeBlock1, codeBlock2) => {
          blockCount++;
          const codeBlock = (codeBlock1 || codeBlock2).trim();
          const id = `mermaid-manual-${Date.now()}-${blockCount}`;
          const encodedContent = encodeURIComponent(codeBlock);
          
          // console.log(`Manually converting mermaid block #${blockCount} to div`);
          
          // Create HTML for mermaid diagram
          return `<div class="mermaid" id="${id}" data-processed="false" data-content="${encodedContent}">${codeBlock}</div>`;
        });
        
        if (blockCount > 0) {
          // console.log(`Manually converted ${blockCount} mermaid blocks to divs`);
          
          // Re-parse the modified message
          const newRawHtml = marked.parse(modifiedMessage);
          const newSanitizedHtml = DOMPurify.sanitize(newRawHtml, {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['mermaid'],
            ADD_ATTR: ['target', 'data-content', 'data-processed', 'id'],
            ALLOW_DATA_ATTR: true
          });
          
          // Check if our manual conversion worked
          const tempDiv2 = document.createElement('div');
          tempDiv2.innerHTML = newSanitizedHtml;
          const mermaidDivsAfterFix = tempDiv2.querySelectorAll('.mermaid');
          // console.log(`After manual conversion, found ${mermaidDivsAfterFix.length} mermaid divs`);
          
          if (mermaidDivsAfterFix.length > 0) {
            // Use our manual conversion result
            const formattedHtml = `<div class="markdown-content">${newSanitizedHtml}</div>`;
            
            // Schedule mermaid processing
            setTimeout(() => {
              // console.log('Processing mermaid diagrams after manual conversion');
              processMermaidDiagrams();
            }, 10);
            
            return formattedHtml;
          }
        }
      }
      
      // Return the formatted HTML with standard processing
      const formattedHtml = `<div class="markdown-content">${sanitizedHtml}</div>`;
      
      // Trigger diagram processing on the next tick if we found mermaid divs
      if (mermaidDivs.length > 0) {
        setTimeout(() => {
          // console.log('Triggering mermaid processing after markdown rendering');
          processMermaidDiagrams();
        }, 10);
      }
      
      return formattedHtml;
    } catch (error) {
      console.error('Error formatting message:', error);
      return `<div class="markdown-content"><p>${escapeHtml(message)}</p></div>`;
    }
  }
  
  // Escape HTML to prevent XSS before markdown processing
  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  function scrollToBottom() {
    messagesContainer[0].scrollTo({
      top: messagesContainer[0].scrollHeight,
      behavior: 'smooth'
    });
  }
  
  function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  }
  
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  }
  
  function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fa-image';
    if (fileType.startsWith('video/')) return 'fa-video';
    if (fileType.startsWith('audio/')) return 'fa-music';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.includes('word')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fa-file-powerpoint';
    if (fileType.includes('zip') || fileType.includes('compressed')) return 'fa-file-archive';
    if (fileType.includes('text/')) return 'fa-file-alt';
    if (fileType.includes('code') || fileType.includes('javascript') || fileType.includes('json')) return 'fa-file-code';
    return 'fa-file';
  }
  
  // Add typing indicator for AI
  function addTypingIndicator() {
    isAiResponding = true;
    const time = getCurrentTime();
    const indicatorHtml = `
      <div class="chat chat-start ai-thinking" id="typing-indicator">
        <div class="chat-image">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center p-0">
            <i class="fas fa-robot text-white text-sm transform translate-y-[1px]"></i>
          </div>
        </div>
        <div class="chat-header opacity-70 text-xs">
          Wisdomizer <span class="message-time">${time}</span>
        </div>
        <div class="chat-bubble msg-ai bg-gray-700/70 text-gray-100 shadow-md border border-gray-600/30 backdrop-blur-sm p-4">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div class="chat-footer opacity-70 text-xs">
          Typing...
        </div>
      </div>
    `;
    
    messagesContainer.append(indicatorHtml);
    applyHighlighting();
    scrollToBottom();
  }
  
  // Remove typing indicator
  function removeTypingIndicator() {
    $('#typing-indicator').remove();
    isAiResponding = false;
  }
  
  // Update existing AI message
  function updateAiMessage(content) {
    const aiMessageElement = $('.chat-ai').last();
    if (aiMessageElement.length) {
      aiMessageElement.find('.chat-bubble').html(formatMessage(content));
      
      // Apply highlighting
      applyHighlighting();
      
      scrollToBottom();
    }
  }
  
  /**
   * Process all unprocessed Mermaid diagrams in the document
   */
  function processMermaidDiagrams() {
    // Verify that the Mermaid library is loaded
    if (typeof mermaid === 'undefined') {
      console.error('Mermaid library not loaded');
      return;
    }

    // Find all mermaid divs
    const allMermaidDivs = document.querySelectorAll('div.mermaid, .mermaid');
    // console.log(`Found ${allMermaidDivs.length} total mermaid diagrams`);
    
    // Log all mermaid divs for debugging
    if (allMermaidDivs.length > 0) {
      // console.log('All mermaid divs:', allMermaidDivs);
      
      // Check each mermaid div to see if it has processed attribute
      /*
      allMermaidDivs.forEach((div, i) => {
        console.log(`Diagram #${i+1}:`, {
          id: div.id || 'no-id',
          processed: div.hasAttribute('data-processed'),
          processedValue: div.getAttribute('data-processed'),
          classes: div.className,
          content: div.textContent.substring(0, 30) + '...'
        });
      });
      */
    }

    // Find unprocessed mermaid divs using a more reliable approach
    // Look for any element with mermaid class that doesn't have the data-processed attribute set to "true"
    const unprocessedDiagrams = Array.from(document.querySelectorAll('.mermaid')).filter(div => {
      return div.getAttribute('data-processed') !== 'true';
    });
    
    // console.log(`Found ${unprocessedDiagrams.length} unprocessed mermaid diagrams using filtered approach`);
    
    // If no diagrams to process, just return
    if (unprocessedDiagrams.length === 0) {
      return;
    }

    // Process each diagram
    unprocessedDiagrams.forEach(diagram => {
      // Generate unique ID for diagram if not already set
      if (!diagram.id) {
        diagram.id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      }
      
      // Get diagram content using the helper function
      const content = getDiagramContent(diagram);
      
      // Skip empty diagrams
      if (!content) {
        // console.warn('Empty mermaid diagram found, skipping', diagram);
        return;
      }
      
      // console.log(`Processing mermaid diagram: ${diagram.id} with content: ${content.substring(0, 50)}...`);
      
      // Create loading container
      showLoadingIndicator(diagram);
      
      // Render the diagram
      renderMermaidSafely(diagram, content)
        .then(() => {
          // Remove loading indicator when rendering is complete
          const loadingContainer = diagram.querySelector('.mermaid-loading-container');
          if (loadingContainer) {
            loadingContainer.remove();
          }
          
          // Mark as processed
          diagram.setAttribute('data-processed', 'true');
          // console.log(`Successfully rendered diagram: ${diagram.id}`);
          
          // Run a debug check
          // setTimeout(debugMermaidDiagrams, 100);
        })
        .catch(error => {
          // Display error with enhanced formatting
          displayMermaidError(diagram, error, content);
          console.error(`Failed to render diagram: ${diagram.id}`, error);
          
          // Run a debug check
          // setTimeout(debugMermaidDiagrams, 100);
        });
    });
  }
  
  /**
   * Shows a loading indicator in a mermaid diagram container
   * @param {HTMLElement} diagram - The diagram element to show loading indicator in
   */
  function showLoadingIndicator(diagram) {
    // Create loading container
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'mermaid-loading-container';
    
    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'mermaid-loading-indicator';
    loadingIndicator.textContent = 'Rendering diagram...';
    
    // Add to container
    loadingContainer.appendChild(loadingIndicator);
    
    // Add to diagram
    diagram.appendChild(loadingContainer);
  }
  
  /**
   * Safely renders a Mermaid diagram in an isolated environment
   * @param {HTMLElement} diagram - The diagram element to render into
   * @param {string} content - The diagram content to render
   * @returns {Promise} - Resolves when rendering is complete
   */
  function renderMermaidSafely(diagram, content) {
    // console.log(`Rendering diagram safely: ${diagram.id}`, { 
    //   content: content.substring(0, 50),
    //   contentLength: content.length
    // });
    
    // Extra validation - ensure content is clean
    let cleanContent = content;
    // Make sure we have a string
    if (typeof cleanContent !== 'string') {
      // console.warn('Content is not a string, converting to string');
      cleanContent = String(cleanContent || '');
    }
    
    // Decode entities
    cleanContent = decodeHtmlEntities(cleanContent);
    
    // Verify content has basic Mermaid structure
    if (!cleanContent.includes('graph') && 
        !cleanContent.includes('sequenceDiagram') &&
        !cleanContent.includes('classDiagram') &&
        !cleanContent.includes('flowchart') &&
        !cleanContent.includes('gantt') &&
        !cleanContent.includes('pie')) {
      // console.warn('Content may not be valid Mermaid syntax:', cleanContent);
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Create a hidden sandbox element for rendering
        const sandboxElement = document.createElement('div');
        sandboxElement.style.position = 'absolute';
        sandboxElement.style.left = '-9999px';
        sandboxElement.style.width = '1000px';
        sandboxElement.style.height = '1000px';
        sandboxElement.style.opacity = '0';
        sandboxElement.style.pointerEvents = 'none';
        sandboxElement.id = `sandbox-${diagram.id}`;
        sandboxElement.className = 'mermaid';
        sandboxElement.textContent = cleanContent;
        
        // Add to document body temporarily
        document.body.appendChild(sandboxElement);
        // console.log(`Created sandbox element for diagram: ${diagram.id}`);
        
        // Use mermaid to render the diagram in the sandbox
        // console.log(`Calling mermaid.init on sandbox: ${sandboxElement.id}`);
        
        // Ensure debug is disabled for this rendering
        const renderConfig = {
          logLevel: 5,
          suppressErrors: true,
          securityLevel: 'loose',
          startOnLoad: false,
          debug: false,
          verbose: false,
          logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {} // Suppress even error logs for this specific rendering
          }
        };
        
        // Try the more direct render API first
        try {
          mermaid.render(`render-${diagram.id}`, cleanContent, renderConfig)
            .then(result => {
              // console.log('Direct render succeeded:', result);
              // Successfully rendered, now copy to original diagram
              
              // Clear the original diagram (but keep loading container if it exists)
              const loadingContainer = diagram.querySelector('.mermaid-loading-container');
              diagram.innerHTML = '';
              if (loadingContainer) {
                diagram.appendChild(loadingContainer);
              }
              
              // Add the rendered SVG
              diagram.innerHTML += result.svg;
              
              // Clean up the sandbox
              if (document.body.contains(sandboxElement)) {
                document.body.removeChild(sandboxElement);
              }
              
              resolve();
            })
            .catch(err => {
              // console.error('Direct render failed, falling back to init:', err);
              
              // Fallback to mermaid.init
              try {
                // Temporarily override console methods before initialization
                const originalConsoleLog = console.log;
                const originalConsoleWarn = console.warn;
                const originalConsoleInfo = console.info;
                const originalConsoleDebug = console.debug;
                
                // Replace with empty functions to suppress output
                console.log = () => {};
                console.warn = () => {};
                console.info = () => {};
                console.debug = () => {};
                
                // Initialize with silent config
                mermaid.initialize(renderConfig);
                mermaid.init(undefined, sandboxElement);
                
                // Restore console methods
                console.log = originalConsoleLog;
                console.warn = originalConsoleWarn;
                console.info = originalConsoleInfo;
                console.debug = originalConsoleDebug;
                
                // Wait a moment for rendering to complete
                setTimeout(() => {
                  try {
                    // Check if rendering was successful
                    if (sandboxElement.querySelector('svg')) {
                      // console.log(`Successfully rendered SVG for diagram: ${diagram.id}`);
                      // Copy the rendered SVG to the original diagram
                      const svg = sandboxElement.querySelector('svg');
                      
                      // Clear the original diagram (but keep loading container if it exists)
                      const loadingContainer = diagram.querySelector('.mermaid-loading-container');
                      diagram.innerHTML = '';
                      if (loadingContainer) {
                        diagram.appendChild(loadingContainer);
                      }
                      
                      // Add the rendered SVG
                      diagram.appendChild(svg.cloneNode(true));
                      
                      // Clean up the sandbox
                      document.body.removeChild(sandboxElement);
                      
                      // Success
                      resolve();
                    } else {
                      // No SVG was generated, consider it an error
                      // console.error(`No SVG generated for diagram: ${diagram.id}`);
                      document.body.removeChild(sandboxElement);
                      reject(new Error('Failed to generate diagram SVG'));
                    }
                  } catch (finalError) {
                    // Handle errors during post-render processing
                    console.error('Error after rendering:', finalError);
                    try {
                      document.body.removeChild(sandboxElement);
                    } catch (e) {
                      // Ignore cleanup errors
                    }
                    reject(finalError);
                  }
                }, 100);
              } catch (initError) {
                // console.error('Init fallback also failed:', initError);
                try {
                  document.body.removeChild(sandboxElement);
                } catch (e) {
                  // Ignore cleanup errors
                }
                reject(initError);
              }
            });
        } catch (directRenderError) {
          // console.error('Error using direct render API:', directRenderError);
          reject(directRenderError);
        }
      } catch (error) {
        // Handle initial rendering errors
        console.error('Error starting render process:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Safely extracts mermaid diagram content from an element
   * @param {HTMLElement} diagram - The diagram element to get content from
   * @returns {string} - The cleaned diagram content
   */
  function getDiagramContent(diagram) {
    // console.log('Extracting content from diagram:', diagram.id || 'unnamed');
    
    // Try to get content from data attribute first (this is most reliable)
    let content = diagram.getAttribute('data-content');
    
    // If it's URL encoded, decode it
    if (content && content.indexOf('%') !== -1) {
      try {
        content = decodeURIComponent(content);
        // console.log('Decoded content from data-content attribute');
      } catch (e) {
        // console.warn('Error decoding content:', e);
      }
    }
    
    // If no content from data attribute, use text content as fallback
    if (!content) {
      content = diagram.textContent.trim();
      // console.log('Using textContent as fallback:', content.substring(0, 30) + '...');
      
      // Store in data attribute for future reference
      if (content) {
        diagram.setAttribute('data-content', encodeURIComponent(content));
        // console.log('Stored content in data-content attribute');
      }
    }
    
    // Last resort - if the content is empty but diagram has children, 
    // it might be a pre-rendered diagram or one with nested elements
    if (!content && diagram.children.length > 0) {
      // console.log('Content is empty but diagram has children, attempting to extract content from HTML structure');
      
      // Check if it has a pre or code element that might contain the source
      const preElement = diagram.querySelector('pre, code');
      if (preElement) {
        content = preElement.textContent.trim();
        // console.log('Extracted content from nested pre/code element:', content.substring(0, 30) + '...');
      } else {
        // Try to serialize the diagram's content excluding any SVG or error messages
        const tempClone = diagram.cloneNode(true);
        const svgElements = tempClone.querySelectorAll('svg');
        const errorElements = tempClone.querySelectorAll('.mermaid-error, .mermaid-loading-container');
        
        // Remove SVG and error elements before getting content
        svgElements.forEach(svg => svg.remove());
        errorElements.forEach(err => err.remove());
        
        content = tempClone.textContent.trim();
        // console.log('Extracted content after removing SVG/errors:', content.substring(0, 30) + '...');
      }
      
      // Store the extracted content
      if (content) {
        diagram.setAttribute('data-content', encodeURIComponent(content));
        // console.log('Stored extracted content in data-content attribute');
      }
    }
    
    // If still no content, check if this is wrapped in a code block
    if (!content && diagram.parentElement) {
      const parent = diagram.parentElement;
      if (parent.tagName === 'PRE' || parent.tagName === 'CODE') {
        content = parent.textContent.trim();
        // console.log('Extracted content from parent pre/code element:', content.substring(0, 30) + '...');
        
        if (content) {
          diagram.setAttribute('data-content', encodeURIComponent(content));
          // console.log('Stored parent content in data-content attribute');
        }
      }
    }
    
    // Ensure the content is properly cleaned
    if (content) {
      // Clean up any entities
      content = decodeHtmlEntities(content);
      
      // Remove any HTML tags that might have been introduced
      content = content.replace(/<[^>]*>/g, '');
      
      // console.log('Final cleaned content:', content.substring(0, 30) + '...');
    } else {
      // console.warn('Could not extract any content from diagram');
    }
    
    return content || '';
  }
  
  // Apply syntax highlighting to code blocks and process mermaid diagrams
  function applyHighlighting() {
    try {
      // Apply syntax highlighting
      if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code:not(.mermaid)').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      
      // Process mermaid diagrams with a short delay to let DOM settle
      // console.log('Scheduling mermaid processing after syntax highlighting');
      setTimeout(() => {
        processMermaidDiagrams();
        
        // Re-check after processing
        setTimeout(() => {
          const unprocessed = document.querySelectorAll('.mermaid:not([data-processed="true"])');
          if (unprocessed.length > 0) {
            // console.log(`Found ${unprocessed.length} diagrams still unprocessed after initial rendering, trying again`);
            processMermaidDiagrams();
          }
        }, 300);
      }, 50);
    } catch (e) {
      console.error('Error applying syntax highlighting:', e);
    }
  }
  
  // Add mermaid error styles
  function addMermaidErrorStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .mermaid-error {
        color: #f44336;
        padding: 10px;
        margin: 10px 0;
        border: 1px solid #f44336;
        border-radius: 4px;
        font-family: monospace;
        white-space: pre-wrap;
        background-color: rgba(244, 67, 54, 0.05);
      }
      .mermaid-error-title {
        font-weight: bold;
        margin-bottom: 10px;
        font-size: 1.1em;
      }
      .mermaid-error-message {
        margin-bottom: 8px;
      }
      .mermaid-error-code {
        margin: 10px 0;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
        overflow-x: auto;
      }
      .mermaid-error-line-number {
        color: #888;
        margin-right: 10px;
        user-select: none;
      }
      .mermaid-error-line-highlight {
        background-color: rgba(255, 214, 0, 0.3);
        font-weight: bold;
      }
      .mermaid-error-hint {
        margin-top: 10px;
        font-style: italic;
      }
    `;
    document.head.appendChild(styleElement);
  }
  
  // Force rendering of all mermaid diagrams using isolated approach
  function forceMermaidRendering() {
    // console.log('Force rendering all mermaid diagrams');
    
    if (typeof mermaid === 'undefined') {
      console.error('Mermaid library not loaded');
      return;
    }
    
    // Initialize mermaid with proper settings
    mermaid.initialize({
      startOnLoad: false,  // Don't automatically process on load
      securityLevel: 'loose',  // Allow rendering to work properly
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      logLevel: 5, // Error level only
      debug: false,
      verbose: false,
    });
    
    try {
      // Find only unprocessed mermaid divs
      const unprocessedDiagrams = document.querySelectorAll('div.mermaid:not([data-processed="true"])');
      // console.log(`Found ${unprocessedDiagrams.length} unprocessed mermaid diagrams`);
      
      // If no diagrams found, just return
      if (unprocessedDiagrams.length === 0) {
        // console.log('No unprocessed mermaid divs found');
        return;
      }
      
      // Process diagrams
      processMermaidDiagrams();
    } catch (err) {
      console.error('Error in forceMermaidRendering:', err);
    }
  }
  
  // Enable observers to process mermaid diagrams as they are added to the DOM
  function enableMermaidObserver() {
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(mutations => {
        // Check if any new mermaid diagrams were added
        let hasMermaidDiagrams = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            const newNodes = Array.from(mutation.addedNodes);
            
            // Check if any added nodes contain mermaid diagrams
            newNodes.forEach(node => {
              if (node.nodeType === 1) { // Element node
                // Check if the node itself is a mermaid diagram
                if (node.classList && node.classList.contains('mermaid')) {
                  hasMermaidDiagrams = true;
                }
                
                // Check if node contains mermaid diagrams
                const containsMermaid = node.querySelectorAll && node.querySelectorAll('.mermaid').length > 0;
                if (containsMermaid) {
                  hasMermaidDiagrams = true;
                }
              }
            });
          }
        });
        
        // If new mermaid diagrams were added, process them
        if (hasMermaidDiagrams) {
          // console.log('Detected new mermaid diagrams, processing...');
          setTimeout(() => {
            processMermaidDiagrams();
          }, 100);
        }
      });
      
      // Start observing the entire document
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // console.log('Mermaid observer enabled');
    }
  }
  
  /**
   * Debug function to check all mermaid diagrams on the page
   */
  function debugMermaidDiagrams() {
    // Find both with class selector and with more specific div.mermaid
    const allDiagrams = document.querySelectorAll('.mermaid');
    const allDiagramsAlt = document.querySelectorAll('div.mermaid');
    
    // Find by processed status
    const processed = document.querySelectorAll('.mermaid[data-processed="true"]');
    const explicitlyUnprocessed = document.querySelectorAll('.mermaid[data-processed="false"]');
    const withoutProcessedAttr = document.querySelectorAll('.mermaid:not([data-processed])');
    const implicitlyUnprocessed = Array.from(document.querySelectorAll('.mermaid')).filter(div => {
      return div.getAttribute('data-processed') !== 'true';
    });
    
    // Find by content
    const withErrors = document.querySelectorAll('.mermaid[data-error="true"]');
    const withSVG = document.querySelectorAll('.mermaid svg');
    const empty = document.querySelectorAll('.mermaid:empty');
    
    // console.log('==== MERMAID DIAGRAMS DEBUG ====');
    // console.log(`Total diagrams (.mermaid): ${allDiagrams.length}`);
    // console.log(`Total diagrams (div.mermaid): ${allDiagramsAlt.length}`);
    // console.log(`Explicitly processed: ${processed.length}`);
    // console.log(`Explicitly unprocessed: ${explicitlyUnprocessed.length}`);
    // console.log(`Without processed attr: ${withoutProcessedAttr.length}`);
    // console.log(`Implicitly unprocessed: ${implicitlyUnprocessed.length}`);
    // console.log(`With errors: ${withErrors.length}`);
    // console.log(`With SVG: ${withSVG.length}`);
    // console.log(`Empty diagrams: ${empty.length}`);
    
    // Check individual diagrams
    allDiagrams.forEach((diagram, index) => {
      const id = diagram.id || `unnamed-${index}`;
      const hasContent = !!diagram.textContent.trim();
      const hasDataContent = !!diagram.getAttribute('data-content');
      const isProcessed = diagram.getAttribute('data-processed') === 'true';
      const hasProcessedAttr = diagram.hasAttribute('data-processed');
      const hasError = diagram.getAttribute('data-error') === 'true';
      const hasSvg = !!diagram.querySelector('svg');
      const childNodes = diagram.childNodes.length;
      
      // Initially set all diagrams' data-processed to false if not set
      if (!hasProcessedAttr) {
        diagram.setAttribute('data-processed', 'false');
        // console.log(`Setting data-processed="false" for diagram ${id}`);
      }
      
      // console.log(`Diagram #${index + 1} (${id}):`, {
      //   isProcessed,
      //   hasProcessedAttr,
      //   hasContent,
      //   hasDataContent,
      //   hasError,
      //   hasSvg,
      //   childNodes,
      //   contentPreview: diagram.textContent.substring(0, 30),
      //   dataContentLength: hasDataContent ? diagram.getAttribute('data-content').length : 0
      // });
    });
    
    // console.log('================================');
    
    // Return true if everything looks good (all diagrams are either processed with SVG or have errors)
    return implicitlyUnprocessed.length === 0 || 
      (withSVG.length + withErrors.length === allDiagrams.length);
  }

  /**
   * Displays an error for a Mermaid diagram with formatted error details
   * @param {HTMLElement} diagramElement - The diagram element to show error for
   * @param {Error} error - The error that occurred
   * @param {string} originalContent - The original diagram content
   */
  function displayMermaidError(diagramElement, error, originalContent) {
    // console.error('Mermaid rendering error:', error);
    
    // Mark as processed to prevent further attempts
    diagramElement.setAttribute('data-processed', 'true');
    diagramElement.setAttribute('data-error', 'true');
    
    // Clear any existing content
    diagramElement.innerHTML = '';
    
    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'mermaid-error';
    
    // Add error title
    const errorTitle = document.createElement('div');
    errorTitle.className = 'mermaid-error-title';
    errorTitle.textContent = 'Mermaid Diagram Error';
    errorContainer.appendChild(errorTitle);
    
    // Add error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'mermaid-error-message';
    
    // Parse error message to extract line number
    let lineNumber = null;
    let errorMsg = error.message || 'Unknown error';
    
    // Check if it's a parse error with line information
    const lineMatch = errorMsg.match(/Parse error on line (\d+)/i);
    if (lineMatch && lineMatch[1]) {
      lineNumber = parseInt(lineMatch[1], 10);
    }
    
    errorMessage.textContent = errorMsg;
    errorContainer.appendChild(errorMessage);
    
    // Add code section with the problem highlighted if we have line information
    if (originalContent && originalContent.length > 0) {
      const codeContainer = document.createElement('div');
      codeContainer.className = 'mermaid-error-code';
      
      const lines = originalContent.split('\n');
      const startLine = Math.max(0, lineNumber ? lineNumber - 3 : 0);
      const endLine = Math.min(lines.length, lineNumber ? lineNumber + 2 : lines.length);
      
      // Display relevant code snippet with line numbers
      for (let i = startLine; i < endLine; i++) {
        const lineContainer = document.createElement('div');
        
        // Line number
        const lineNumberSpan = document.createElement('span');
        lineNumberSpan.className = 'mermaid-error-line-number';
        lineNumberSpan.textContent = (i + 1).toString().padStart(2, '0');
        lineContainer.appendChild(lineNumberSpan);
        
        // Line content
        const lineContent = document.createElement('span');
        lineContent.textContent = lines[i];
        if (lineNumber && i + 1 === lineNumber) {
          lineContent.className = 'mermaid-error-line-highlight';
        }
        lineContainer.appendChild(lineContent);
        
        codeContainer.appendChild(lineContainer);
      }
      
      errorContainer.appendChild(codeContainer);
      
      // Add hint for common issues
      const hint = document.createElement('div');
      hint.className = 'mermaid-error-hint';
      
      if (errorMsg.includes('Expected')) {
        hint.textContent = 'Hint: Check your syntax for missing brackets, quotes, or semicolons at the highlighted line.';
      } else if (errorMsg.includes('SCALE')) {
        hint.textContent = 'Hint: There might be an issue with scaling values. Use valid numbers for width/height.';
      } else if (errorMsg.includes('classDef')) {
        hint.textContent = 'Hint: Ensure class definitions use the correct syntax: classDef className fill:#color,stroke:#color,etc.';
      } else {
        hint.textContent = 'Hint: Review the Mermaid syntax documentation for the correct format for your diagram type.';
      }
      
      errorContainer.appendChild(hint);
    }
    
    // Append error container to diagram element
    diagramElement.appendChild(errorContainer);
  }

  // Add a global diagnostic function that can be called from the console
  window.diagnoseMermaid = function() {
    // console.log('Running Mermaid diagnostic...');
    
    // Log Mermaid version
    if (typeof mermaid !== 'undefined') {
      // console.log(`Mermaid version: ${mermaid.version}`);
    } else {
      console.error('Mermaid library not loaded!');
      return false;
    }
    
    // Run the debug function
    const result = debugMermaidDiagrams();
    
    // Force a re-rendering attempt
    // console.log('Attempting to reprocess all diagrams...');
    processMermaidDiagrams();
    
    // Additional rendering with direct mermaid.init call
    // console.log('Attempting direct mermaid.init call...');
    try {
      mermaid.init(undefined, document.querySelectorAll('.mermaid:not([data-processed="true"])'));
      // console.log('Direct mermaid.init call completed');
    } catch (err) {
      console.error('Error with direct mermaid.init call:', err);
    }
    
    // Final debug check after processing
    setTimeout(debugMermaidDiagrams, 500);
    return result;
  };

  // Make sure mobile sidebar toggle works
  function setupMobileSidebar() {
    // console.log('Setting up mobile sidebar');
    
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const backdrop = document.getElementById('sidebar-backdrop');
    const sidebar = document.getElementById('mobile-topics-sidebar');
    
    if (toggleBtn && sidebar && backdrop) {
      toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // console.log('Toggle button clicked (direct event)');
        sidebar.classList.add('show');
        backdrop.classList.add('show');
      });
      
      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          // console.log('Close button clicked (direct event)');
          sidebar.classList.remove('show');
          backdrop.classList.remove('show');
        });
      }
      
      backdrop.addEventListener('click', function(e) {
        e.preventDefault();
        // console.log('Backdrop clicked (direct event)');
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
      });
      
      // console.log('Mobile sidebar events set up successfully');
    } else {
      console.error('Mobile sidebar elements not found:', {
        toggleBtn: !!toggleBtn,
        closeBtn: !!closeBtn,
        backdrop: !!backdrop,
        sidebar: !!sidebar
      });
    }
  }

  // Call the setup function after DOM is ready
  setTimeout(setupMobileSidebar, 500);
});
