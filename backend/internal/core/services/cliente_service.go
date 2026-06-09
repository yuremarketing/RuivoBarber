package services

import (
	"errors"
	"os"
	"time"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type ClienteService struct {
	repo     ports.ClienteRepository
	notifier ports.NotificationService
}

func NewClienteService(repo ports.ClienteRepository, notifier ports.NotificationService) *ClienteService {
	return &ClienteService{repo: repo, notifier: notifier}
}

func (s *ClienteService) ListarClientes() ([]domain.Cliente, error) {
	return s.repo.FindAll()
}

func (s *ClienteService) BuscarCliente(id int) (*domain.Cliente, error) {
	return s.repo.FindByID(id)
}

func (s *ClienteService) ConcluirAtendimento(agendamentoID int) error {
	event, err := s.repo.ConcluirAtendimento(agendamentoID)
	if err != nil {
		return err
	}
	s.notifier.EnqueueNotification(*event)
	return nil
}

func (s *ClienteService) RegistrarFalta(agendamentoID int) error {
	return s.repo.RegistrarFalta(agendamentoID)
}

func (s *ClienteService) ResgatarCupom(clienteID, nivelID int) (*domain.Cupom, error) {
	return s.repo.ResgatarCupom(clienteID, nivelID)
}

func (s *ClienteService) ValidarCupom(codigo string) (*domain.Cupom, error) {
	return s.repo.ValidarCupom(codigo)
}

func (s *ClienteService) Login(login, senha string) (*domain.Cliente, string, error) {
	cliente, hashedSenha, err := s.repo.FindByLogin(login)
	if err != nil {
		return nil, "", errors.New("usuário ou senha incorretos")
	}

	// Suporta senha direta caso o banco não use hash para dados legados de teste
	err = bcrypt.CompareHashAndPassword([]byte(hashedSenha), []byte(senha))
	if err != nil && hashedSenha != senha {
		return nil, "", errors.New("usuário ou senha incorretos")
	}

	// Criar token JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    cliente.ID,
		"nome":  cliente.Nome,
		"cargo": cliente.Cargo,
		"exp":   time.Now().Add(time.Hour * 72).Unix(),
	})

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "ruivobarber_secret_token"
	}

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, "", err
	}

	return cliente, tokenString, nil
}




