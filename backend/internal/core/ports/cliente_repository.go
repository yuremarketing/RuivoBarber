package ports

import (
	"context"
	"time"
	"ruivobarber-api/internal/core/domain"
)

type ClienteRepository interface {
	FindAll(ctx context.Context) ([]domain.Cliente, error)
	FindByID(ctx context.Context, id int) (*domain.Cliente, error)
	FindByLogin(ctx context.Context, login string) (*domain.Cliente, error)
	GetPasswordHashByLogin(ctx context.Context, login string) (string, error)
	Save(ctx context.Context, c *domain.Cliente, hashedSenha string) error
	Update(ctx context.Context, c *domain.Cliente, hashedSenha string) error
	Delete(ctx context.Context, id int) error
	LogAuditoria(ctx context.Context, usuarioID, alvoID int, acao, detalhes string) error
	ConcluirAtendimento(ctx context.Context, agendamentoID int) (*NotificationEvent, error)
	ObterAgendamentoPorID(ctx context.Context, id int) (*domain.Agendamento, error)
	RegistrarFalta(ctx context.Context, agendamentoID int) error
	ResgatarCupom(ctx context.Context, clienteID, nivelID int) (*domain.Cupom, error)
	ValidarCupom(ctx context.Context, codigo string) (*domain.Cupom, error)
	ListarServicos(ctx context.Context) ([]domain.Servico, error)
	BuscarServico(ctx context.Context, id int) (*domain.Servico, error)
	CriarServico(ctx context.Context, s *domain.Servico) (int, error)
	AtualizarServico(ctx context.Context, s *domain.Servico) error
	DeletarServico(ctx context.Context, id int) error
	ListarBarbeiros(ctx context.Context) ([]domain.Barbeiro, error)
	ListarAgendamentos(ctx context.Context, data string) ([]domain.Agendamento, error)
	ListarAgendamentosDoBarbeiro(ctx context.Context, barbeiroID int, data string) ([]domain.Agendamento, error)
	CriarAgendamento(ctx context.Context, clienteID, barbeiroID, servicoID int, dataHora time.Time) (int, error)
	ListarAgendamentosDoCliente(ctx context.Context, clienteID int) ([]domain.Agendamento, error)
	ObterConfiguracoes(ctx context.Context) (*domain.Configuracoes, error)
	SalvarConfiguracoes(ctx context.Context, cfg *domain.Configuracoes) error
	BuscarClientePorTelefone(ctx context.Context, telefone string) (*domain.Cliente, error)
	RegistrarMensagemProcessada(ctx context.Context, messageID string) (bool, error)
	ObterDisponibilidadeBarbeiro(ctx context.Context, barbeiroID int) ([]domain.BarbeiroDisponibilidade, error)
	SalvarDisponibilidadeBarbeiro(ctx context.Context, barbeiroID int, disps []domain.BarbeiroDisponibilidade) error
	ObterBloqueiosBarbeiro(ctx context.Context, barbeiroID int) ([]domain.BarbeiroBloqueio, error)
	AdicionarBloqueioBarbeiro(ctx context.Context, barbeiroID int, data string, horaInicio string, horaFim string, motivo string) error
	RemoverBloqueioBarbeiro(ctx context.Context, barbeiroID int, data string) error
	SalvarChavePixBarbeiro(ctx context.Context, barbeiroID int, chavePix string) error
	CriarGorjeta(ctx context.Context, g *domain.Gorjeta) (int, error)
	ConfirmarPagamentoGorjeta(ctx context.Context, id int) error
	ObterGorjetasDoBarbeiro(ctx context.Context, barbeiroID int) ([]domain.Gorjeta, error)
	ObterUltimoCorteConcluido(ctx context.Context, clienteID int) (*domain.Agendamento, error)
	BuscarAvaliacaoPorAgendamento(ctx context.Context, agendamentoID int) (*domain.Avaliacao, error)
	CriarAvaliacao(ctx context.Context, a *domain.Avaliacao) error
	RecalcularAvaliacaoMediaBarbeiro(ctx context.Context, barbeiroID int) error
	BuscarAgendamentoPorID(ctx context.Context, id int) (*domain.Agendamento, error)
}

