package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type ClienteService struct {
	repo          ports.ClienteRepository
	notifier      ports.NotificationService
	temporadaRepo ports.TemporadaRepository
}

func NewClienteService(repo ports.ClienteRepository, notifier ports.NotificationService, temporadaRepo ports.TemporadaRepository) *ClienteService {
	return &ClienteService{repo: repo, notifier: notifier, temporadaRepo: temporadaRepo}
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
	hashedSenha, err := s.repo.GetPasswordHashByLogin(login)
	if err != nil {
		return nil, "", errors.New("usuário ou senha incorretos")
	}

	cliente, err := s.repo.FindByLogin(login)
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

func (s *ClienteService) CadastrarCliente(cliente *domain.Cliente, password string) error {
	_, err := s.repo.FindByLogin(cliente.Login)
	if err == nil {
		return errors.New("login já cadastrado no sistema")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	cliente.Cargo = "Cliente"
	return s.repo.Save(cliente, string(hashedBytes))
}

func (s *ClienteService) AtualizarPerfil(id int, nome, login, senha string) error {
	if login != "" {
		cExistente, err := s.repo.FindByLogin(login)
		if err == nil && cExistente.ID != id {
			return errors.New("login já cadastrado no sistema")
		}
	}

	cliente, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if nome != "" {
		cliente.Nome = nome
	}
	if login != "" {
		cliente.Login = login
	}

	var hashedSenha string
	if senha != "" {
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		hashedSenha = string(hashedBytes)
	}

	return s.repo.Update(cliente, hashedSenha)
}

func (s *ClienteService) ListarServicos() ([]domain.Servico, error) {
	return s.repo.ListarServicos()
}

func (s *ClienteService) ListarBarbeiros() ([]domain.Barbeiro, error) {
	return s.repo.ListarBarbeiros()
}

func (s *ClienteService) ListarAgendamentos(data string) ([]domain.Agendamento, error) {
	return s.repo.ListarAgendamentos(data)
}

func (s *ClienteService) ListarAgendamentosDoCliente(clienteID int) ([]domain.Agendamento, error) {
	return s.repo.ListarAgendamentosDoCliente(clienteID)
}

func (s *ClienteService) CriarAgendamento(clienteID, barbeiroID, servicoID int, dataHora time.Time) (int, error) {
	return s.repo.CriarAgendamento(clienteID, barbeiroID, servicoID, dataHora)
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
			targetTime := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 15, 30, 0, 0, time.Local)
			
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
			// Parse do formato "YYYY-MM-DD HH:MM"
			parsedTime, parseErr := time.ParseInLocation("2006-01-02 15:04", dataHoraStr, time.Local)
			if parseErr != nil {
				parsedTime, parseErr = time.Parse(time.RFC3339, dataHoraStr)
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

func (s *ClienteService) GoogleLogin(email, nome string) (*domain.Cliente, string, error) {
	cliente, err := s.repo.FindByLogin(email)
	if err == nil {
		if cliente.Cargo != "Cliente" {
			return nil, "", errors.New("login social permitido apenas para clientes")
		}
	} else {
		// Usuário não existe, vamos cadastrá-lo automaticamente
		novoCliente := &domain.Cliente{
			Nome:  nome,
			Login: email,
			Cargo: "Cliente",
		}
		
		// Gerar um hash de senha aleatório para cumprir o schema
		dummyPass := fmt.Sprintf("google_oauth_%d", time.Now().UnixNano())
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(dummyPass), bcrypt.DefaultCost)
		if err != nil {
			return nil, "", err
		}

		err = s.repo.Save(novoCliente, string(hashedBytes))
		if err != nil {
			return nil, "", err
		}

		// Buscar o cliente recém criado para obter o ID preenchido pelo banco
		cliente, err = s.repo.FindByLogin(email)
		if err != nil {
			return nil, "", err
		}
	}

	// Criar token JWT para o login do Google
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


