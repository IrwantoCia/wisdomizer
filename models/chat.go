package models

import (
	"fmt"
	"time"
)

type Chat struct {
	ID          int       `json:"id"`
	UUID        string    `json:"uuid"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Message struct {
	ID        int       `json:"id"`
	UUID      string    `json:"uuid"`
	ChatID    int       `json:"chat_id"`
	Role      string    `json:"role"` // user, assistant, system
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type File struct {
	ID          int       `json:"id"`
	UUID        string    `json:"uuid"`
	ChatID      int       `json:"chat_id"`
	Name        string    `json:"name"`
	Path        string    `json:"path"`
	ContentType string    `json:"content_type"`
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"created_at"`
}

type Tool struct {
	ID          int       `json:"id"`
	UUID        string    `json:"uuid"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Schema      string    `json:"schema"`
	CreatedAt   time.Time `json:"created_at"`
}

type ChatTool struct {
	ID        int       `json:"id"`
	ChatID    int       `json:"chat_id"`
	ToolID    int       `json:"tool_id"`
	CreatedAt time.Time `json:"created_at"`
}

type ToolCall struct {
	ID         int       `json:"id"`
	UUID       string    `json:"uuid"`
	MessageID  int       `json:"message_id"`
	ToolID     int       `json:"tool_id"`
	Input      string    `json:"input"`
	Output     string    `json:"output"`
	Status     string    `json:"status"` // pending, completed, failed
	StartedAt  time.Time `json:"started_at"`
	FinishedAt time.Time `json:"finished_at"`
	CreatedAt  time.Time `json:"created_at"`
}

func NewChat() (*Chat, error) {
	_, err := client.Exec(`
	CREATE TABLE IF NOT EXISTS chats (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT UNIQUE,
		title TEXT,
		description TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return nil, fmt.Errorf("failed to create chats table: %v", err)
	}

	_, err = client.Exec(`
	CREATE TABLE IF NOT EXISTS messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT UNIQUE,
		chat_id INTEGER,
		role TEXT NOT NULL,
		content TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
	)`)
	if err != nil {
		return nil, fmt.Errorf("failed to create messages table: %v", err)
	}

	_, err = client.Exec(`
	CREATE TABLE IF NOT EXISTS files (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT UNIQUE,
		chat_id INTEGER,
		name TEXT NOT NULL,
		path TEXT NOT NULL,
		content_type TEXT,
		size INTEGER,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
	)`)
	if err != nil {
		return nil, fmt.Errorf("failed to create files table: %v", err)
	}

	_, err = client.Exec(`
	CREATE TABLE IF NOT EXISTS tools (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT UNIQUE,
		name TEXT NOT NULL,
		description TEXT,
		schema TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return nil, fmt.Errorf("failed to create tools table: %v", err)
	}

	_, err = client.Exec(`
	CREATE TABLE IF NOT EXISTS chat_tools (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		chat_id INTEGER,
		tool_id INTEGER,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(chat_id, tool_id),
		FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
		FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
	)`)
	if err != nil {
		return nil, fmt.Errorf("failed to create chat_tools table: %v", err)
	}

	_, err = client.Exec(`
	CREATE TABLE IF NOT EXISTS tool_calls (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT UNIQUE,
		message_id INTEGER,
		tool_id INTEGER,
		input TEXT,
		output TEXT,
		status TEXT DEFAULT 'pending',
		started_at TIMESTAMP,
		finished_at TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
		FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
	)`)
	if err != nil {
		return nil, fmt.Errorf("failed to create tool_calls table: %v", err)
	}

	return &Chat{}, nil
}

func (c *Chat) Create(chat Chat) error {
	query := `
		INSERT INTO chats (uuid, title, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`

	now := time.Now()
	result, err := client.Exec(
		query,
		chat.UUID,
		chat.Title,
		chat.Description,
		now,
		now,
	)

	if err != nil {
		return fmt.Errorf("failed to create chat: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %v", err)
	}

	chat.ID = int(id)
	return nil
}

func (c *Chat) GetByUUID(uuid string) (*Chat, error) {
	query := `
		SELECT id, uuid, title, description, created_at, updated_at
		FROM chats
		WHERE uuid = ?
	`

	var chat Chat
	err := client.QueryRow(query, uuid).Scan(
		&chat.ID,
		&chat.UUID,
		&chat.Title,
		&chat.Description,
		&chat.CreatedAt,
		&chat.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get chat by UUID: %v", err)
	}

	return &chat, nil
}

func (c *Chat) GetMessagesByChatID(chatID int) ([]Message, error) {
	query := `
		SELECT id, uuid, chat_id, role, content, created_at
		FROM messages
		WHERE chat_id = ?
		ORDER BY created_at ASC
	`

	rows, err := client.Query(query, chatID)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %v", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		err := rows.Scan(
			&msg.ID,
			&msg.UUID,
			&msg.ChatID,
			&msg.Role,
			&msg.Content,
			&msg.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message row: %v", err)
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

func (m *Message) Create(message Message) error {
	query := `
		INSERT INTO messages (uuid, chat_id, role, content, created_at)
		VALUES (?, ?, ?, ?, ?)
	`

	result, err := client.Exec(
		query,
		message.UUID,
		message.ChatID,
		message.Role,
		message.Content,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to create message: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %v", err)
	}

	message.ID = int(id)
	return nil
}

func (f *File) Create(file File) error {
	query := `
		INSERT INTO files (uuid, chat_id, name, path, content_type, size, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	result, err := client.Exec(
		query,
		file.UUID,
		file.ChatID,
		file.Name,
		file.Path,
		file.ContentType,
		file.Size,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %v", err)
	}

	file.ID = int(id)
	return nil
}

func (t *Tool) Create(tool Tool) error {
	query := `
		INSERT INTO tools (uuid, name, description, schema, created_at)
		VALUES (?, ?, ?, ?, ?)
	`

	result, err := client.Exec(
		query,
		tool.UUID,
		tool.Name,
		tool.Description,
		tool.Schema,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to create tool: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %v", err)
	}

	tool.ID = int(id)
	return nil
}

func (ct *ChatTool) AddToolToChat(chatID int, toolID int) error {
	query := `
		INSERT OR IGNORE INTO chat_tools (chat_id, tool_id, created_at)
		VALUES (?, ?, ?)
	`

	_, err := client.Exec(
		query,
		chatID,
		toolID,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to add tool to chat: %v", err)
	}

	return nil
}

func (tc *ToolCall) Create(toolCall ToolCall) error {
	query := `
		INSERT INTO tool_calls (uuid, message_id, tool_id, input, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	result, err := client.Exec(
		query,
		toolCall.UUID,
		toolCall.MessageID,
		toolCall.ToolID,
		toolCall.Input,
		"pending",
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to create tool call: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %v", err)
	}

	toolCall.ID = int(id)
	return nil
}

func (tc *ToolCall) UpdateResult(uuid string, output string, status string) error {
	query := `
		UPDATE tool_calls
		SET output = ?, status = ?, finished_at = ?
		WHERE uuid = ?
	`

	_, err := client.Exec(
		query,
		output,
		status,
		time.Now(),
		uuid,
	)

	if err != nil {
		return fmt.Errorf("failed to update tool call result: %v", err)
	}

	return nil
}

func (c *Chat) GetAll() ([]Chat, error) {
	query := `
		SELECT id, uuid, title, description, created_at, updated_at
		FROM chats
		ORDER BY created_at DESC
	`

	rows, err := client.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all chats: %v", err)
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var chat Chat
		err := rows.Scan(
			&chat.ID,
			&chat.UUID,
			&chat.Title,
			&chat.Description,
			&chat.CreatedAt,
			&chat.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan chat row: %v", err)
		}
		chats = append(chats, chat)
	}

	return chats, nil
}

func (c *Chat) Update() error {
	query := `
		UPDATE chats
		SET title = ?, updated_at = ?
		WHERE uuid = ?
	`

	now := time.Now()
	result, err := client.Exec(
		query,
		c.Title,
		now,
		c.UUID,
	)

	if err != nil {
		return fmt.Errorf("failed to update chat: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no chat found with UUID: %s", c.UUID)
	}

	return nil
}

func (c *Chat) Delete() error {
	query := `
		DELETE FROM chats
		WHERE uuid = ?
	`

	result, err := client.Exec(query, c.UUID)
	if err != nil {
		return fmt.Errorf("failed to delete chat: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no chat found with UUID: %s", c.UUID)
	}

	return nil
}
