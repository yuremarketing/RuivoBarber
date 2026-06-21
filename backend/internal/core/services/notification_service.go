package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
	"ruivobarber-api/internal/core/ports"
)

type NotificationServiceImpl struct {
	queue chan ports.NotificationEvent
}

func NewNotificationService() *NotificationServiceImpl {
	return &NotificationServiceImpl{
		queue: make(chan ports.NotificationEvent, 100),
	}
}

func (s *NotificationServiceImpl) EnqueueNotification(event ports.NotificationEvent) {
	s.queue <- event
}

func (s *NotificationServiceImpl) StartWorker() {
	go func() {
		log.Println("📱 NotificationWorker assíncrono iniciado com sucesso")
		for event := range s.queue {
			s.processNotification(event)
		}
	}()
}

func (s *NotificationServiceImpl) processNotification(event ports.NotificationEvent) {
	msg := ""
	var err error

	if event.SubiuNivelMax {
		apiKey := os.Getenv("GEMINI_API_KEY")
		if apiKey != "" {
			msg, err = s.chamarGeminiParaParabens(apiKey, event.ClienteNome, event.NivelNome, event.XpGanhado, event.XpTotal)
			if err != nil {
				log.Printf("⚠️ [NotificationWorker] Erro ao chamar Gemini, usando fallback: %v\n", err)
				msg = "" // Force fallback
			}
		}
	}

	// Fallback padrão se não for nível máximo, se não houver chave API ou se a chamada falhar
	if msg == "" {
		if event.SubiuNivelMax {
			msg = fmt.Sprintf(
				"Olá %s! Você ganhou %d XP pelo seu atendimento na RuivoBarber! Seu progresso atual é de %d XP (Nível: %s). Você atingiu a patente máxima de Lenda da Navalha! Deixe-nos uma avaliação no Google Meu Negócio e ganhe mais vantagens no próximo corte: https://g.page/r/ruivobarber/review",
				event.ClienteNome, event.XpGanhado, event.XpTotal, event.NivelNome,
			)
		} else {
			msg = fmt.Sprintf(
				"Olá %s! Você ganhou %d XP pelo seu atendimento na RuivoBarber! Seu progresso atual é de %d XP (Nível: %s).",
				event.ClienteNome, event.XpGanhado, event.XpTotal, event.NivelNome,
			)
		}
	}

	log.Printf("\n📱 [WHATSAPP MOCK] Enviando mensagem para o Cliente ID %d (%s):\n\"%s\"\n", event.ClienteID, event.ClienteNome, msg)
}

func (s *NotificationServiceImpl) chamarGeminiParaParabens(apiKey, clienteNome, nivelNome string, xpGanhado, xpTotal int) (string, error) {
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey

	type GeminiPart struct {
		Text string `json:"text"`
	}
	type GeminiContent struct {
		Parts []GeminiPart `json:"parts"`
	}
	type GeminiInstruction struct {
		Parts []GeminiPart `json:"parts"`
	}
	type GeminiRequest struct {
		Contents          []GeminiContent    `json:"contents"`
		SystemInstruction *GeminiInstruction `json:"systemInstruction,omitempty"`
	}

	prompt := fmt.Sprintf(
		"Gere uma mensagem curta de parabéns para o cliente %s que acaba de subir de nível para a patente lendária %s! Ele ganhou %d XP e agora tem um total de %d XP. A mensagem deve ser curta (máximo de 3 linhas), empolgante, incluir emojis medievais, e ter um link para avaliação no Google Meu Negócio (https://g.page/r/ruivobarber/review).",
		clienteNome, nivelNome, xpGanhado, xpTotal,
	)

	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{{Text: prompt}},
			},
		},
		SystemInstruction: &GeminiInstruction{
			Parts: []GeminiPart{
				{Text: "Você é o assistente virtual RPG da barbearia RuivoBarber. Sua fala deve ser medieval, entusiasmada, cheia de referências de RPG (patente lendária, taverna, tesouro, guerreiro, grande feito) e usar emojis medievais. Você deve parabenizar calorosamente o cliente pela conquista de uma patente lendária."},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var responseObj struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	err = json.Unmarshal(bodyBytes, &responseObj)
	if err != nil {
		return "", err
	}

	if len(responseObj.Candidates) > 0 &&
		len(responseObj.Candidates[0].Content.Parts) > 0 {
		return responseObj.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", errors.New("resposta do Gemini vazia")
}
