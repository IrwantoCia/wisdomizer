package anthropic

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// FileTools contains tools for file operations
var FileTools = []Tool{
	{
		Name:        "read_file",
		Description: "Read content from a file",
		InputSchema: JSONSchema{
			Type: "object",
			Properties: map[string]Property{
				"path": {
					Type:        "string",
					Description: "Path to the file to read",
				},
			},
			Required: []string{"path"},
		},
	},
	{
		Name:        "write_file",
		Description: "Write content to a file",
		InputSchema: JSONSchema{
			Type: "object",
			Properties: map[string]Property{
				"path": {
					Type:        "string",
					Description: "Path to the file to write",
				},
				"content": {
					Type:        "string",
					Description: "Content to write to the file",
				},
			},
			Required: []string{"path", "content"},
		},
	},
}

// FileToolInput represents the input for file tools
type FileToolInput struct {
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
}

// FileToolOutput represents the output from file tools
type FileToolOutput struct {
	Success bool   `json:"success"`
	Content string `json:"content,omitempty"`
	Error   string `json:"error,omitempty"`
}

// ProcessTool handles tool execution
func ProcessTool(toolMessage ToolMessage) (json.RawMessage, error) {
	switch toolMessage.Name {
	case "read_file":
		return handleReadFile(toolMessage)
	case "write_file":
		return handleWriteFile(toolMessage)
	default:
		return nil, fmt.Errorf("unknown tool: %s", toolMessage.Name)
	}
}

// handleReadFile processes read_file tool requests
func handleReadFile(toolMessage ToolMessage) (json.RawMessage, error) {
	var input FileToolInput
	if err := json.Unmarshal(toolMessage.Input, &input); err != nil {
		return createErrorOutput(fmt.Sprintf("invalid input: %v", err))
	}

	// Expand tilde in file path if present
	if len(input.Path) > 0 && input.Path[0] == '~' {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return createErrorOutput(fmt.Sprintf("failed to get home directory: %v", err))
		}
		input.Path = filepath.Join(homeDir, input.Path[1:])
	}

	content, err := os.ReadFile(input.Path)
	if err != nil {
		return createErrorOutput(fmt.Sprintf("failed to read file: %v", err))
	}

	output := FileToolOutput{
		Success: true,
		Content: string(content),
	}

	outputBytes, err := json.Marshal(output)
	if err != nil {
		return createErrorOutput(fmt.Sprintf("failed to marshal output: %v", err))
	}

	return outputBytes, nil
}

// handleWriteFile processes write_file tool requests
func handleWriteFile(toolMessage ToolMessage) (json.RawMessage, error) {
	var input FileToolInput
	if err := json.Unmarshal(toolMessage.Input, &input); err != nil {
		return createErrorOutput(fmt.Sprintf("invalid input: %v", err))
	}

	// Expand tilde in file path if present
	if len(input.Path) > 0 && input.Path[0] == '~' {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return createErrorOutput(fmt.Sprintf("failed to get home directory: %v", err))
		}
		input.Path = filepath.Join(homeDir, input.Path[1:])
	}

	// Create parent directories if they don't exist
	dirPath := filepath.Dir(input.Path)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return createErrorOutput(fmt.Sprintf("failed to create directories: %v", err))
	}

	if err := os.WriteFile(input.Path, []byte(input.Content), 0644); err != nil {
		return createErrorOutput(fmt.Sprintf("failed to write file: %v", err))
	}

	output := FileToolOutput{
		Success: true,
	}

	outputBytes, err := json.Marshal(output)
	if err != nil {
		return createErrorOutput(fmt.Sprintf("failed to marshal output: %v", err))
	}

	return outputBytes, nil
}

// createErrorOutput creates a JSON error output
func createErrorOutput(errorMsg string) (json.RawMessage, error) {
	output := FileToolOutput{
		Success: false,
		Error:   errorMsg,
	}

	outputBytes, err := json.Marshal(output)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal error output: %v", err)
	}

	return outputBytes, nil
}

// FileAssistant creates a pre-configured Chat option with file tools enabled
func FileAssistant(messages []Message, system string) Option {
	return Option{
		Messages:    messages,
		System:      system,
		Tools:       FileTools,
		ToolChoice:  &ToolChoice{Type: "auto"},
		MaxTokens:   4096,
		Temperature: 0.7,
		Stream:      false, // Force non-streaming for tools
	}
}