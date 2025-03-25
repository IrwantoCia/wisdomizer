package controllers

import (
	"encoding/json"
	"net/http"
	"wisdomizer/models"
	"wisdomizer/pkg/logs"
	"wisdomizer/pkg/validation"
	"wisdomizer/pkg/vendors/anthropic"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ChatRequest struct {
	Message  string `json:"message" binding:"required"`
	Topic    string `json:"topic" binding:"required"`
	File     *File  `json:"file,omitempty"`
	ChatUUID string `json:"chat_uuid" binding:"required"`
}

type File struct {
	Name    string `json:"name"`
	Content string `json:"content"`
	Type    string `json:"type"`
}

type ChatResponse struct {
	Message string `json:"message"`
	Topic   string `json:"topic"`
}

func Index(r *gin.Engine) {
	r.GET("/", func(c *gin.Context) {
		// Get all chats
		chat := &models.Chat{}
		chats, err := chat.GetAll()
		if err != nil {
			logs.Logger.Error("Failed to get chats", zap.Error(err))
			c.HTML(http.StatusOK, "index", gin.H{
				"title": "Hubcraft.id",
				"chats": []models.Chat{},
			})
			return
		}

		c.HTML(http.StatusOK, "index", gin.H{
			"title": "Hubcraft.id",
			"chats": chats,
		})
	})

	r.POST("/chat", validation.Validate[ChatRequest](), handleChat)
	r.GET("/chat/:uuid", handleGetChatHistory)
}

func handleChat(c *gin.Context) {
	// Get validated payload from context
	payload, exists := c.Get("payload")
	if !exists {
		logs.Logger.Error("Invalid request payload")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	req := payload.(ChatRequest)

	logs.Logger.Info("Processing chat request",
		zap.String("chat_uuid", req.ChatUUID),
		zap.String("topic", req.Topic),
		zap.Int("message_length", len(req.Message)))

	// Get existing chat
	chat := &models.Chat{}
	chat, err := chat.GetByUUID(req.ChatUUID)
	if err != nil {
		logs.Logger.Error("Failed to get chat",
			zap.Error(err),
			zap.String("chat_uuid", req.ChatUUID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat"})
		return
	}

	logs.Logger.Info("Found existing chat",
		zap.Int("chat_id", chat.ID),
		zap.String("chat_title", chat.Title))

	// Save user message
	message := &models.Message{
		UUID:    uuid.New().String(),
		ChatID:  chat.ID,
		Role:    "user",
		Content: req.Message,
	}

	if err := message.Create(*message); err != nil {
		logs.Logger.Error("Failed to save user message",
			zap.Error(err),
			zap.Int("chat_id", chat.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user message"})
		return
	}

	logs.Logger.Info("Saved user message",
		zap.String("message_uuid", message.UUID),
		zap.Int("chat_id", chat.ID))

	// Handle file if present
	if req.File != nil {
		file := &models.File{
			UUID:        uuid.New().String(),
			ChatID:      chat.ID,
			Name:        req.File.Name,
			Path:        "", // TODO: Save file to disk and store path
			ContentType: req.File.Type,
			Size:        int64(len(req.File.Content)),
		}

		if err := file.Create(*file); err != nil {
			logs.Logger.Error("Failed to save file",
				zap.Error(err),
				zap.Int("chat_id", chat.ID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
			return
		}

		logs.Logger.Info("Saved file",
			zap.String("file_uuid", file.UUID),
			zap.String("file_name", file.Name))
	}

	// Get chat history
	messages, err := chat.GetMessagesByChatID(chat.ID)
	if err != nil {
		logs.Logger.Error("Failed to get chat history",
			zap.Error(err),
			zap.Int("chat_id", chat.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat history"})
		return
	}

	logs.Logger.Info("Retrieved chat history",
		zap.Int("message_count", len(messages)),
		zap.Int("chat_id", chat.ID))

	// Convert messages to Anthropic format
	var anthropicMessages []anthropic.Message
	for _, msg := range messages {
		anthropicMessages = append(anthropicMessages, anthropic.Message{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Prepare options for Anthropic API
	opts := anthropic.Option{
		Messages:    anthropicMessages,
		Stream:      true,
		System:      "You are a helpful AI assistant.",
		MaxTokens:   4096,
		Temperature: 0.7,
	}

	// Set up streaming response
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	// Define callback for streaming chunks
	opts.Callback = func(chunk string) {
		// Log the raw chunk for debugging
		logs.Logger.Debug("Received chunk from Anthropic",
			zap.String("chunk", chunk),
			zap.Int("chat_id", chat.ID))

		// Create a JSON response with the chunk
		response := map[string]interface{}{
			"content": chunk,
		}

		// Marshal the response
		jsonData, err := json.Marshal(response)
		if err != nil {
			logs.Logger.Error("Failed to marshal chunk",
				zap.Error(err),
				zap.Int("chat_id", chat.ID))
			return
		}

		// Write the chunk as a server-sent event
		_, err = c.Writer.Write([]byte("data: " + string(jsonData) + "\n\n"))
		if err != nil {
			logs.Logger.Error("Failed to write chunk",
				zap.Error(err),
				zap.Int("chat_id", chat.ID))
		}
		c.Writer.Flush()
	}

	// Call Anthropic API
	response, err := anthropic.Chat(opts)
	if err != nil {
		logs.Logger.Error("Failed to get response from Anthropic",
			zap.Error(err),
			zap.Any("messages", anthropicMessages),
			zap.Any("opts", opts),
			zap.Int("chat_id", chat.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get response from Anthropic"})
		return
	}

	logs.Logger.Info("Received response from Anthropic",
		zap.Int("chat_id", chat.ID),
		zap.Int("response_length", len(response.Content[0].Text)))

	// Save AI response
	aiMessage := &models.Message{
		UUID:    uuid.New().String(),
		ChatID:  chat.ID,
		Role:    "assistant",
		Content: response.Content[0].Text,
	}

	if err := aiMessage.Create(*aiMessage); err != nil {
		logs.Logger.Error("Failed to save AI response",
			zap.Error(err),
			zap.Int("chat_id", chat.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save AI response"})
		return
	}

	logs.Logger.Info("Saved AI response",
		zap.String("message_uuid", aiMessage.UUID),
		zap.Int("chat_id", chat.ID))

	// Send final response
	c.JSON(http.StatusOK, ChatResponse{
		Message: response.Content[0].Text,
		Topic:   chat.Title,
	})
}

func handleGetChatHistory(c *gin.Context) {
	uuid := c.Param("uuid")
	if uuid == "" {
		logs.Logger.Error("Chat UUID is missing")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Chat UUID is required"})
		return
	}

	logs.Logger.Info("Fetching chat history",
		zap.String("chat_uuid", uuid))

	chat := &models.Chat{}
	chat, err := chat.GetByUUID(uuid)
	if err != nil {
		logs.Logger.Error("Failed to get chat",
			zap.Error(err),
			zap.String("chat_uuid", uuid))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat"})
		return
	}

	logs.Logger.Info("Found chat",
		zap.Int("chat_id", chat.ID),
		zap.String("chat_title", chat.Title),
		zap.String("chat_uuid", chat.UUID))

	messages, err := chat.GetMessagesByChatID(chat.ID)
	if err != nil {
		logs.Logger.Error("Failed to get chat messages",
			zap.Error(err),
			zap.Int("chat_id", chat.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat messages"})
		return
	}

	logs.Logger.Info("Retrieved chat messages",
		zap.Int("message_count", len(messages)),
		zap.Int("chat_id", chat.ID))

	c.JSON(http.StatusOK, gin.H{
		"chat":     chat,
		"messages": messages,
	})
}
