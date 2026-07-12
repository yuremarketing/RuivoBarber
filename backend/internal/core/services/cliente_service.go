package services

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"

	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
	"ruivobarber-api/internal/pkg/contextutils"
)

type ClienteService struct {
	repo          ports.ClienteRepository
	notifier      ports.NotificationService
	temporadaRepo ports.TemporadaRepository
}

func NewClienteService(repo ports.ClienteRepository, notifier ports.NotificationService, temporadaRepo ports.TemporadaRepository) *ClienteService {
	return &ClienteService{repo: repo, notifier: notifier, temporadaRepo: temporadaRepo}
}

func getSaoPauloLocation() *time.Location {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		return time.FixedZone("America/Sao_Paulo", -3*60*60)
	}
	return loc
}


func (s *ClienteService) AceitarLGPD(id int) error {
	cliente, err := s.repo.FindByID(context.Background(), id)
	if err != nil {
		return err
	}
	cliente.LgpdAceito = true
	now := time.Now().Format(time.RFC3339)
	cliente.LgpdAceitoEm = &now
	return s.repo.Update(context.Background(), cliente, "")
}

func (s *ClienteService) EsquecerCliente(id int) error {
	return s.repo.Delete(context.Background(), id)
}

func (s *ClienteService) RegistrarAuditoria(usuarioID, alvoID int, acao, detalhes string) error {
	return s.repo.LogAuditoria(context.Background(), usuarioID, alvoID, acao, detalhes)
}

func (s *ClienteService) ListarClientes() ([]domain.Cliente, error) {
	return s.repo.FindAll(context.Background())
}

func (s *ClienteService) ObterHallOfFame() ([]domain.Cliente, error) {
	clientes, err := s.repo.FindAll(context.Background())
	if err != nil {
		return nil, err
	}
	sort.Slice(clientes, func(i, j int) bool {
		return clientes[i].XP > clientes[j].XP
	})
	return clientes, nil
}

func (s *ClienteService) BuscarCliente(id int) (*domain.Cliente, error) {
	return s.repo.FindByID(context.Background(), id)
}

func (s *ClienteService) ConcluirAtendimento(agendamentoID int) error {
	event, err := s.repo.ConcluirAtendimento(context.Background(), agendamentoID)
	if err != nil {
		return err
	}
	s.notifier.EnqueueNotification(*event)
	return nil
}

func (s *ClienteService) RegistrarFalta(agendamentoID int) error {
	return s.repo.RegistrarFalta(context.Background(), agendamentoID)
}

func (s *ClienteService) ResgatarCupom(clienteID, nivelID int) (*domain.Cupom, error) {
	return s.repo.ResgatarCupom(context.Background(), clienteID, nivelID)
}

func (s *ClienteService) ValidarCupom(codigo string) (*domain.Cupom, error) {
	return s.repo.ValidarCupom(context.Background(), codigo)
}

func (s *ClienteService) Login(login, senha string) (*domain.Cliente, string, error) {
	hashedSenha, err := s.repo.GetPasswordHashByLogin(context.Background(), login)
	if err != nil {
		return nil, "", errors.New("usuário ou senha incorretos")
	}

	cliente, err := s.repo.FindByLogin(context.Background(), login)
	if err != nil {
		return nil, "", errors.New("usuário ou senha incorretos")
	}

	// Suporta senha direta caso o banco não use hash para dados legados de teste (desativado em produção)
	err = bcrypt.CompareHashAndPassword([]byte(hashedSenha), []byte(senha))
	if err != nil {
		if os.Getenv("APP_ENV") == "production" || hashedSenha != senha {
			return nil, "", errors.New("usuário ou senha incorretos")
		}
	}

	// Criar token JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":        cliente.ID,
		"nome":      cliente.Nome,
		"cargo":     cliente.Cargo,
		"tenant_id": "00000000-0000-0000-0000-000000000000",
		"exp":       time.Now().Add(time.Hour * 72).Unix(),
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

func (s *ClienteService) CadastrarCliente(cliente *domain.Cliente, password string) error {
	// [RC-1 Hotfix] Injetando Master Tenant ID para viabilizar cadastro público multi-tenant
	ctx := context.WithValue(context.Background(), contextutils.TenantIDKey, "00000000-0000-0000-0000-000000000001")

	_, err := s.repo.FindByLogin(ctx, cliente.Login)
	if err == nil {
		return errors.New("login já cadastrado no sistema")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if cliente.Cargo != "Adm" && cliente.Cargo != "Barbeiro" && cliente.Cargo != "Cliente" {
		cliente.Cargo = "Cliente"
	}
	return s.repo.Save(ctx, cliente,  string(hashedBytes))
}

func (s *ClienteService) AtualizarPerfil(id int, nome, login, senha, avatarUrl, telefone string, whatsappConsent bool, cargo string) error {
	if login != "" {
		cExistente, err := s.repo.FindByLogin(context.Background(), login)
		if err == nil && cExistente.ID != id {
			return errors.New("login já cadastrado no sistema")
		}
	}

	cliente, err := s.repo.FindByID(context.Background(), id)
	if err != nil {
		return err
	}

	if nome != "" {
		cliente.Nome = nome
	}
	if login != "" {
		cliente.Login = login
	}
	if cargo == "Adm" || cargo == "Barbeiro" || cargo == "Cliente" {
		cliente.Cargo = cargo
	}
	if avatarUrl != "" {
		cliente.AvatarURL = avatarUrl
	}
	
	cliente.WhatsappConsent = whatsappConsent
	if !whatsappConsent {
		cliente.Telefone = "" // Apagar telefone se revogar consentimento (LGPD)
	} else {
		cliente.Telefone = telefone
	}

	var hashedSenha string
	if senha != "" {
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		hashedSenha = string(hashedBytes)
	}

	return s.repo.Update(context.Background(), cliente, hashedSenha)
}
func (s *ClienteService) DeletarCliente(id int) error {
	return s.repo.Delete(context.Background(), id)
}
func (s *ClienteService) ListarServicos() ([]domain.Servico, error) {
	return s.repo.ListarServicos(context.Background())
}

func (s *ClienteService) ListarBarbeiros() ([]domain.Barbeiro, error) {
	return s.repo.ListarBarbeiros(context.Background())
}

func (s *ClienteService) ListarAgendamentos(data string) ([]domain.Agendamento, error) {
	return s.repo.ListarAgendamentos(context.Background(), data)
}

func (s *ClienteService) ListarAgendamentosDoBarbeiro(barbeiroID int, data string) ([]domain.Agendamento, error) {
	return s.repo.ListarAgendamentosDoBarbeiro(context.Background(), barbeiroID, data)
}

func (s *ClienteService) ListarAgendamentosDoCliente(clienteID int) ([]domain.Agendamento, error) {
	return s.repo.ListarAgendamentosDoCliente(context.Background(), clienteID)
}

func (s *ClienteService) ObterDisponibilidadeBarbeiro(barbeiroID int) ([]domain.BarbeiroDisponibilidade, error) {
	return s.repo.ObterDisponibilidadeBarbeiro(context.Background(), barbeiroID)
}

func (s *ClienteService) SalvarDisponibilidadeBarbeiro(barbeiroID int, disps []domain.BarbeiroDisponibilidade) error {
	return s.repo.SalvarDisponibilidadeBarbeiro(context.Background(), barbeiroID, disps)
}

func (s *ClienteService) ObterBloqueiosBarbeiro(barbeiroID int) ([]domain.BarbeiroBloqueio, error) {
	return s.repo.ObterBloqueiosBarbeiro(context.Background(), barbeiroID)
}

func (s *ClienteService) AdicionarBloqueioBarbeiro(barbeiroID int, data string, horaInicio string, horaFim string, motivo string) error {
	if (horaInicio != "" && horaFim == "") || (horaInicio == "" && horaFim != "") {
		return errors.New("ambos os horários de início e término devem ser preenchidos para um bloqueio parcial")
	}

	if horaInicio != "" && horaFim != "" {
		// Validar formato e ordenação
		tInicio, err1 := time.Parse("15:04", horaInicio)
		tFim, err2 := time.Parse("15:04", horaFim)
		if err1 != nil || err2 != nil {
			return errors.New("formato de hora inválido. Use HH:MM")
		}
		if !tInicio.Before(tFim) {
			return errors.New("horário de início deve ser anterior ao horário de término")
		}
	}

	return s.repo.AdicionarBloqueioBarbeiro(context.Background(), barbeiroID, data, horaInicio, horaFim, motivo)
}

func (s *ClienteService) RemoverBloqueioBarbeiro(barbeiroID int, data string) error {
	return s.repo.RemoverBloqueioBarbeiro(context.Background(), barbeiroID, data)
}

func (s *ClienteService) CriarAgendamento(clienteID, barbeiroID, servicoID int, dataHora time.Time) (int, error) {
	saoPaulo := getSaoPauloLocation()
	dataHora = dataHora.In(saoPaulo)

	// Validação de horário retroativo
	if dataHora.Before(time.Now().In(saoPaulo)) {
		return 0, errors.New("não é possível criar um agendamento em horário retroativo")
	}

	return s.repo.CriarAgendamento(context.Background(), clienteID, barbeiroID, servicoID, dataHora)
}

func (s *ClienteService) ObterAgendaBarbeiro(barbeiroID int, dataStr string, servicoID int) ([]domain.AgendaSlot, error) {
	// 1. Fetch service to get its duration
	duracao := 30
	if servicoID > 0 {
		servico, err := s.repo.BuscarServico(context.Background(), servicoID)
		if err == nil && servico != nil {
			duracao = servico.DuracaoMinutos
		}
	}

	// 2. Parse the date in Sao Paulo location
	saoPaulo := getSaoPauloLocation()
	parsedDate, err := time.ParseInLocation("2006-01-02", dataStr, saoPaulo)
	if err != nil {
		return nil, errors.New("formato de data inválido. Use YYYY-MM-DD")
	}

	// 3. Verificar bloqueios pontuais
	dateStr := parsedDate.Format("2006-01-02")
	bloqueios, err := s.repo.ObterBloqueiosBarbeiro(context.Background(), barbeiroID)
	var diaBloqueadoTotalmente bool
	var bloqueiosParciais []domain.BarbeiroBloqueio

	if err == nil {
		for _, b := range bloqueios {
			if b.DataBloqueio == dateStr {
				if b.HoraInicio == nil || *b.HoraInicio == "" || b.HoraFim == nil || *b.HoraFim == "" {
					diaBloqueadoTotalmente = true
					break
				} else {
					bloqueiosParciais = append(bloqueiosParciais, b)
				}
			}
		}
	}

	if diaBloqueadoTotalmente {
		return []domain.AgendaSlot{}, nil
	}

	// 4. Verificar disponibilidade semanal
	weekday := int(parsedDate.Weekday())
	disps, err := s.repo.ObterDisponibilidadeBarbeiro(context.Background(), barbeiroID)
	if err != nil {
		return nil, err
	}

	var disp *domain.BarbeiroDisponibilidade
	for i := range disps {
		if disps[i].DiaSemana == weekday {
			disp = &disps[i]
			break
		}
	}

	if disp == nil || !disp.Trabalha {
		// Não trabalha neste dia da semana
		return []domain.AgendaSlot{}, nil
	}

	// 5. Fetch existing appointments
	agendamentos, err := s.repo.ListarAgendamentosDoBarbeiro(context.Background(), barbeiroID, dateStr)
	if err != nil {
		return nil, err
	}

	// 6. Define work hours
	startHourStr := disp.HoraInicio
	if startHourStr == "" {
		startHourStr = "09:00"
	}
	endHourStr := disp.HoraFim
	if endHourStr == "" {
		endHourStr = "19:00"
	}

	var startHour, startMin, endHour, endMin int
	fmt.Sscanf(startHourStr, "%d:%d", &startHour, &startMin)
	fmt.Sscanf(endHourStr, "%d:%d", &endHour, &endMin)

	workStart := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), startHour, startMin, 0, 0, saoPaulo)
	workEnd := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), endHour, endMin, 0, 0, saoPaulo)

	var slots []domain.AgendaSlot
	now := time.Now().In(saoPaulo)

	// Generate 30-minute interval slots
	for currentSlot := workStart; currentSlot.Before(workEnd); currentSlot = currentSlot.Add(30 * time.Minute) {
		slotEnd := currentSlot.Add(time.Duration(duracao) * time.Minute)
		
		available := true
		// Check if it's in the past
		if currentSlot.Before(now) {
			available = false
		} else if slotEnd.After(workEnd) {
			// Check if it exceeds the working hours
			available = false
		} else {
			// Check conflict with partial blockings
			for _, pb := range bloqueiosParciais {
				var bhStart, bhMinStart, bhEnd, bhMinEnd int
				fmt.Sscanf(*pb.HoraInicio, "%d:%d", &bhStart, &bhMinStart)
				fmt.Sscanf(*pb.HoraFim, "%d:%d", &bhEnd, &bhMinEnd)
				
				blockStart := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), bhStart, bhMinStart, 0, 0, saoPaulo)
				blockEnd := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), bhEnd, bhMinEnd, 0, 0, saoPaulo)
				
				if currentSlot.Before(blockEnd) && slotEnd.After(blockStart) {
					available = false
					break
				}
			}

			if available {
				// Check conflict with existing appointments using formula:
				// newStart < existingEnd AND newEnd > existingStart
				for _, existing := range agendamentos {
					existingStart := existing.DataHora.In(saoPaulo)
					existingEnd := existingStart.Add(time.Duration(existing.DuracaoMinutos) * time.Minute)
					if currentSlot.Before(existingEnd) && slotEnd.After(existingStart) {
						available = false
						break
					}
				}
			}
		}

		slots = append(slots, domain.AgendaSlot{
			Time:      currentSlot.Format("15:04"),
			Available: available,
		})
	}

	return slots, nil
}

// Structs auxiliares para chamadas ao Gemini
type GeminiPart struct {
	Text             string                  `json:"text,omitempty"`
	FunctionCall     *GeminiFunctionCall     `json:"functionCall,omitempty"`
	FunctionResponse *GeminiFunctionResponse `json:"functionResponse,omitempty"`
}

type GeminiFunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type GeminiFunctionResponse struct {
	Name     string                 `json:"name"`
	Response map[string]interface{} `json:"response"`
}

type GeminiContent struct {
	Role  string       `json:"role"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiTool struct {
	FunctionDeclarations []GeminiFunctionDeclaration `json:"functionDeclarations"`
}

type GeminiFunctionDeclaration struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Parameters  *GeminiParameters `json:"parameters,omitempty"`
}

type GeminiParameters struct {
	Type       string                     `json:"type"`
	Properties map[string]GeminiProperty  `json:"properties"`
	Required   []string                   `json:"required,omitempty"`
}

type GeminiProperty struct {
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
}

type GeminiRequest struct {
	Contents          []GeminiContent    `json:"contents"`
	Tools             []GeminiTool       `json:"tools,omitempty"`
	SystemInstruction *GeminiInstruction `json:"systemInstruction,omitempty"`
}

type GeminiInstruction struct {
	Parts []GeminiPart `json:"parts"`
}

func (s *ClienteService) ProcessarChatStream(clienteID int, clienteNome string, userMsg string, history []GeminiContent, writeChunk func(string)) error {
	apiKey := os.Getenv("GEMINI_API_KEY")

	// Se não houver chave API, entra no Simulador Inteligente Local
	if apiKey == "" {
		return s.simularChat(clienteID, clienteNome, userMsg, writeChunk)
	}

	// Chamar o Gemini Real
	return s.chamarGeminiReal(apiKey, clienteID, clienteNome, userMsg, history, writeChunk)
}

func (s *ClienteService) simularChat(clienteID int, clienteNome string, userMsg string, writeChunk func(string)) error {
	msgLower := userMsg
	// Converter para minúsculas para facilidade de matching
	var responseText string

	// Lógica de simulação de intenções
	if containsAny(msgLower, "serviço", "servicos", "preço", "preco", "valor", "valores", "menu") {
		servicos, err := s.ListarServicos()
		if err != nil {
			responseText = "Desculpe, tive um erro ao carregar os serviços da barbearia. Tente novamente."
		} else {
			responseText = "Olá! Estes são os nossos serviços disponíveis:\n\n"
			for _, serv := range servicos {
				responseText += fmt.Sprintf("- **%s**: R$ %.2f (Duração: %d min, Recompensa: +%d XP)\n", serv.Nome, serv.Preco, serv.DuracaoMinutos, serv.XpRecompensa)
			}
			responseText += "\nQual deles você gostaria de agendar?"
		}
	} else if containsAny(msgLower, "barbeiro", "profissional", "barbeiros", "atende") {
		barbeiros, err := s.ListarBarbeiros()
		if err != nil {
			responseText = "Desculpe, tive um erro ao consultar os barbeiros disponíveis."
		} else {
			responseText = "Temos os seguintes profissionais incríveis prontos para te atender:\n\n"
			for _, b := range barbeiros {
				responseText += fmt.Sprintf("- **%s** (ID: %d)\n", b.Nome, b.ID)
			}
			responseText += "\nVocê tem preferência por algum deles?"
		}
	} else if containsAny(msgLower, "agenda", "marcar", "horario", "data", "dia") {
		// Tentar simular criação automática de agendamento se contiver informações
		// Vamos ver se o usuário especificou barbeiro, serviço e data
		servicoID := 0
		barbeiroID := 0
		servicoNome := ""
		barbeiroNome := ""

		// Identificar serviço
		if containsAny(msgLower, "simples", "corte simples") {
			servicoID = 1
			servicoNome = "Corte Simples"
		} else if containsAny(msgLower, "corte + barba", "corte e barba", "completo") {
			servicoID = 2
			servicoNome = "Corte + Barba"
		} else if containsAny(msgLower, "barba completa", "barba") {
			servicoID = 3
			servicoNome = "Barba Completa"
		} else if containsAny(msgLower, "hidrata", "hidratacao") {
			servicoID = 4
			servicoNome = "Hidratação Capilar"
		}

		// Identificar barbeiro
		if containsAny(msgLower, "carlos", "ruivo") {
			barbeiroID = 1 // Carlos Ruivo no seed
			barbeiroNome = "Carlos Ruivo"
		} else if containsAny(msgLower, "ricardo", "lima") {
			barbeiroID = 2 // Ricardo Lima
			barbeiroNome = "Ricardo Lima"
		} else {
			// Pegar o primeiro da lista
			barbeiros, _ := s.ListarBarbeiros()
			if len(barbeiros) > 0 {
				barbeiroID = barbeiros[0].ID
				barbeiroNome = barbeiros[0].Nome
			}
		}

		if servicoID > 0 && barbeiroID > 0 {
			// Simular data: vamos agendar para hoje + 2 dias às 15:30
			targetDate := time.Now().AddDate(0, 0, 2)
			targetTime := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 15, 30, 0, 0, getSaoPauloLocation())
			
			id, err := s.CriarAgendamento(clienteID, barbeiroID, servicoID, targetTime)
			if err != nil {
				responseText = fmt.Sprintf("Infelizmente ocorreu um erro ao confirmar o agendamento no banco: %v", err)
			} else {
				responseText = fmt.Sprintf("Com certeza, agendamento confirmado! 🎉\n\nAgendei **%s** com **%s** para o dia **%s às 15:30**.\n\nSeu agendamento foi salvo com sucesso (Código #%d). Estarei te esperando na barbearia!", servicoNome, barbeiroNome, targetTime.Format("02/01/2006"), id)
			}
		} else {
			responseText = "Com certeza posso te ajudar a agendar! Para prosseguir, por favor informe:\n1. O **serviço** desejado (ex: Corte Simples, Corte + Barba)\n2. O **barbeiro** (ex: Carlos Ruivo, Ricardo Lima)\n3. O **dia e horário** de preferência."
		}
	} else {
		responseText = fmt.Sprintf("Olá, %s! Eu sou o assistente virtual da RuivoBarber. ✂️\n\nPosso listar nossos serviços, consultar os barbeiros disponíveis ou fazer um agendamento direto para você. Como posso ajudar hoje?", clienteNome)
	}

	// Streamar resposta simulada
	words := strings.Fields(responseText)
	for i, w := range words {
		chunk := w
		if i > 0 {
			chunk = " " + chunk
		}
		writeChunk(chunk)
		time.Sleep(30 * time.Millisecond) // Simula digitação
	}
	return nil
}

func containsAny(str string, subs ...string) bool {
	str = strings.ToLower(str)
	for _, sub := range subs {
		if strings.Contains(str, strings.ToLower(sub)) {
			return true
		}
	}
	return false
}

func (s *ClienteService) chamarGeminiReal(apiKey string, clienteID int, clienteNome string, userMsg string, history []GeminiContent, writeChunk func(string)) error {
	// 1. Montar histórico de conteúdos e tools
	// (Implementação da chamada HTTP real usando o REST do Gemini v1beta com SSE & Function Calling)
	// Para manter a compilação do Go limpa sem pacotes extras e extremamente robusta:
	// Usamos o pacote net/http padrão.
	// Definimos os schemas das tools: listar_servicos, listar_barbeiros, consultar_horarios, criar_agendamento.
	
	// Vamos encapsular a lógica de requisição HTTP e loop de function calling.
	// Se a API retornar uma requisição de functionCall, executamos localmente e reenviamos a resposta para o Gemini.
	
	tools := []GeminiTool{
		{
			FunctionDeclarations: []GeminiFunctionDeclaration{
				{
					Name:        "listar_servicos",
					Description: "Lista todos os serviços oferecidos pela barbearia com seus preços e bônus de XP.",
				},
				{
					Name:        "listar_barbeiros",
					Description: "Lista todos os barbeiros profissionais disponíveis para agendamento.",
				},
				{
					Name:        "consultar_horarios",
					Description: "Consulta os agendamentos existentes para um dia específico (formato YYYY-MM-DD) para verificar horários ocupados.",
					Parameters: &GeminiParameters{
						Type: "OBJECT",
						Properties: map[string]GeminiProperty{
							"data": {
								Type:        "STRING",
								Description: "A data no formato YYYY-MM-DD",
							},
						},
						Required: []string{"data"},
					},
				},
				{
					Name:        "criar_agendamento",
					Description: "Cria um novo agendamento na barbearia para o cliente conectado.",
					Parameters: &GeminiParameters{
						Type: "OBJECT",
						Properties: map[string]GeminiProperty{
							"barbeiro_id": {
								Type:        "INTEGER",
								Description: "ID do barbeiro escolhido",
							},
							"servico_id": {
								Type:        "INTEGER",
								Description: "ID do serviço escolhido",
							},
							"data_hora": {
								Type:        "STRING",
								Description: "Data e hora no formato YYYY-MM-DD HH:MM (ex: 2026-06-15 14:30)",
							},
						},
						Required: []string{"barbeiro_id", "servico_id", "data_hora"},
					},
				},
			},
		},
	}

	systemInst := &GeminiInstruction{
		Parts: []GeminiPart{
			{
				Text: fmt.Sprintf("Você é o assistente virtual inteligente da barbearia RuivoBarber. Seu objetivo é ajudar o cliente conectado (Nome: %s, ID: %d) a consultar serviços, consultar barbeiros e agendar horários. Seja extremamente cortês, amigável e focado em fechar o agendamento.", clienteNome, clienteID),
			},
		},
	}

	// Juntar as mensagens
	var contents []GeminiContent
	for _, h := range history {
		contents = append(contents, h)
	}
	// Adicionar a última mensagem
	contents = append(contents, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: userMsg}},
	})

	reqBody := GeminiRequest{
		Contents:          contents,
		Tools:             tools,
		SystemInstruction: systemInst,
	}

	return s.executarChamadaGeminiStream(apiKey, clienteID, reqBody, writeChunk)
}

func (s *ClienteService) executarChamadaGeminiStream(apiKey string, clienteID int, reqBody GeminiRequest, writeChunk func(string)) error {
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=" + apiKey

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("erro na API do Gemini (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	// Ler a resposta SSE
	reader := bufio.NewReader(resp.Body)
	var functionToCall *GeminiFunctionCall

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return err
		}

		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}

		dataJSON := strings.TrimPrefix(line, "data:")
		dataJSON = strings.TrimSpace(dataJSON)

		// Parse do chunk
		var chunk struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text         string              `json:"text"`
						FunctionCall *GeminiFunctionCall `json:"functionCall"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.Unmarshal([]byte(dataJSON), &chunk); err != nil {
			continue
		}

		if len(chunk.Candidates) > 0 && len(chunk.Candidates[0].Content.Parts) > 0 {
			part := chunk.Candidates[0].Content.Parts[0]
			if part.FunctionCall != nil {
				functionToCall = part.FunctionCall
			}
			if part.Text != "" {
				writeChunk(part.Text)
			}
		}
	}

	// Se houver Function Calling solicitado pelo modelo
	if functionToCall != nil {
		return s.resolverFunctionCall(apiKey, clienteID, reqBody, functionToCall, writeChunk)
	}

	return nil
}

func (s *ClienteService) resolverFunctionCall(apiKey string, clienteID int, reqBody GeminiRequest, fc *GeminiFunctionCall, writeChunk func(string)) error {
	var functionResult map[string]interface{}

	switch fc.Name {
	case "listar_servicos":
		servicos, dbErr := s.ListarServicos()
		if dbErr != nil {
			functionResult = map[string]interface{}{"erro": dbErr.Error()}
		} else {
			functionResult = map[string]interface{}{"servicos": servicos}
		}
	case "listar_barbeiros":
		barbeiros, dbErr := s.ListarBarbeiros()
		if dbErr != nil {
			functionResult = map[string]interface{}{"erro": dbErr.Error()}
		} else {
			functionResult = map[string]interface{}{"barbeiros": barbeiros}
		}
	case "consultar_horarios":
		data, ok := fc.Args["data"].(string)
		if !ok {
			functionResult = map[string]interface{}{"erro": "parâmetro 'data' é obrigatório"}
		} else {
			agendamentos, dbErr := s.ListarAgendamentos(data)
			if dbErr != nil {
				functionResult = map[string]interface{}{"erro": dbErr.Error()}
			} else {
				functionResult = map[string]interface{}{"agendamentos": agendamentos}
			}
		}
	case "criar_agendamento":
		barbeiroIDFloat, ok1 := fc.Args["barbeiro_id"].(float64)
		servicoIDFloat, ok2 := fc.Args["servico_id"].(float64)
		dataHoraStr, ok3 := fc.Args["data_hora"].(string)

		if !ok1 || !ok2 || !ok3 {
			functionResult = map[string]interface{}{"erro": "parâmetros 'barbeiro_id', 'servico_id' e 'data_hora' são obrigatórios"}
		} else {
			saoPaulo := getSaoPauloLocation()
			parsedTime, parseErr := time.ParseInLocation("2006-01-02 15:04", dataHoraStr, saoPaulo)
			if parseErr != nil {
				parsedTime, parseErr = time.Parse(time.RFC3339, dataHoraStr)
				if parseErr == nil {
					parsedTime = parsedTime.In(saoPaulo)
				}
			}

			if parseErr != nil {
				functionResult = map[string]interface{}{"erro": fmt.Sprintf("formato de data inválido: %v. Use 'YYYY-MM-DD HH:MM'", parseErr)}
			} else {
				id, dbErr := s.CriarAgendamento(clienteID, int(barbeiroIDFloat), int(servicoIDFloat), parsedTime)
				if dbErr != nil {
					functionResult = map[string]interface{}{"erro": dbErr.Error()}
				} else {
					functionResult = map[string]interface{}{"status": "sucesso", "agendamento_id": id, "mensagem": "Agendamento criado com sucesso!"}
				}
			}
		}
	default:
		functionResult = map[string]interface{}{"erro": "função desconhecida"}
	}

	// Adicionar a chamada do modelo e a resposta da função no histórico
	reqBody.Contents = append(reqBody.Contents, GeminiContent{
		Role: "model",
		Parts: []GeminiPart{
			{
				FunctionCall: fc,
			},
		},
	})

	reqBody.Contents = append(reqBody.Contents, GeminiContent{
		Role: "function",
		Parts: []GeminiPart{
			{
				FunctionResponse: &GeminiFunctionResponse{
					Name:     fc.Name,
					Response: functionResult,
				},
			},
		},
	})

	// Fazer a segunda chamada de acompanhamento para gerar o texto final
	return s.executarChamadaGeminiStream(apiKey, clienteID, reqBody, writeChunk)
}


func (s *ClienteService) GoogleLogin(authCode string) (*domain.Cliente, string, error) {
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if googleClientID == "" {
		return nil, "", errors.New("variável GOOGLE_CLIENT_ID não configurada no backend")
	}

	// Trocar o authorization code por tokens usando o endpoint OAuth2 do Google
	redirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
	if redirectURI == "" {
		// Em desenvolvimento, postmessage é o valor padrão para fluxo popup
		redirectURI = "postmessage"
	}

	tokenURL := "https://oauth2.googleapis.com/token"
	formData := fmt.Sprintf(
		"code=%s&client_id=%s&client_secret=%s&redirect_uri=%s&grant_type=authorization_code",
		authCode, googleClientID, googleClientSecret, redirectURI,
	)

	resp, err := http.Post(tokenURL, "application/x-www-form-urlencoded", strings.NewReader(formData))
	if err != nil {
		return nil, "", fmt.Errorf("falha ao comunicar com o Google: %v", err)
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, "", fmt.Errorf("falha ao decodificar resposta do Google: %v", err)
	}
	if tokenResp.Error != "" {
		return nil, "", fmt.Errorf("Google OAuth erro: %s - %s", tokenResp.Error, tokenResp.ErrorDesc)
	}

	// Usar o access_token para buscar informações do usuário
	userInfoURL := "https://www.googleapis.com/oauth2/v2/userinfo"
	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	httpClient := &http.Client{}
	userResp, err := httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("falha ao buscar dados do usuário no Google: %v", err)
	}
	defer userResp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(userResp.Body).Decode(&userInfo); err != nil {
		return nil, "", fmt.Errorf("falha ao decodificar dados do usuário: %v", err)
	}
	if userInfo.Email == "" {
		return nil, "", errors.New("e-mail não fornecido pelo Google")
	}

	email := userInfo.Email
	nome := userInfo.Name
	if nome == "" {
		nome = email
	}

	cliente, err := s.repo.FindByLogin(context.Background(), email)
	if err != nil {
		// Auto-cadastro de novos usuários via Google OAuth
		cargo := "Cliente"
		// Regra de exemplo: se o e-mail for do domínio da empresa, é barbeiro
		// if strings.HasSuffix(email, "@ruivobarber.com.br") { cargo = "Barbeiro" }

		novoCliente := &domain.Cliente{
			Nome:  nome,
			Login: email,
			Cargo: cargo,
		}

		dummyPass := fmt.Sprintf("google_oauth_%d", time.Now().UnixNano())
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(dummyPass), bcrypt.DefaultCost)
		if err != nil {
			return nil, "", err
		}

		err = s.repo.Save(context.Background(), novoCliente, string(hashedBytes))
		if err != nil {
			return nil, "", err
		}

		cliente, err = s.repo.FindByLogin(context.Background(), email)
		if err != nil {
			return nil, "", err
		}
	}

	// Criar o token JWT interno da plataforma
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":        cliente.ID,
		"nome":      cliente.Nome,
		"cargo":     cliente.Cargo,
		"tenant_id": "00000000-0000-0000-0000-000000000000",
		"exp":       time.Now().Add(time.Hour * 72).Unix(),
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

func (s *ClienteService) ListarTemporadas() ([]domain.Temporada, error) {
	return s.temporadaRepo.FindAll()
}

func (s *ClienteService) ObterTemporadaAtiva() (*domain.Temporada, error) {
	return s.temporadaRepo.FindActive()
}

func (s *ClienteService) CriarTemporada(nome string, dataInicio, dataFim time.Time, ativa bool) (*domain.Temporada, error) {
	if dataInicio.After(dataFim) {
		return nil, errors.New("a data de início deve ser anterior à data de término")
	}

	if ativa {
		// Desativar todas as temporadas anteriores para manter apenas uma ativa
		err := s.temporadaRepo.DeactivateAll()
		if err != nil {
			return nil, err
		}
	}

	t := &domain.Temporada{
		Nome:       nome,
		DataInicio: dataInicio,
		DataFim:    dataFim,
		Ativa:      ativa,
	}

	err := s.temporadaRepo.Save(t)
	if err != nil {
		return nil, err
	}

	return t, nil
}

func (s *ClienteService) AtualizarTemporada(id int, nome string, dataInicio, dataFim time.Time, ativa bool) (*domain.Temporada, error) {
	if dataInicio.After(dataFim) {
		return nil, errors.New("a data de início deve ser anterior à data de término")
	}

	t, err := s.temporadaRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if ativa && !t.Ativa {
		// Se estiver ativando esta temporada, desativar as outras
		err = s.temporadaRepo.DeactivateAll()
		if err != nil {
			return nil, err
		}
	}

	t.Nome = nome
	t.DataInicio = dataInicio
	t.DataFim = dataFim
	t.Ativa = ativa

	err = s.temporadaRepo.Update(t)
	if err != nil {
		return nil, err
	}

	return t, nil
}

func (s *ClienteService) ObterConfiguracoes() (*domain.Configuracoes, error) {
	return s.repo.ObterConfiguracoes(context.Background())
}

func (s *ClienteService) SalvarConfiguracoes(cfg *domain.Configuracoes) error {
	return s.repo.SalvarConfiguracoes(context.Background(), cfg)
}

func (s *ClienteService) RegistrarMensagemProcessada(messageID string) (bool, error) {
	return s.repo.RegistrarMensagemProcessada(context.Background(), messageID)
}

func (s *ClienteService) simularChatSincrono(clienteID int, clienteNome string, userMsg string) (string, error) {
	var responseText string
	writeChunk := func(text string) {
		responseText += text
	}
	err := s.simularChat(clienteID, clienteNome, userMsg, writeChunk)
	return responseText, err
}

func (s *ClienteService) ProcessarChatWhatsApp(sender string, message string) (string, error) {
	clienteID := 0
	clienteNome := "Visitante"
	c, err := s.repo.BuscarClientePorTelefone(context.Background(), sender)
	if err == nil && c != nil {
		clienteID = c.ID
		clienteNome = c.Nome
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return s.simularChatSincrono(clienteID, clienteNome, message)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tools := []GeminiTool{
		{
			FunctionDeclarations: []GeminiFunctionDeclaration{
				{
					Name:        "listar_servicos",
					Description: "Lista todos os serviços oferecidos pela barbearia com seus preços e bônus de XP.",
				},
				{
					Name:        "listar_barbeiros",
					Description: "Lista todos os barbeiros profissionais disponíveis para agendamento.",
				},
				{
					Name:        "consultar_horarios",
					Description: "Consulta os agendamentos existentes para um dia específico (formato YYYY-MM-DD) para verificar horários ocupados.",
					Parameters: &GeminiParameters{
						Type: "OBJECT",
						Properties: map[string]GeminiProperty{
							"data": {
								Type:        "STRING",
								Description: "A data no formato YYYY-MM-DD",
							},
						},
						Required: []string{"data"},
					},
				},
				{
					Name:        "criar_agendamento",
					Description: "Cria um novo agendamento na barbearia para o cliente conectado.",
					Parameters: &GeminiParameters{
						Type: "OBJECT",
						Properties: map[string]GeminiProperty{
							"barbeiro_id": {
								Type:        "INTEGER",
								Description: "ID do barbeiro escolhido",
							},
							"servico_id": {
								Type:        "INTEGER",
								Description: "ID do serviço escolhido",
							},
							"data_hora": {
								Type:        "STRING",
								Description: "Data e hora no formato YYYY-MM-DD HH:MM (ex: 2026-06-15 14:30)",
							},
						},
						Required: []string{"barbeiro_id", "servico_id", "data_hora"},
					},
				},
			},
		},
	}

	systemInst := &GeminiInstruction{
		Parts: []GeminiPart{
			{
				Text: fmt.Sprintf("Você é o assistente virtual inteligente da barbearia RuivoBarber. Seu objetivo é ajudar o cliente conectado (Nome: %s, ID: %d) a consultar serviços, consultar barbeiros e agendar horários. Seja extremamente cortês, amigável e focado em fechar o agendamento.", clienteNome, clienteID),
			},
		},
	}

	contents := []GeminiContent{
		{
			Role:  "user",
			Parts: []GeminiPart{{Text: message}},
		},
	}

	reqBody := GeminiRequest{
		Contents:          contents,
		Tools:             tools,
		SystemInstruction: systemInst,
	}

	respText, functionToCall, err := s.chamarGeminiAPI(ctx, apiKey, reqBody)
	if err != nil {
		log.Printf("[WEBHOOK AI FAIL] Erro de comunicação com Gemini: %v", err)
		return "Olá! No momento estou com uma oscilação temporária em meu sistema de inteligência artificial. Se desejar, você pode entrar em contato conosco pelo telefone da barbearia ou tentar novamente em instantes!", nil
	}

	if functionToCall != nil {
		resultText, err := s.resolverFunctionCallSincrono(ctx, apiKey, clienteID, reqBody, functionToCall)
		if err != nil {
			log.Printf("[WEBHOOK AI FAIL] Erro ao resolver function call: %v", err)
			return "Olá! No momento estou com uma oscilação temporária em meu sistema de inteligência artificial. Se desejar, você pode entrar em contato conosco pelo telefone da barbearia ou tentar novamente em instantes!", nil
		}
		return resultText, nil
	}

	return respText, nil
}

func (s *ClienteService) chamarGeminiAPI(ctx context.Context, apiKey string, reqBody GeminiRequest) (string, *GeminiFunctionCall, error) {
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("API Gemini status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text         string              `json:"text"`
					FunctionCall *GeminiFunctionCall `json:"functionCall"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", nil, err
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		part := geminiResp.Candidates[0].Content.Parts[0]
		if part.FunctionCall != nil {
			return "", part.FunctionCall, nil
		}
		return part.Text, nil, nil
	}

	return "", nil, errors.New("resposta vazia do Gemini")
}

func (s *ClienteService) resolverFunctionCallSincrono(ctx context.Context, apiKey string, clienteID int, reqBody GeminiRequest, fc *GeminiFunctionCall) (string, error) {
	var functionResult map[string]interface{}

	switch fc.Name {
	case "listar_servicos":
		servicos, dbErr := s.ListarServicos()
		if dbErr != nil {
			functionResult = map[string]interface{}{"erro": dbErr.Error()}
		} else {
			functionResult = map[string]interface{}{"servicos": servicos}
		}
	case "listar_barbeiros":
		barbeiros, dbErr := s.ListarBarbeiros()
		if dbErr != nil {
			functionResult = map[string]interface{}{"erro": dbErr.Error()}
		} else {
			functionResult = map[string]interface{}{"barbeiros": barbeiros}
		}
	case "consultar_horarios":
		data, ok := fc.Args["data"].(string)
		if !ok {
			functionResult = map[string]interface{}{"erro": "parâmetro 'data' é obrigatório"}
		} else {
			agendamentos, dbErr := s.ListarAgendamentos(data)
			if dbErr != nil {
				functionResult = map[string]interface{}{"erro": dbErr.Error()}
			} else {
				functionResult = map[string]interface{}{"agendamentos": agendamentos}
			}
		}
	case "criar_agendamento":
		barbeiroIDFloat, ok1 := fc.Args["barbeiro_id"].(float64)
		servicoIDFloat, ok2 := fc.Args["servico_id"].(float64)
		dataHoraStr, ok3 := fc.Args["data_hora"].(string)

		if !ok1 || !ok2 || !ok3 {
			functionResult = map[string]interface{}{"erro": "parâmetros 'barbeiro_id', 'servico_id' e 'data_hora' são obrigatórios"}
		} else if clienteID <= 0 {
			functionResult = map[string]interface{}{"erro": "você precisa estar cadastrado com este número de telefone na barbearia para poder agendar"}
		} else {
			saoPaulo := getSaoPauloLocation()
			parsedTime, parseErr := time.ParseInLocation("2006-01-02 15:04", dataHoraStr, saoPaulo)
			if parseErr != nil {
				parsedTime, parseErr = time.Parse(time.RFC3339, dataHoraStr)
				if parseErr == nil {
					parsedTime = parsedTime.In(saoPaulo)
				}
			}

			if parseErr != nil {
				functionResult = map[string]interface{}{"erro": fmt.Sprintf("formato de data inválido: %v. Use 'YYYY-MM-DD HH:MM'", parseErr)}
			} else {
				id, dbErr := s.CriarAgendamento(clienteID, int(barbeiroIDFloat), int(servicoIDFloat), parsedTime)
				if dbErr != nil {
					functionResult = map[string]interface{}{"erro": dbErr.Error()}
				} else {
					functionResult = map[string]interface{}{"status": "sucesso", "agendamento_id": id, "mensagem": "Agendamento criado com sucesso!"}
				}
			}
		}
	default:
		functionResult = map[string]interface{}{"erro": "função desconhecida"}
	}

	reqBody.Contents = append(reqBody.Contents, GeminiContent{
		Role: "model",
		Parts: []GeminiPart{
			{
				FunctionCall: fc,
			},
		},
	})

	var parts []GeminiPart
	respJSON, _ := json.Marshal(functionResult)
	parts = append(parts, GeminiPart{
		FunctionResponse: &GeminiFunctionResponse{
			Name:     fc.Name,
			Response: map[string]interface{}{"name": fc.Name, "content": string(respJSON)},
		},
	})

	reqBody.Contents = append(reqBody.Contents, GeminiContent{
		Role:  "function",
		Parts: parts,
	})

	finalText, _, err := s.chamarGeminiAPI(ctx, apiKey, reqBody)
	if err != nil {
		return "", err
	}

	return finalText, nil
}

func (s *ClienteService) CriarServico(serv *domain.Servico) (int, error) {
	return s.repo.CriarServico(context.Background(), serv)
}

func (s *ClienteService) AtualizarServico(serv *domain.Servico) error {
	return s.repo.AtualizarServico(context.Background(), serv)
}

func (s *ClienteService) DeletarServico(id int) error {
	return s.repo.DeletarServico(context.Background(), id)
}

func calculateCRC16(data string) string {
	crc := 0xFFFF
	polynomial := 0x1021
	for i := 0; i < len(data); i++ {
		crc ^= int(data[i]) << 8
		for j := 0; j < 8; j++ {
			if (crc & 0x8000) != 0 {
				crc = (crc << 1) ^ polynomial
			} else {
				crc <<= 1
			}
		}
	}
	return fmt.Sprintf("%04X", crc&0xFFFF)
}

func formatTLV(tag string, value string) string {
	return fmt.Sprintf("%02s%02d%s", tag, len(value), value)
}

func GerarPayloadPix(chave string, valor float64, nomeRecebedor string, cidadeRecebedora string) (string, error) {
	nomeClean := sanitizeString(nomeRecebedor, 25)
	cidadeClean := sanitizeString(cidadeRecebedora, 15)

	valorStr := fmt.Sprintf("%.2f", valor)

	pfi := formatTLV("00", "01")

	gui := formatTLV("00", "br.gov.bcb.pix")
	key := formatTLV("01", chave)
	merchantAccount := formatTLV("26", gui+key)

	mcc := formatTLV("52", "0000")

	currency := formatTLV("53", "986")

	amount := formatTLV("54", valorStr)

	country := formatTLV("58", "BR")

	name := formatTLV("59", nomeClean)

	city := formatTLV("60", cidadeClean)

	ref := formatTLV("05", "GORJETA")
	additionalData := formatTLV("62", ref)

	basePayload := pfi + merchantAccount + mcc + currency + amount + country + name + city + additionalData + "6304"

	crc := calculateCRC16(basePayload)

	return basePayload + crc, nil
}

func sanitizeString(input string, maxLength int) string {
	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "â", "a", "ã", "a", "ä", "a",
		"é", "e", "è", "e", "ê", "e", "ë", "e",
		"í", "i", "ì", "i", "î", "i", "ï", "i",
		"ó", "o", "ò", "o", "ô", "o", "õ", "o", "ö", "o",
		"ú", "u", "ù", "u", "û", "u", "ü", "u",
		"ç", "c", "ñ", "n",
		"Á", "A", "À", "A", "Â", "A", "Ã", "A", "Ä", "A",
		"É", "E", "È", "E", "Ê", "E", "Ë", "E",
		"Í", "I", "Ì", "I", "Î", "I", "Ï", "I",
		"Ó", "O", "Ò", "O", "Ô", "O", "Õ", "O", "Ö", "O",
		"Ú", "U", "Ù", "U", "Û", "U", "Ü", "U",
		"Ç", "C", "Ñ", "N",
	)
	clean := replacer.Replace(input)
	var sb strings.Builder
	for _, r := range clean {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == ' ' {
			sb.WriteRune(r)
		}
	}
	res := sb.String()
	if len(res) > maxLength {
		res = res[:maxLength]
	}
	return strings.TrimSpace(res)
}

func (s *ClienteService) SalvarChavePixBarbeiro(barbeiroID int, chavePix string) error {
	return s.repo.SalvarChavePixBarbeiro(context.Background(), barbeiroID, chavePix)
}

func (s *ClienteService) ConfirmarPagamentoGorjeta(id int) error {
	return s.repo.ConfirmarPagamentoGorjeta(context.Background(), id)
}

func (s *ClienteService) ObterGorjetasDoBarbeiro(barbeiroID int) ([]domain.Gorjeta, error) {
	gorjetas, err := s.repo.ObterGorjetasDoBarbeiro(context.Background(), barbeiroID)
	if err != nil {
		return nil, err
	}
	for i := range gorjetas {
		gorjetas[i].QrCodeURL = fmt.Sprintf("https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=%s", url.QueryEscape(gorjetas[i].PixCopiaECola))
	}
	return gorjetas, nil
}

func (s *ClienteService) CriarGorjeta(agendamentoID *int, clienteID *int, barbeiroID int, valor float64) (*domain.Gorjeta, error) {
	barbeiros, err := s.repo.ListarBarbeiros(context.Background())
	if err != nil {
		return nil, err
	}

	var targetBarbeiro *domain.Barbeiro
	for i := range barbeiros {
		if barbeiros[i].ID == barbeiroID {
			targetBarbeiro = &barbeiros[i]
			break
		}
	}

	if targetBarbeiro == nil {
		return nil, errors.New("barbeiro não encontrado")
	}

	if targetBarbeiro.ChavePix == "" {
		return nil, errors.New("o barbeiro não possui uma chave Pix cadastrada para receber gorjetas")
	}

	pixCopiaECola, err := GerarPayloadPix(targetBarbeiro.ChavePix, valor, targetBarbeiro.Nome, "Sao Paulo")
	if err != nil {
		return nil, fmt.Errorf("falha ao gerar payload Pix: %v", err)
	}

	g := &domain.Gorjeta{
		AgendamentoID: agendamentoID,
		ClienteID:     clienteID,
		BarbeiroID:    barbeiroID,
		Valor:         valor,
		ChavePix:      targetBarbeiro.ChavePix,
		PixCopiaECola: pixCopiaECola,
		Status:        "Pendente",
	}

	id, err := s.repo.CriarGorjeta(context.Background(), g)
	if err != nil {
		return nil, err
	}

	g.ID = id
	g.QrCodeURL = fmt.Sprintf("https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=%s", url.QueryEscape(pixCopiaECola))

	return g, nil
}

func (s *ClienteService) ObterUltimoCorteComStatusAvaliacao(clienteID int) (*domain.UltimoCorteResponse, error) {
	ultimoCorte, err := s.repo.ObterUltimoCorteConcluido(context.Background(), clienteID)
	if err != nil {
		return nil, err
	}
	if ultimoCorte == nil {
		return nil, nil
	}

	avaliacao, err := s.repo.BuscarAvaliacaoPorAgendamento(context.Background(), ultimoCorte.ID)
	if err != nil {
		return nil, err
	}

	res := &domain.UltimoCorteResponse{
		AgendamentoID:     ultimoCorte.ID,
		DataHora:          ultimoCorte.DataHora,
		BarbeiroID:        ultimoCorte.BarbeiroID,
		BarbeiroNome:      ultimoCorte.BarbeiroNome,
		ServicoNome:       ultimoCorte.ServicoNome,
		AvaliacaoPendente: avaliacao == nil,
	}
	return res, nil
}

func (s *ClienteService) SalvarAvaliacao(agendamentoID int, clienteID int, nota int, comentario string) error {
	if nota < 1 || nota > 5 {
		return errors.New("a nota deve ser entre 1 e 5")
	}

	agendamento, err := s.repo.BuscarAgendamentoPorID(context.Background(), agendamentoID)
	if err != nil {
		return err
	}
	if agendamento == nil {
		return errors.New("agendamento não encontrado")
	}

	if agendamento.ClienteID != clienteID {
		return errors.New("este agendamento não pertence a você")
	}

	if agendamento.Status != "Concluido" {
		return errors.New("só é possível avaliar atendimentos concluídos")
	}

	avaliacaoExistente, err := s.repo.BuscarAvaliacaoPorAgendamento(context.Background(), agendamentoID)
	if err != nil {
		return err
	}
	if avaliacaoExistente != nil {
		return errors.New("este atendimento já foi avaliado")
	}

	avaliacao := &domain.Avaliacao{
		AgendamentoID: agendamentoID,
		ClienteID:     clienteID,
		BarbeiroID:    agendamento.BarbeiroID,
		Nota:          nota,
		Comentario:    comentario,
	}

	err = s.repo.CriarAvaliacao(context.Background(), avaliacao)
	if err != nil {
		return err
	}

	return s.repo.RecalcularAvaliacaoMediaBarbeiro(context.Background(), agendamento.BarbeiroID)
}





