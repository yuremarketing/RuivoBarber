package services

import (
	"testing"
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
			{DataBloqueio: "2026-06-23", Motivo: "Feriado"}, // Terça 2026-06-23 está bloqueada
		},
	}

	service := NewClienteService(repo, nil, nil)

	// Teste 1: Domingo (não trabalha) -> Deve retornar slots vazios
	// 2026-06-21 é um Domingo
	slots, err := service.ObterAgendaBarbeiro(1, "2026-06-21", 1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(slots) != 0 {
		t.Errorf("esperava 0 slots para domingo, obteve %d", len(slots))
	}

	// Teste 2: Terça bloqueada -> Deve retornar slots vazios
	slots, err = service.ObterAgendaBarbeiro(1, "2026-06-23", 1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(slots) != 0 {
		t.Errorf("esperava 0 slots para dia bloqueado, obteve %d", len(slots))
	}

	// Teste 3: Segunda-feira (trabalha das 09:00 às 11:00)
	// 2026-06-22 é uma Segunda-feira. Duração é 30m.
	// Slots gerados de 09:00 a 11:00:
	// Slot 1: 09:00 (término 09:30)
	// Slot 2: 09:30 (término 10:00)
	// Slot 3: 10:00 (término 10:30)
	// Slot 4: 10:30 (término 11:00)
	slots, err = service.ObterAgendaBarbeiro(1, "2026-06-22", 1)
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
