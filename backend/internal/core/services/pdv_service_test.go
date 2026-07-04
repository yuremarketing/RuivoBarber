package services
 
import (
	"context"

	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
	"testing"
	"time"
)

type mockPdvRepository struct {
	ports.PdvRepository
	caixaAtivo    *domain.Caixa
	caixas        map[int]*domain.Caixa
	movimentacoes map[int][]domain.MovimentacaoCaixa
	vendas        map[int][]domain.Venda
	nextID        int
}

func newMockPdvRepository() *mockPdvRepository {
	return &mockPdvRepository{
		caixas:        make(map[int]*domain.Caixa),
		movimentacoes: make(map[int][]domain.MovimentacaoCaixa),
		vendas:        make(map[int][]domain.Venda),
		nextID:        1,
	}
}

func (m *mockPdvRepository) AbrirCaixa(ctx context.Context, operadorID int, saldoInicial float64) (int, error) {
	id := m.nextID
	m.nextID++
	c := &domain.Caixa{
		ID:           id,
		OperadorID:   &operadorID,
		SaldoInicial: saldoInicial,
		Status:       "Aberto",
		AbertoEm:     time.Now(),
	}
	m.caixas[id] = c
	m.caixaAtivo = c
	return id, nil
}

func (m *mockPdvRepository) FecharCaixa(ctx context.Context, caixaID int, saldoFinal float64, saldoInformado float64) error {
	c, ok := m.caixas[caixaID]
	if !ok {
		return errors.New("caixa não encontrado")
	}
	c.Status = "Fechado"
	c.SaldoFinal = &saldoFinal
	c.SaldoInformado = &saldoInformado
	now := time.Now()
	c.FechadoEm = &now
	m.caixaAtivo = nil
	return nil
}

func (m *mockPdvRepository) ObterCaixaAtivo(ctx context.Context, operadorID int) (*domain.Caixa, error) {
	return m.caixaAtivo, nil
}

func (m *mockPdvRepository) ObterCaixaPorID(ctx context.Context, caixaID int) (*domain.Caixa, error) {
	c, ok := m.caixas[caixaID]
	if !ok {
		return nil, nil
	}
	return c, nil
}

func (m *mockPdvRepository) AdicionarMovimentacaoCaixa(ctx context.Context, mc *domain.MovimentacaoCaixa) error {
	mc.ID = m.nextID
	m.nextID++
	mc.CriadoEm = time.Now()
	m.movimentacoes[mc.CaixaID] = append(m.movimentacoes[mc.CaixaID], *mc)
	return nil
}

func (m *mockPdvRepository) ObterMovimentacoesCaixa(ctx context.Context, caixaID int) ([]domain.MovimentacaoCaixa, error) {
	return m.movimentacoes[caixaID], nil
}

func (m *mockPdvRepository) AdicionarVenda(ctx context.Context, venda *domain.Venda, itens []domain.VendaItem) error {
	venda.ID = m.nextID
	m.nextID++
	venda.CriadoEm = time.Now()
	m.vendas[venda.CaixaID] = append(m.vendas[venda.CaixaID], *venda)
	return nil
}

func (m *mockPdvRepository) ObterTotalVendasDinheiro(ctx context.Context, caixaID int) (float64, error) {
	var total float64
	for _, v := range m.vendas[caixaID] {
		if v.MetodoPagamento == "Dinheiro" {
			total += v.ValorLiquido
		}
	}
	return total, nil
}

type mockPdvClienteRepository struct {
	ports.ClienteRepository
	clientes     map[int]*domain.Cliente
	agendamentos map[int]*domain.Agendamento
	nextID       int
}

func newMockPdvClienteRepository() *mockPdvClienteRepository {
	r := &mockPdvClienteRepository{
		clientes:     make(map[int]*domain.Cliente),
		agendamentos: make(map[int]*domain.Agendamento),
		nextID:       1,
	}
	r.clientes[1] = &domain.Cliente{ID: 1, Nome: "Barbeiro", Cargo: "Barbeiro"}
	r.clientes[2] = &domain.Cliente{ID: 2, Nome: "Cliente", Cargo: "Cliente"}
	return r
}

func (m *mockPdvClienteRepository) FindByID(ctx context.Context, id int) (*domain.Cliente, error) {
	c, ok := m.clientes[id]
	if !ok {
		return nil, nil
	}
	return c, nil
}

func (m *mockPdvClienteRepository) ObterAgendamentoPorID(ctx context.Context, id int) (*domain.Agendamento, error) {
	a, ok := m.agendamentos[id]
	if !ok {
		return nil, nil
	}
	return a, nil
}

func (m *mockPdvClienteRepository) CriarAgendamento(ctx context.Context, clienteID, barbeiroID, servicoID int, dataHora time.Time) (int, error) {
	id := m.nextID
	m.nextID++
	m.agendamentos[id] = &domain.Agendamento{
		ID:         id,
		ClienteID:  clienteID,
		BarbeiroID: barbeiroID,
		ServicoID:  servicoID,
		Status:     "pending",
		DataHora:   dataHora,
	}
	return id, nil
}

func (m *mockPdvClienteRepository) ConcluirAtendimento(ctx context.Context, agendamentoID int) (*ports.NotificationEvent, error) {
	a, ok := m.agendamentos[agendamentoID]
	if !ok {
		return nil, errors.New("agendamento não encontrado")
	}
	a.Status = "Concluido"
	return &ports.NotificationEvent{
		ClienteID:   a.ClienteID,
		ClienteNome: "Cliente Teste",
		XpGanhado:   10,
	}, nil
}

type mockNotificationService struct {
	ports.NotificationService
	enqueued []ports.NotificationEvent
}

func (m *mockNotificationService) EnqueueNotification(event ports.NotificationEvent) {
	m.enqueued = append(m.enqueued, event)
}

func TestPdvService_AbrirCaixa(t *testing.T) {
	repo := newMockPdvRepository()
	cliRepo := newMockPdvClienteRepository()
	notifier := &mockNotificationService{}
	service := NewPdvService(repo, cliRepo, notifier, nil)

	// Teste 1: Abertura bem sucedida
	c, err := service.AbrirCaixa(context.Background(), 1, 150.00)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if c.SaldoInicial != 150.00 || c.Status != "Aberto" {
		t.Errorf("caixa aberto incorreto: %+v", c)
	}

	// Teste 2: Tentativa de reabrir
	_, err = service.AbrirCaixa(context.Background(), 1, 100.00)
	if err == nil || err.Error() != "já existe um caixa aberto para este operador" {
		t.Errorf("esperava erro de caixa já ativo, obteve: %v", err)
	}

	// Teste 3: Abertura com saldo negativo
	repo.caixaAtivo = nil
	_, err = service.AbrirCaixa(context.Background(), 1, -50.00)
	if err == nil || err.Error() != "o saldo inicial não pode ser negativo" {
		t.Errorf("esperava erro de saldo negativo, obteve: %v", err)
	}
}

func TestPdvService_MovimentarCaixa(t *testing.T) {
	repo := newMockPdvRepository()
	cliRepo := newMockPdvClienteRepository()
	notifier := &mockNotificationService{}
	service := NewPdvService(repo, cliRepo, notifier, nil)

	// Teste 1: Movimentação em caixa fechado
	err := service.MovimentarCaixa(context.Background(), 1, "Entrada", 50.00, "Suprimento")
	if err == nil || err.Error() != "operação não permitida: o caixa está fechado" {
		t.Errorf("esperava erro de caixa fechado, obteve: %v", err)
	}

	// Abrir caixa
	_, _ = service.AbrirCaixa(context.Background(), 1, 100.00)

	// Teste 2: Suprimento válido
	err = service.MovimentarCaixa(context.Background(), 1, "Entrada", 50.00, "Suprimento de moedas")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}

	// Teste 3: Sangria válida
	err = service.MovimentarCaixa(context.Background(), 1, "Saida", 20.00, "Sangria para troco")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}

	// Teste 4: Valor negativo
	err = service.MovimentarCaixa(context.Background(), 1, "Entrada", -10.00, "Invalido")
	if err == nil || err.Error() != "o valor deve ser maior que zero" {
		t.Errorf("esperava erro de valor inválido, obteve: %v", err)
	}

	// Teste 5: Tipo inválido
	err = service.MovimentarCaixa(context.Background(), 1, "Pix", 10.00, "Invalido")
	if err == nil || err.Error() != "tipo de movimentação inválido. Deve ser 'Entrada' ou 'Saida'" {
		t.Errorf("esperava erro de tipo inválido, obteve: %v", err)
	}
}

func TestPdvService_FecharCaixa(t *testing.T) {
	repo := newMockPdvRepository()
	cliRepo := newMockPdvClienteRepository()
	notifier := &mockNotificationService{}
	service := NewPdvService(repo, cliRepo, notifier, nil)

	// Teste 1: Fechar caixa inexistente
	_, err := service.FecharCaixa(context.Background(), 1, 100.00)
	if err == nil || err.Error() != "nenhum caixa aberto encontrado para este operador" {
		t.Errorf("esperava erro de caixa fechado, obteve: %v", err)
	}

	// Abrir e fazer movimentações
	_, _ = service.AbrirCaixa(context.Background(), 1, 100.00) // inicial 100
	_ = service.MovimentarCaixa(context.Background(), 1, "Entrada", 50.00, "Suprimento") // +50
	_ = service.MovimentarCaixa(context.Background(), 1, "Saida", 20.00, "Sangria") // -20
	// Esperado: 100 + 50 - 20 = 130

	// Teste 2: Fechar caixa calculando diferença
	c, err := service.FecharCaixa(context.Background(), 1, 130.00) // informado 130 (diferença zero)
	if err != nil {
		t.Fatalf("erro inesperado ao fechar caixa: %v", err)
	}
	if c.Status != "Fechado" {
		t.Error("esperava caixa status 'Fechado'")
	}
	if *c.SaldoFinal != 130.00 {
		t.Errorf("esperava saldo final 130.00, obteve %f", *c.SaldoFinal)
	}
	if *c.SaldoInformado != 130.00 {
		t.Errorf("esperava saldo informado 130.00, obteve %f", *c.SaldoInformado)
	}
}


func intPtr(v int) *int {
	return &v
}
