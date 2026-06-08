package ports

type NotificationEvent struct {
    ClienteID     int
    ClienteNome   string
    XpGanhado     int
    XpTotal       int
    NivelNome     string
    SubiuNivelMax bool
}

type NotificationService interface {
    EnqueueNotification(event NotificationEvent)
    StartWorker()
}
