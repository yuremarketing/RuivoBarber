package services

import (
	"strings"
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
	ultimoCorte      *domain.Agendamento
	avaliacao        *domain.Avaliacao
	agendamento      *domain.Agendamento
	avaliacaoSalva   *domain.Avaliacao
	recalculado      bool
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

func (m *mockClienteRepository) ObterUltimoCorteConcluido(clienteID int) (*domain.Agendamento, error) {
	return m.ultimoCorte, nil
}

func (m *mockClienteRepository) BuscarAvaliacaoPorAgendamento(agendamentoID int) (*domain.Avaliacao, error) {
	return m.avaliacao, nil
}

func (m *mockClienteRepository) CriarAvaliacao(a *domain.Avaliacao) error {
	m.avaliacaoSalva = a
	return nil
}

func (m *mockClienteRepository) RecalcularAvaliacaoMediaBarbeiro(barbeiroID int) error {
	m.recalculado = true
	return nil
}

func (m *mockClienteRepository) BuscarAgendamentoPorID(id int) (*domain.Agendamento, error) {
	return m.agendamento, nil
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

func TestAvaliacoes(t *testing.T) {
	repo := &mockClienteRepository{}
	service := NewClienteService(repo, nil, nil)

	// Teste 1: Obter último corte quando não há cortes concluídos
	repo.ultimoCorte = nil
	res, err := service.ObterUltimoCorteComStatusAvaliacao(1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if res != nil {
		t.Errorf("esperava retorno nil, obteve %+v", res)
	}

	// Teste 2: Obter último corte com avaliação pendente
	corte := &domain.Agendamento{
		ID:           12,
		ClienteID:    1,
		BarbeiroID:   2,
		BarbeiroNome: "Vitor Navalha",
		ServicoNome:  "Corte Simples",
		Status:       "Concluido",
	}
	repo.ultimoCorte = corte
	repo.avaliacao = nil

	res, err = service.ObterUltimoCorteComStatusAvaliacao(1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if res == nil {
		t.Fatal("esperava resposta não nula")
	}
	if !res.AvaliacaoPendente {
		t.Error("esperava avaliacao_pendente = true")
	}
	if res.AgendamentoID != 12 {
		t.Errorf("esperava agendamento_id 12, obteve %d", res.AgendamentoID)
	}

	// Teste 3: Obter último corte com avaliação já feita
	repo.avaliacao = &domain.Avaliacao{ID: 1, Nota: 5}
	res, err = service.ObterUltimoCorteComStatusAvaliacao(1)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if res == nil {
		t.Fatal("esperava resposta não nula")
	}
	if res.AvaliacaoPendente {
		t.Error("esperava avaliacao_pendente = false")
	}

	// Teste 4: Salvar avaliação com nota inválida
	err = service.SalvarAvaliacao(12, 1, 6, "Excelente")
	if err == nil || err.Error() != "a nota deve ser entre 1 e 5" {
		t.Errorf("esperava erro de nota inválida, obteve %v", err)
	}

	// Teste 5: Salvar avaliação com agendamento que não pertence ao cliente
	repo.agendamento = &domain.Agendamento{
		ID:         12,
		ClienteID:  99, // Outro cliente
		BarbeiroID: 2,
		Status:     "Concluido",
	}
	err = service.SalvarAvaliacao(12, 1, 5, "Excelente")
	if err == nil || err.Error() != "este agendamento não pertence a você" {
		t.Errorf("esperava erro de propriedade do agendamento, obteve %v", err)
	}

	// Teste 6: Salvar avaliação com sucesso
	repo.agendamento = &domain.Agendamento{
		ID:         12,
		ClienteID:  1,
		BarbeiroID: 2,
		Status:     "Concluido",
	}
	repo.avaliacao = nil
	repo.recalculado = false

	err = service.SalvarAvaliacao(12, 1, 5, "Lendário!")
	if err != nil {
		t.Fatalf("erro inesperado ao salvar avaliação: %v", err)
	}

	if repo.avaliacaoSalva == nil {
		t.Fatal("esperava avaliação salva no repositório")
	}
	if repo.avaliacaoSalva.Nota != 5 || repo.avaliacaoSalva.Comentario != "Lendário!" {
		t.Errorf("valores incorretos na avaliação salva: %+v", repo.avaliacaoSalva)
	}
	if !repo.recalculado {
		t.Error("esperava recálculo da média do barbeiro")
	}
}
