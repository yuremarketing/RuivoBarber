package services

import (
    "fmt"
    "log"
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
    
    // Deixando o log bem formatado e legível nos logs do contêiner
    log.Printf("\n📱 [WHATSAPP MOCK] Enviando mensagem para o Cliente ID %d (%s):\n\"%s\"\n", event.ClienteID, event.ClienteNome, msg)
}
