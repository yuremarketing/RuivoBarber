package ports

import (
	"time"
	"ruivobarber-api/internal/core/domain"
)

type ClienteRepository interface {
	FindAll() ([]domain.Cliente, error)
	FindByID(id int) (*domain.Cliente, error)
	FindByLogin(login string) (*domain.Cliente, error)
	GetPasswordHashByLogin(login string) (string, error)
	Save(c *domain.Cliente, hashedSenha string) error
	Update(c *domain.Cliente, hashedSenha string) error
	Delete(id int) error
	ConcluirAtendimento(agendamentoID int) (*NotificationEvent, error)
	ObterAgendamentoPorID(id int) (*domain.Agendamento, error)
	RegistrarFalta(agendamentoID int) error
	ResgatarCupom(clienteID, nivelID int) (*domain.Cupom, error)
	ValidarCupom(codigo string) (*domain.Cupom, error)
	ListarServicos() ([]domain.Servico, error)
	BuscarServico(id int) (*domain.Servico, error)
	CriarServico(s *domain.Servico) (int, error)
	AtualizarServico(s *domain.Servico) error
	DeletarServico(id int) error
	ListarBarbeiros() ([]domain.Barbeiro, error)
	ListarAgendamentos(data string) ([]domain.Agendamento, error)
	ListarAgendamentosDoBarbeiro(barbeiroID int, data string) ([]domain.Agendamento, error)
	CriarAgendamento(clienteID, barbeiroID, servicoID int, dataHora time.Time) (int, error)
	ListarAgendamentosDoCliente(clienteID int) ([]domain.Agendamento, error)
	ObterConfiguracoes() (*domain.Configuracoes, error)
	SalvarConfiguracoes(cfg *domain.Configuracoes) error
	BuscarClientePorTelefone(telefone string) (*domain.Cliente, error)
	RegistrarMensagemProcessada(messageID string) (bool, error)
	ObterDisponibilidadeBarbeiro(barbeiroID int) ([]domain.BarbeiroDisponibilidade, error)
	SalvarDisponibilidadeBarbeiro(barbeiroID int, disps []domain.BarbeiroDisponibilidade) error
	ObterBloqueiosBarbeiro(barbeiroID int) ([]domain.BarbeiroBloqueio, error)
	AdicionarBloqueioBarbeiro(barbeiroID int, data string, horaInicio string, horaFim string, motivo string) error
	RemoverBloqueioBarbeiro(barbeiroID int, data string) error
	SalvarChavePixBarbeiro(barbeiroID int, chavePix string) error
	CriarGorjeta(g *domain.Gorjeta) (int, error)
	ConfirmarPagamentoGorjeta(id int) error
	ObterGorjetasDoBarbeiro(barbeiroID int) ([]domain.Gorjeta, error)
	ObterUltimoCorteConcluido(clienteID int) (*domain.Agendamento, error)
	BuscarAvaliacaoPorAgendamento(agendamentoID int) (*domain.Avaliacao, error)
	CriarAvaliacao(a *domain.Avaliacao) error
	RecalcularAvaliacaoMediaBarbeiro(barbeiroID int) error
	BuscarAgendamentoPorID(id int) (*domain.Agendamento, error)
}

