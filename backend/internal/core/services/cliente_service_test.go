package services

import (
	"strings"
	"testing"
	"time"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type mockClienteRepository struct {
	ports.ClienteRepository
	servico          *domain.Servico
	agendamentos     []domain.Agendamento
	disponibilidades []domain.BarbeiroDisponibilidade
	bloqueios        []domain.BarbeiroBloqueio
}

func (m *mockClienteRepository) BuscarServico(id int) (*domain.Servico, error) {
	return m.servico, nil
}

func (m *mockClienteRepository) ListarAgendamentosDoBarbeiro(barbeiroID int, data string) ([]domain.Agendamento, error) {
	return m.agendamentos, nil
}

func (m *mockClienteRepository) ObterDisponibilidadeBarbeiro(barbeiroID int) ([]domain.BarbeiroDisponibilidade, error) {
	return m.disponibilidades, nil
}

func (m *mockClienteRepository) ObterBloqueiosBarbeiro(barbeiroID int) ([]domain.BarbeiroBloqueio, error) {
	return m.bloqueios, nil
}

func (m *mockClienteRepository) ListarBarbeiros() ([]domain.Barbeiro, error) {
	return []domain.Barbeiro{
		{ID: 1, Nome: "Vitor Navalha", ChavePix: "vitor@navalha.com"},
		{ID: 2, Nome: "Thiago Barba", ChavePix: ""},
	}, nil
}

func (m *mockClienteRepository) CriarGorjeta(g *domain.Gorjeta) (int, error) {
	return 100, nil
}

func TestObterAgendaBarbeiro(t *testing.T) {
	// Setup mock repository
	repo := &mockClienteRepository{
		servico: &domain.Servico{
			ID:             1,
			Nome:           "Corte Simples",
			Preco:          35.00,
			DuracaoMinutos: 30,
		},
		disponibilidades: []domain.BarbeiroDisponibilidade{
			{DiaSemana: 0, Trabalha: false}, // Domingo não trabalha
			{DiaSemana: 1, Trabalha: true, HoraInicio: "09:00", HoraFim: "11:00"}, // Segunda trabalha 9-11
			{DiaSemana: 2, Trabalha: true, HoraInicio: "09:00", HoraFim: "19:00"},
		},
		bloqueios: []domain.BarbeiroBloqueio{
			{DataBloqueio: "2032-06-22", Motivo: "Feriado"}, // Terça-feira (verificar dinamicamente abaixo)
		},
	}

	service := NewClienteService(repo, nil, nil)

	// Calcular dinamicamente datas futuras para Domingo (não trabalha), Segunda (trabalha) e Terça (bloqueada)
	// Encontrar uma segunda-feira no futuro (daqui a pelo menos 1 semana)
	importTime := javaTimeInGo()
	_ = importTime
	// Como já importamos time, vamos usar time diretamente
	importTimeLoc, _ := time.LoadLocation("America/Sao_Paulo")
	if importTimeLoc == nil {
		importTimeLoc = time.Local
	}
	futuro := time.Now().In(importTimeLoc).AddDate(0, 0, 7)
	for futuro.Weekday() != time.Monday {
		futuro = futuro.AddDate(0, 0, 1)
	}

	segundaStr := futuro.Format("2006-01-02")
	domingoStr := futuro.AddDate(0, 0, -1).Format("2006-01-02")
	tercaStr := futuro.AddDate(0, 0, 1).Format("2006-01-02")

	// Setar o bloqueio no mock para coincidir com a Terça-feira dinâmica calculada
	repo.bloqueios = []domain.BarbeiroBloqueio{
		{DataBloqueio: tercaStr, Motivo: "Feriado"},
	}

	// Teste 1: Domingo (não trabalha) -> Deve retornar slots vazios
	slots, err := service.ObterAgendaBarbeiro(1, domingoStr, 1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(slots) != 0 {
		t.Errorf("esperava 0 slots para domingo, obteve %d", len(slots))
	}

	// Teste 2: Terça bloqueada -> Deve retornar slots vazios
	slots, err = service.ObterAgendaBarbeiro(1, tercaStr, 1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(slots) != 0 {
		t.Errorf("esperava 0 slots para dia bloqueado, obteve %d", len(slots))
	}

	// Teste 3: Segunda-feira (trabalha das 09:00 às 11:00)
	slots, err = service.ObterAgendaBarbeiro(1, segundaStr, 1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(slots) != 4 {
		t.Errorf("esperava 4 slots, obteve %d", len(slots))
	}

	expectedTimes := []string{"09:00", "09:30", "10:00", "10:30"}
	for i, slot := range slots {
		if slot.Time != expectedTimes[i] {
			t.Errorf("slot %d: esperava horário %s, obteve %s", i, expectedTimes[i], slot.Time)
		}
		if !slot.Available {
			t.Errorf("slot %s deveria estar disponível", slot.Time)
		}
	}
}

// Dummy helper para evitar warnings de compilação
func javaTimeInGo() time.Time {
	return time.Time{}
}

func TestGerarPayloadPix(t *testing.T) {
	payload, err := GerarPayloadPix("vitor@navalha.com", 15.50, "Vitor Navalha", "Sao Paulo")
	if err != nil {
		t.Fatalf("erro inesperado ao gerar payload Pix: %v", err)
	}

	if !strings.HasPrefix(payload, "000201") {
		t.Errorf("esperava prefixo '000201' no payload Pix, obteve %s", payload)
	}

	if !strings.Contains(payload, "vitor@navalha.com") {
		t.Errorf("esperava chave Pix no payload, obteve %s", payload)
	}

	if !strings.Contains(payload, "Vitor Navalha") {
		t.Errorf("esperava nome formatado no payload, obteve %s", payload)
	}

	if len(payload) < 4 {
		t.Fatalf("payload muito curto: %s", payload)
	}
}

func TestCriarGorjeta(t *testing.T) {
	repo := &mockClienteRepository{}
	service := NewClienteService(repo, nil, nil)

	_, err := service.CriarGorjeta(nil, nil, 2, 10.00)
	if err == nil {
		t.Error("esperava erro ao tentar criar gorjeta para barbeiro sem chave Pix cadastrada")
	}

	g, err := service.CriarGorjeta(nil, nil, 1, 20.00)
	if err != nil {
		t.Fatalf("erro inesperado ao criar gorjeta: %v", err)
	}

	if g.ID != 100 {
		t.Errorf("esperava ID 100, obteve %d", g.ID)
	}
	if g.Valor != 20.00 {
		t.Errorf("esperava valor 20.00, obteve %f", g.Valor)
	}
	if g.PixCopiaECola == "" {
		t.Error("esperava payload Pix gerado")
	}
	if g.QrCodeURL == "" {
		t.Error("esperava URL do QR Code gerada")
	}
}
