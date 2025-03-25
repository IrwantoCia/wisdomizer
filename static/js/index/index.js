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
  
  // State variables
  let currentTopic = "Getting started with Wisdomizer";
  let lastUserMessage = "";
  let uploadedFile = null;
  let isAiResponding = false;
  let currentStreamController = null;
  let currentChatUUID = null;
  let currentTopicLoadingId = null;
  
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
  mobileSidebarToggle.on('click', function() {
    mobileSidebar.addClass('show');
    sidebarBackdrop.addClass('show');
  });
  
  closeSidebarBtn.on('click', function() {
    mobileSidebar.removeClass('show');
    sidebarBackdrop.removeClass('show');
  });
  
  sidebarBackdrop.on('click', function() {
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
    scrollToBottom();
  }
  
  function addAiMessage(message, isComplete = false) {
    console.log('Adding AI message:', { isComplete, messageLength: message?.length });
    
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
          ${isComplete ? `<p>${formatMessage(message)}</p>` : `
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
    scrollToBottom();
    
    // Only add animation delay for incomplete messages
    if (!isComplete) {
      setTimeout(() => {
        const aiMessageBubble = $('.chat-ai').last().find('.chat-bubble');
        aiMessageBubble.html(`<p>${formatMessage(message)}</p>`);
        scrollToBottom();
      }, 500);
    }
    
    console.log('AI message added:', { isComplete, messageLength: message?.length });
  }
  
  function addWelcomeMessage() {
    const messageHtml = `
      <div class="chat chat-start">
        <div class="chat-image avatar">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center">
            <i class="fas fa-robot text-white text-center"></i>
          </div>
        </div>
        <div class="chat-header opacity-70 text-xs">
          Wisdomizer <span class="message-time">Just now</span>
        </div>
        <div class="chat-bubble msg-ai bg-gray-700/70 text-gray-100 shadow-md border border-gray-600/30 backdrop-blur-sm">
          <p>Hello! I'm Wisdomizer, your personal AI assistant. How can I help you today?</p>
        </div>
        <div class="chat-footer opacity-70 text-xs">
          Delivered
        </div>
      </div>
    `;
    
    messagesContainer.append(messageHtml);
    scrollToBottom();
  }
  
  function processUserMessage(message) {
    // Show initial typing indicator
    addAiMessage('', false);
    
    // Prepare API request data
    const requestData = {
      message: message,
      topic: currentTopic,
      chat_uuid: currentChatUUID
    };
    
    // If there's a file, add it to the request
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = function(e) {
        requestData.file = {
          name: uploadedFile.name,
          content: e.target.result.split(',')[1], // Remove the data URL prefix
          type: uploadedFile.type
        };
        sendToApi(requestData);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      // Send without file
      sendToApi(requestData);
    }
  }
  
  function sendToApi(requestData) {
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
    let accumulatedContent = '';
    let currentAiMessage = null;
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(data),
      signal: signal
    })
    .then(response => {
      if (response.status === 403) {
        // Handle authentication issues
        window.location.href = '/auth/signin';
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      // Get a reader to read the response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Process the stream chunks
      function readStream() {
        reader.read().then(({ done, value }) => {
          if (done) {
            // Stream is complete
            if (accumulatedContent) {
              if (currentAiMessage) {
                currentAiMessage.find('.chat-bubble').html(`<p>${formatMessage(accumulatedContent)}</p>`);
                currentAiMessage.find('.chat-footer').text('Delivered');
              } else {
                addAiMessage(accumulatedContent, true);
              }
            } else {
              addAiMessage("Sorry, I couldn't generate a response. Please try again.", true);
            }
            return;
          }
          
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          
          try {
            // Parse the chunk as server-sent events
            const lines = chunk.split('\n');
            
            lines.forEach(line => {
              if (line.trim() === '') return;
              
              if (line.startsWith('data:')) {
                const eventData = line.slice(5).trim();
                try {
                  const parsedData = JSON.parse(eventData);
                  
                  if (parsedData.error) {
                    throw new Error(parsedData.error);
                  }
                  
                  if (parsedData.content === '|DONE|') {
                    // Stream is complete
                    if (currentAiMessage) {
                      currentAiMessage.find('.chat-bubble').html(`<p>${formatMessage(accumulatedContent)}</p>`);
                      currentAiMessage.find('.chat-footer').text('Delivered');
                    } else {
                      addAiMessage(accumulatedContent, true);
                    }
                    return;
                  }
                  
                  // Add the content to our accumulated content
                  accumulatedContent += parsedData.content;
                  
                  // Update the existing AI message or create a new one
                  if (currentAiMessage) {
                    currentAiMessage.find('.chat-bubble').html(`<p>${formatMessage(accumulatedContent)}</p>`);
                  } else {
                    currentAiMessage = $('.chat-ai').last();
                    if (!currentAiMessage.length) {
                      addAiMessage(accumulatedContent, false);
                      currentAiMessage = $('.chat-ai').last();
                    }
                  }
                  
                  scrollToBottom();
                } catch (parseError) {
                  console.error('Error parsing event data:', parseError);
                  // Just treat as plain text if not JSON
                  accumulatedContent += eventData;
                  if (currentAiMessage) {
                    currentAiMessage.find('.chat-bubble').html(`<p>${formatMessage(accumulatedContent)}</p>`);
                  }
                }
              } else if (line.startsWith('error:')) {
                const errorData = line.slice(6).trim();
                try {
                  const parsedError = JSON.parse(errorData);
                  throw new Error(parsedError.message || 'Unknown error occurred');
                } catch (parseError) {
                  throw new Error(errorData || 'Unknown error occurred');
                }
              }
            });
            
            // Continue reading
            readStream();
          } catch (error) {
            console.error('Error processing stream:', error);
            addAiMessage(`Sorry, an error occurred: ${error.message}`, true);
            createNotification(error.message, 'error');
          }
        }).catch(error => {
          // Only handle non-abort errors
          if (error.name !== 'AbortError') {
            console.error('Error reading stream:', error);
            addAiMessage(`Sorry, an error occurred while reading the response: ${error.message}`, true);
            createNotification('Error reading response', 'error');
          }
        });
      }
      
      // Start reading the stream
      readStream();
    })
    .catch(error => {
      // Only handle non-abort errors
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error);
        addAiMessage(`Sorry, there was an error communicating with the server: ${error.message}`, true);
        createNotification('Error communicating with server', 'error');
      }
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
      
      console.log('New chat created and loaded:', { topicTitle: topic.title, topicUUID: topic.uuid });
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
    console.log('Loading topic:', { topicName, topicUUID });
    
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
    console.log('Fetching chat history from:', `/chat/${topicUUID}`);
    return fetch(`/chat/${topicUUID}`)
      .then(response => {
        // If another topic has started loading, abort this one
        if (currentTopicLoadingId !== loadingId) {
          console.log('Aborting topic load - newer load in progress');
          return Promise.reject(new Error('Topic load aborted'));
        }
        
        console.log('Chat history response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to load chat history: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // If another topic has started loading, abort this one
        if (currentTopicLoadingId !== loadingId) {
          console.log('Aborting topic processing - newer load in progress');
          return Promise.reject(new Error('Topic load aborted'));
        }
        
        console.log('Received chat history data:', {
          chat: data.chat,
          messageCount: data.messages?.length || 0
        });
        
        // Clear everything in the messages container
        messagesContainer.empty();
        
        // Add each message from history
        if (data.messages && data.messages.length > 0) {
          console.log('Adding messages to chat:', data.messages.length);
          let processedCount = 0;
          
          // Process messages sequentially with a delay to ensure proper rendering
          const processMessage = (index) => {
            // If another topic has started loading, abort this one
            if (currentTopicLoadingId !== loadingId) {
              console.log('Aborting message processing - newer load in progress');
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
              scrollToBottom();
              
              // Final verification
              setTimeout(() => {
                if (currentTopicLoadingId !== loadingId) return;
                
                const renderedMessages = messagesContainer.find('.chat').length;
                console.log('Final message count verification:', {
                  expected: data.messages.length,
                  rendered: renderedMessages,
                  difference: data.messages.length - renderedMessages,
                  processedCount
                });
              }, 500);
              
              return;
            }
            
            const msg = data.messages[index];
            console.log(`Processing message ${index + 1}/${data.messages.length}:`, { 
              role: msg.role, 
              contentLength: msg.content?.length
            });
            
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
          console.log('No messages found in chat history');
          addWelcomeMessage();
        }
        
        console.log('Chat history loaded successfully');
      })
      .catch(error => {
        // If this is an intentional abort, don't show an error
        if (error.message === 'Topic load aborted') {
          console.log('Topic load was intentionally aborted');
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
    console.log('Deleting topic:', topicUUID);
    
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
      console.log('Delete topic response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to delete topic: ${response.statusText}`);
      }
      return response.json();
    })
    .then(() => {
      console.log('Topic deleted successfully');
      
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
    // Basic formatting - replace newlines with <br>, etc.
    return message
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')  // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>');  // Code
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
});
