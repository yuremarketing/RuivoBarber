package services

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func SendDiscordAlert(message string) {
	webhookURL := os.Getenv("DISCORD_WEBHOOK_URL")
	if webhookURL == "" {
		return
	}

	payload := map[string]string{
		"content": message,
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("[ALERTS] Falha ao enviar alerta pro Discord: %v", err)
		return
	}
	defer resp.Body.Close()
}
