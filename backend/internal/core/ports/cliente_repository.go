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
	ConcluirAtendimento(agendamentoID int) (*NotificationEvent, error)
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
}

