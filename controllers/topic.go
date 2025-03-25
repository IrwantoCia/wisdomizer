package controllers

import (
	"net/http"
	"wisdomizer/models"
	"wisdomizer/pkg/logs"
	"wisdomizer/pkg/validation"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type CreateTopicRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description,omitempty"`
}

type UpdateTopicRequest struct {
	Title string `json:"title" binding:"required"`
}

type TopicResponse struct {
	ID          int    `json:"id"`
	UUID        string `json:"uuid"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

func Topic(r *gin.Engine) {
	r.POST("/topics", validation.Validate[CreateTopicRequest](), handleCreateTopic)
	r.PUT("/topics/:uuid", validation.Validate[UpdateTopicRequest](), handleUpdateTopic)
	r.DELETE("/topics/:uuid", handleDeleteTopic)
}

func handleCreateTopic(c *gin.Context) {
	// Get validated payload from context
	payload, exists := c.Get("payload")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	req := payload.(CreateTopicRequest)

	// Get or create chat
	chat, err := models.NewChat()
	if err != nil {
		logs.Logger.Error("Failed to initialize chat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize chat"})
		return
	}

	// Create new chat with topic information
	chat.UUID = uuid.New().String()
	chat.Title = req.Title
	chat.Description = req.Description

	if err := chat.Create(*chat); err != nil {
		logs.Logger.Error("Failed to create chat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat"})
		return
	}

	// Get the created chat to ensure we have the correct ID
	createdChat, err := chat.GetByUUID(chat.UUID)
	if err != nil {
		logs.Logger.Error("Failed to get created chat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get created chat"})
		return
	}

	// Return the created topic
	c.JSON(http.StatusCreated, TopicResponse{
		ID:          createdChat.ID,
		UUID:        createdChat.UUID,
		Title:       createdChat.Title,
		Description: createdChat.Description,
	})
}

func handleUpdateTopic(c *gin.Context) {
	// Get validated payload from context
	payload, exists := c.Get("payload")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	req := payload.(UpdateTopicRequest)

	// Get chat by UUID
	chat := &models.Chat{}
	existingChat, err := chat.GetByUUID(c.Param("uuid"))
	if err != nil {
		logs.Logger.Error("Failed to get chat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Topic not found"})
		return
	}

	// Update chat title
	existingChat.Title = req.Title
	if err := existingChat.Update(); err != nil {
		logs.Logger.Error("Failed to update chat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update topic"})
		return
	}

	// Return the updated topic
	c.JSON(http.StatusOK, TopicResponse{
		ID:          existingChat.ID,
		UUID:        existingChat.UUID,
		Title:       existingChat.Title,
		Description: existingChat.Description,
	})
}

func handleDeleteTopic(c *gin.Context) {
	// Get chat by UUID
	chat := &models.Chat{}
	existingChat, err := chat.GetByUUID(c.Param("uuid"))
	if err != nil {
		logs.Logger.Error("Failed to get chat", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Topic not found"})
		return
	}

	// Delete chat
	if err := existingChat.Delete(); err != nil {
		logs.Logger.Error("Failed to delete chat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete topic"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Topic deleted successfully"})
}
