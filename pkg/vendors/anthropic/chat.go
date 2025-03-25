package anthropic

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

const (
	AnthropicAPIURL           = "https://api.anthropic.com/v1/messages"
	AnthropicHeaderAPIKey     = "x-api-key"
	AnthropicHeaderVersion    = "anthropic-version"
	AnthropicVersionSonnet3_7 = "2023-06-01"
)

// Tool represents a function that can be called during the model's generation process
type Tool struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	InputSchema JSONSchema `json:"input_schema"`
}

// JSONSchema represents the schema of a tool's input
type JSONSchema struct {
	Type       string              `json:"type"`
	Properties map[string]Property `json:"properties,omitempty"`
	Required   []string            `json:"required,omitempty"`
}

// Property represents a property in a JSON schema
type Property struct {
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
}

// ToolMessage represents a message regarding tool usage in the conversation
type ToolMessage struct {
	Name    string          `json:"name"`
	Input   json.RawMessage `json:"input"`
	Output  json.RawMessage `json:"output,omitempty"`
	ToolID  string          `json:"tool_id,omitempty"`
	Content []ToolContent   `json:"content,omitempty"`
}

// ToolContent represents content within a tool message
type ToolContent struct {
	Type  string `json:"type"`
	Text  string `json:"text,omitempty"`
	Image string `json:"image,omitempty"`
}

// Message represents a message in the conversation
type Message struct {
	Role    string        `json:"role"`
	Content string        `json:"content,omitempty"`
	ToolUse *ToolMessage  `json:"tool_use,omitempty"`
	Tool    *ToolMessage  `json:"tool,omitempty"`
	Tools   []ToolMessage `json:"tools,omitempty"`
}

// ToolChoice represents the model's tool selection behavior
type ToolChoice struct {
	Type  string      `json:"type,omitempty"`
	Tools interface{} `json:"tools,omitempty"`
}

// ChatRequest represents the request body for the Sonnet 3.7 API
type ChatRequest struct {
	Model       string      `json:"model"`
	Messages    []Message   `json:"messages"`
	System      string      `json:"system,omitempty"`
	MaxTokens   int         `json:"max_tokens,omitempty"`
	Temperature float64     `json:"temperature,omitempty"`
	Stream      bool        `json:"stream,omitempty"`
	Tools       []Tool      `json:"tools,omitempty"`
	ToolChoice  *ToolChoice `json:"tool_choice,omitempty"`
}

type Option struct {
	Callback    func(chunk string) `json:"callback,omitempty"` // only for stream
	Messages    []Message          `json:"messages"`
	MaxTokens   int                `json:"max_tokens,omitempty"`
	Temperature float64            `json:"temperature,omitempty"`
	System      string             `json:"system,omitempty"`
	Tools       []Tool             `json:"tools,omitempty"`
	ToolChoice  *ToolChoice        `json:"tool_choice,omitempty"`
	Stream      bool               `json:"stream,omitempty"`
}

// ContentBlock represents a block of content in the API response
type ContentBlock struct {
	Type  string `json:"type"`
	Text  string `json:"text,omitempty"`
	Index int    `json:"index,omitempty"`
}

// ChatResponse represents the response from the Sonnet 3.7 API
type ChatResponse struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"`
	Role         string         `json:"role"`
	Content      []ContentBlock `json:"content"`
	Model        string         `json:"model"`
	StopReason   string         `json:"stop_reason"`
	StopSequence string         `json:"stop_sequence"`
	Usage        struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
	Error *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Chat makes a request to the Anthropic Sonnet 3.7 API
func Chat(option Option) (*ChatResponse, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")

	req := ChatRequest{
		Model:       "claude-3-7-sonnet-20250219",
		Messages:    option.Messages,
		System:      option.System,
		MaxTokens:   option.MaxTokens,
		Temperature: option.Temperature,
		Tools:       option.Tools,
		ToolChoice:  option.ToolChoice,
		Stream:      option.Stream,
	}

	// Force processComplete mode when tools are provided
	if len(option.Tools) > 0 {
		req.Stream = false

		// If no specific tool choice is provided but tools are, default to "auto"
		if option.ToolChoice == nil {
			req.ToolChoice = &ToolChoice{
				Type: "auto",
			}
		}
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	httpReq, err := http.NewRequest("POST", AnthropicAPIURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set(AnthropicHeaderAPIKey, apiKey)
	httpReq.Header.Set(AnthropicHeaderVersion, AnthropicVersionSonnet3_7)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read error response body: %w", err)
		}
		return nil, fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	if option.Stream {
		return processStream(resp, option)
	} else {
		return processComplete(resp, option)
	}
}

// Delta represents a streaming delta update
type Delta struct {
	Type  string `json:"type"`
	Text  string `json:"text,omitempty"`
	Index int    `json:"index,omitempty"`
}

// StreamEvent represents an event in the stream response
type StreamEvent struct {
	Type    string `json:"type"`
	Message *struct {
		ID      string  `json:"id"`
		Role    string  `json:"role"`
		Content []Delta `json:"content"`
	} `json:"message,omitempty"`
	ID           string  `json:"id,omitempty"`
	Role         string  `json:"role,omitempty"`
	Content      []Delta `json:"content,omitempty"`
	ContentBlock Delta   `json:"delta,omitempty"`
	StopReason   string  `json:"stop_reason,omitempty"`
	StopSequence string  `json:"stop_sequence,omitempty"`
	Usage        *struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage,omitempty"`
}

func processStream(resp *http.Response, option Option) (*ChatResponse, error) {
	reader := bufio.NewReader(resp.Body)
	var fullResponse ChatResponse
	fullResponse.Content = []ContentBlock{}
	fullResponse.Role = "assistant"

	for {
		line, err := reader.ReadBytes('\n')
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading stream: %w", err)
		}

		// Skip empty lines
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		// Check for "data: " prefix and remove it
		if !bytes.HasPrefix(line, []byte("data: ")) {
			continue
		}
		line = bytes.TrimPrefix(line, []byte("data: "))

		// Check for [DONE] message
		if bytes.Equal(line, []byte("[DONE]")) {
			break
		}

		// Parse the JSON event
		var event StreamEvent
		if err := json.Unmarshal(line, &event); err != nil {
			return nil, fmt.Errorf("error parsing stream event: %w", err)
		}

		// Process event based on type
		switch event.Type {
		case "message_start":
			fullResponse.ID = event.ID
			fullResponse.Model = "claude-3-7-sonnet-20250219" // Using the model from request

		case "content_block_start":
			// Initialize a new content block
			block := ContentBlock{
				Type:  event.ContentBlock.Type,
				Index: event.ContentBlock.Index,
			}
			fullResponse.Content = append(fullResponse.Content, block)

		case "content_block_delta":
			// Update the last content block with delta
			if len(fullResponse.Content) > 0 {
				lastIdx := len(fullResponse.Content) - 1
				fullResponse.Content[lastIdx].Text += event.ContentBlock.Text

				// If callback is provided, call it with the new text
				if option.Callback != nil {
					option.Callback(event.ContentBlock.Text)
				}
			}

		case "message_delta":
			// Handle any updates to the message itself

		case "message_stop":
			fullResponse.StopReason = event.StopReason
			fullResponse.StopSequence = event.StopSequence
			if event.Usage != nil {
				fullResponse.Usage.InputTokens = event.Usage.InputTokens
				fullResponse.Usage.OutputTokens = event.Usage.OutputTokens
			}
		}
	}

	return &fullResponse, nil
}

func processComplete(resp *http.Response, option Option) (*ChatResponse, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var apiResp ChatResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response body: %w", err)
	}

	if apiResp.Error != nil {
		return nil, fmt.Errorf("API error: %s - %s", apiResp.Error.Type, apiResp.Error.Message)
	}

	// Handle tool use if present in the response
	if len(apiResp.Content) > 0 {
		for _, block := range apiResp.Content {
			// Process tool calls if found in the content
			if block.Type == "tool_use" {
				var toolMessage ToolMessage
				if err := json.Unmarshal([]byte(block.Text), &toolMessage); err != nil {
					return nil, fmt.Errorf("failed to unmarshal tool message: %w", err)
				}

				// Process the tool call
				output, err := ProcessTool(toolMessage)
				if err != nil {
					return nil, fmt.Errorf("failed to process tool: %w", err)
				}

				// Create a new message with the tool output
				toolResponse := Message{
					Role: "tool",
					Tool: &ToolMessage{
						Name:   toolMessage.Name,
						Input:  toolMessage.Input,
						Output: output,
					},
				}

				// Add the tool response to the messages and make a new API call
				newMessages := append(option.Messages, toolResponse)
				newOption := option
				newOption.Messages = newMessages

				// Recursively call Chat with the updated messages
				return Chat(newOption)
			}
		}
	}

	return &apiResp, nil
}
