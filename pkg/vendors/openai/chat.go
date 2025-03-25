package openai

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// tools request
type Tool struct {
	Type     string                 `json:"type"`
	Function ToolFunction           `json:"function"`
	ID       string                 `json:"id,omitempty"`
	Response map[string]interface{} `json:"response,omitempty"`
}

type ToolFunction struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Parameters  ToolParams `json:"parameters"`
}

type ToolParams struct {
	Type       string              `json:"type"`
	Properties map[string]Property `json:"properties"`
	Required   []string            `json:"required,omitempty"`
}

type Property struct {
	Type        string   `json:"type"`
	Description string   `json:"description,omitempty"`
	Enum        []string `json:"enum,omitempty"`
}

// tools request

type Option struct {
	Message     string             `json:"message"`
	System      string             `json:"system"`
	History     []Message          `json:"history"`
	Tools       []Tool             `json:"tools,omitempty"`
	Stream      bool               `json:"stream,omitempty"`
	Callback    func(chunk string) `json:"callback,omitempty"` // only for stream
	Temperature float64            `json:"temperature,omitempty"`
	OutputType  string             `json:"output_type,omitempty"`
	Penalty     float64            `json:"penalty,omitempty"`
}

// Request and Response model
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model            string         `json:"model"`
	Messages         []Message      `json:"messages"`
	Stream           bool           `json:"stream"`
	Tools            []Tool         `json:"tools,omitempty"`
	Temperature      float64        `json:"temperature,omitempty"`
	ResponseFormat   ResponseFormat `json:"response_format,omitempty"`
	Seed             int64          `json:"seed,omitempty"`
	FrequencyPenalty float64        `json:"frequency_penalty,omitempty"`
}

type ResponseFormat struct {
	Type string `json:"type,omitempty"`
}

type ChatResponse struct {
	Choices []struct {
		Message Message `json:"message,omitempty"`
		Delta   Delta   `json:"delta,omitempty"`
	} `json:"choices"`
}

type ToolResponse struct {
	Choices []struct {
		Message ToolMessage `json:"message,omitempty"`
	} `json:"choices"`
}

func (tr *ToolResponse) JSON() string {
	type output struct {
		Name string `json:"name"`
		Args string `json:"args"`
	}

	o := output{
		Name: tr.Choices[0].Message.ToolCalls[0].Function.Name,
		Args: tr.Choices[0].Message.ToolCalls[0].Function.Arguments,
	}

	s, _ := json.Marshal(o)
	return string(s)
}

type ToolMessage struct {
	ToolCalls []ToolCall `json:"tool_calls"`
}

type ToolCall struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"`
	Function Function `json:"function"`
}

type Function struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type Delta struct {
	Content string `json:"content"`
}

// Request and Response model

func Chat(option Option) (*Message, error) {
	url := "https://api.openai.com/v1/chat/completions"
	apiKey := os.Getenv("OPENAI_API_KEY")

	messages := []Message{
		{
			Role:    "system",
			Content: option.System,
		},
	}

	if len(option.History) > 0 {
		messages = append(messages, option.History...)
	}

	messages = append(messages, Message{
		Role:    "user",
		Content: option.Message,
	})

	// default temperature is 0.7 and the lowest is 0.1
	temperature := 0.7
	if option.Temperature > 0 {
		temperature = option.Temperature
	}

	penalty := 0.0
	if option.Penalty > 0 {
		penalty = option.Penalty
	}

	seed := time.Now().Unix()

	requestBody := ChatRequest{
		Model:            "gpt-4o-mini",
		Messages:         messages,
		Stream:           option.Stream,
		Tools:            option.Tools,
		Temperature:      temperature,
		ResponseFormat:   ResponseFormat{Type: option.OutputType},
		Seed:             seed,
		FrequencyPenalty: penalty,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var content string

	if !option.Stream {
		content, _ = processComplete(resp, option)
	} else {

		content, _ = processStream(resp, option)
	}

	return &Message{
		Role:    "assistant",
		Content: content,
	}, nil
}

func processStream(resp *http.Response, option Option) (string, error) {
	reader := bufio.NewReader(resp.Body)
	content := ""

	for {
		line, err := reader.ReadString('\n')
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}

		if len(line) > 6 {
			var chatResponse ChatResponse
			line = line[6:]
			err = json.Unmarshal([]byte(line), &chatResponse)
			if err != nil {
				continue
			}

			if len(chatResponse.Choices) > 0 {
				chunk := chatResponse.Choices[0].Delta.Content
				content += chunk
				if option.Callback != nil {
					option.Callback(chunk)
				}
			}
		}
	}
	return content, nil
}

func processComplete(resp *http.Response, option Option) (string, error) {
	content := ""
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var chatResponse ChatResponse
	var toolResponse ToolResponse

	// handle either tool or chat based on tools provided or not
	if len(option.Tools) > 0 {
		err = json.Unmarshal(body, &toolResponse)
		if err != nil {
			return "", err
		}
		content = toolResponse.JSON()
	} else {
		err = json.Unmarshal(body, &chatResponse)
		if err != nil {
			return "", err
		}
		fmt.Println(string(body))
		content = chatResponse.Choices[0].Message.Content
	}

	return content, nil
}
