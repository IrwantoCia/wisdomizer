package models

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var client *sql.DB

func Init() {
	// Initialize SQLite client
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./wisdomizer.db"
	}

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		log.Fatalf("failed to connect to SQLite: %v", err)
	}

	// Ensure foreign keys are enabled
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		log.Fatalf("failed to enable foreign keys: %v", err)
	}

	client = db
}

