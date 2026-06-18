package repositories

import (
    "context"
    "database/sql"
    "errors"
    "math/rand"
    "time"
    "ruivobarber-api/internal/core/domain"
    "ruivobarber-api/internal/core/ports"
)

type ClientePgRepository struct {
    db *sql.DB
}

func NewClientePgRepository(db *sql.DB) *ClientePgRepository {
    return &ClientePgRepository{db: db}
}

func (r *ClientePgRepository) FindAll() ([]domain.Cliente, error) {
    query := `
        SELECT u.id, u.nome, u.login, u.cargo, 
               COALESCE(p.xpatual, 0) as xp, 
               COALESCE(p.nivelatual, 1) as nivel, 
               COALESCE(p.barrapercentual, 0.0) as barra_percentual, 
               COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel
        FROM Usuarios u
        LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
        LEFT JOIN Niveis n ON p.nivelatual = n.id
        WHERE u.cargo = 'Cliente'
    `
    rows, err := r.db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var clientes []domain.Cliente
    for rows.Next() {
        var c domain.Cliente
        err := rows.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel)
        if err != nil {
            return nil, err
        }
        clientes = append(clientes, c)
    }
    if err = rows.Err(); err != nil {
        return nil, err
    }
    return clientes, nil
}

func (r *ClientePgRepository) FindByID(id int) (*domain.Cliente, error) {
    var c domain.Cliente
    query := `
        SELECT u.id, u.nome, u.login, u.cargo, 
               COALESCE(p.xpatual, 0) as xp, 
               COALESCE(p.nivelatual, 1) as nivel, 
               COALESCE(p.barrapercentual, 0.0) as barra_percentual, 
               COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel
        FROM Usuarios u
        LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
        LEFT JOIN Niveis n ON p.nivelatual = n.id
        WHERE u.id = $1
    `
    row := r.db.QueryRow(query, id)
    err := row.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel)
    if err != nil {
        return nil, err
    }
    return &c, nil
}

func (r *ClientePgRepository) FindByLogin(login string) (*domain.Cliente, error) {
    var c domain.Cliente
    query := `
        SELECT u.id, u.nome, u.login, u.cargo, 
               COALESCE(p.xpatual, 0) as xp, 
               COALESCE(p.nivelatual, 1) as nivel, 
               COALESCE(p.barrapercentual, 0.0) as barra_percentual, 
               COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel
        FROM Usuarios u
        LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
        LEFT JOIN Niveis n ON p.nivelatual = n.id
        WHERE u.login = $1
    `
    row := r.db.QueryRow(query, login)
    err := row.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel)
    if err != nil {
        return nil, err
    }
    return &c, nil
}

func (r *ClientePgRepository) GetPasswordHashByLogin(login string) (string, error) {
    var senha string
    query := "SELECT senha FROM Usuarios WHERE login = $1"
    err := r.db.QueryRow(query, login).Scan(&senha)
    if err != nil {
        return "", err
    }
    return senha, nil
}

func (r *ClientePgRepository) Save(c *domain.Cliente, hashedSenha string) error {
    ctx := context.Background()
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    var id int
    queryUser := "INSERT INTO Usuarios (nome, login, senha, cargo) VALUES ($1, $2, $3, $4) RETURNING id"
    err = tx.QueryRowContext(ctx, queryUser, c.Nome, c.Login, hashedSenha, c.Cargo).Scan(&id)
    if err != nil {
        return err
    }

    c.ID = id

    if c.Cargo == "Cliente" {
        queryProgresso := "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($1, 0, 1, 0.00)"
        _, err = tx.ExecContext(ctx, queryProgresso, id)
        if err != nil {
            return err
        }
    }

    return tx.Commit()
}

func (r *ClientePgRepository) Update(c *domain.Cliente, hashedSenha string) error {
    if hashedSenha != "" {
        query := "UPDATE Usuarios SET nome = $1, login = $2, senha = $3 WHERE id = $4"
        _, err := r.db.Exec(query, c.Nome, c.Login, hashedSenha, c.ID)
        return err
    }
    query := "UPDATE Usuarios SET nome = $1, login = $2 WHERE id = $3"
    _, err := r.db.Exec(query, c.Nome, c.Login, c.ID)
    return err
}

func (r *ClientePgRepository) ConcluirAtendimento(agendamentoID int) (*ports.NotificationEvent, error) {
    ctx := context.Background()
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    // 1. Obter e travar o agendamento (Transaction Lock)
    var clienteID, servicoID int
    var status string
    err = tx.QueryRowContext(ctx, "SELECT clienteid, servicoid, status FROM Agendamentos WHERE id = $1 FOR UPDATE", agendamentoID).Scan(&clienteID, &servicoID, &status)
    if err != nil {
        return nil, err
    }

    if status == "Concluido" {
        return nil, errors.New("agendamento já concluído")
    }

    // Obter nome do cliente
    var clienteNome string
    err = tx.QueryRowContext(ctx, "SELECT nome FROM Usuarios WHERE id = $1", clienteID).Scan(&clienteNome)
    if err != nil {
        return nil, err
    }

    // 2. Obter XP de recompensa do Serviço
    var xpRecompensa int
    err = tx.QueryRowContext(ctx, "SELECT xprecompensa FROM Servicos WHERE id = $1", servicoID).Scan(&xpRecompensa)
    if err != nil {
        return nil, err
    }

    // 3. Buscar produtos associados ao serviço e dar baixa no estoque
    type ServicoProduto struct {
        ProdutoID            int
        QuantidadeNecessaria int
    }
    rows, err := tx.QueryContext(ctx, "SELECT produtoid, quantidadenecessaria FROM ServicoProdutos WHERE servicoid = $1", servicoID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var produtos []ServicoProduto
    for rows.Next() {
        var sp ServicoProduto
        if err := rows.Scan(&sp.ProdutoID, &sp.QuantidadeNecessaria); err != nil {
            return nil, err
        }
        produtos = append(produtos, sp)
    }

    for _, p := range produtos {
        _, err = tx.ExecContext(ctx, "UPDATE Produtos SET quantidade = quantidade - $1 WHERE id = $2", p.QuantidadeNecessaria, p.ProdutoID)
        if err != nil {
            // Se falhar (ex: quantidade < 0 CHECK constraint), a transação falha e o rollback é executado.
            return nil, err
        }
    }

    // 4. Atualizar status do agendamento
    _, err = tx.ExecContext(ctx, "UPDATE Agendamentos SET status = 'Concluido' WHERE id = $1", agendamentoID)
    if err != nil {
        return nil, err
    }

    // 5. Atualizar ou Criar ProgressoCliente e calcular XP/Nivel
    var xpAtual, nivelAtual int
    var progressoExiste bool
    err = tx.QueryRowContext(ctx, "SELECT xpatual, nivelatual FROM ProgressoCliente WHERE clienteid = $1", clienteID).Scan(&xpAtual, &nivelAtual)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            xpAtual = 0
            nivelAtual = 1
            progressoExiste = false
        } else {
            return nil, err
        }
    } else {
        progressoExiste = true
    }

    xpAtual += xpRecompensa

    // Carregar níveis para cálculo de nível atual e barra percentual
    type NivelInfo struct {
        ID           int
        NomeDoNivel  string
        XpNecessario int
    }
    rowsNiveis, err := tx.QueryContext(ctx, "SELECT id, nomedonivel, xpnecessario FROM Niveis ORDER BY xpnecessario ASC")
    if err != nil {
        return nil, err
    }
    defer rowsNiveis.Close()

    var niveis []NivelInfo
    for rowsNiveis.Next() {
        var n NivelInfo
        if err := rowsNiveis.Scan(&n.ID, &n.NomeDoNivel, &n.XpNecessario); err != nil {
            return nil, err
        }
        niveis = append(niveis, n)
    }

    // Determinar o nível atual
    calculatedNivel := 1 // Default
    nivelNome := "Corte Iniciante"
    for _, l := range niveis {
        if xpAtual >= l.XpNecessario {
            calculatedNivel = l.ID
            nivelNome = l.NomeDoNivel
        }
    }

    // Determinar o próximo nível para calcular barra percentual
    var nextXp int = 100 // Default fallback
    maxLevelReached := true
    for _, l := range niveis {
        if xpAtual < l.XpNecessario {
            nextXp = l.XpNecessario
            maxLevelReached = false
            break
        }
    }

    var pct float64
    if maxLevelReached {
        pct = 100.00
    } else {
        pct = (float64(xpAtual) / float64(nextXp)) * 100.00
        if pct > 100.00 {
            pct = 100.00
        }
    }

    if progressoExiste {
        _, err = tx.ExecContext(ctx, "UPDATE ProgressoCliente SET xpatual = $1, nivelatual = $2, barrapercentual = $3, updatedat = NOW() WHERE clienteid = $4", xpAtual, calculatedNivel, pct, clienteID)
    } else {
        _, err = tx.ExecContext(ctx, "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($1, $2, $3, $4)", clienteID, xpAtual, calculatedNivel, pct)
    }
    if err != nil {
        return nil, err
    }

    err = tx.Commit()
    if err != nil {
        return nil, err
    }

    subiuNivelMax := (nivelNome == "Lenda da Navalha" || nivelNome == "Rei da Cadeira")

    return &ports.NotificationEvent{
        ClienteID:     clienteID,
        ClienteNome:   clienteNome,
        XpGanhado:     xpRecompensa,
        XpTotal:       xpAtual,
        NivelNome:     nivelNome,
        SubiuNivelMax: subiuNivelMax,
    }, nil
}

func (r *ClientePgRepository) RegistrarFalta(agendamentoID int) error {
    ctx := context.Background()
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // 1. Obter e travar o agendamento (Transaction Lock)
    var clienteID int
    var status string
    err = tx.QueryRowContext(ctx, "SELECT clienteid, status FROM Agendamentos WHERE id = $1 FOR UPDATE", agendamentoID).Scan(&clienteID, &status)
    if err != nil {
        return err
    }

    if status == "Concluido" || status == "Cancelado" || status == "Falta" {
        return errors.New("agendamento já finalizado")
    }

    // 2. Atualizar status do agendamento
    _, err = tx.ExecContext(ctx, "UPDATE Agendamentos SET status = 'Falta' WHERE id = $1", agendamentoID)
    if err != nil {
        return err
    }

    // 3. Atualizar ou Criar ProgressoCliente e calcular XP/Nivel
    var xpAtual, nivelAtual int
    var progressoExiste bool
    err = tx.QueryRowContext(ctx, "SELECT xpatual, nivelatual FROM ProgressoCliente WHERE clienteid = $1", clienteID).Scan(&xpAtual, &nivelAtual)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            xpAtual = 0
            nivelAtual = 1
            progressoExiste = false
        } else {
            return err
        }
    } else {
        progressoExiste = true
    }

    // Dedução de exatamente 100 XP (sem ficar menor que 0)
    xpAtual -= 100
    if xpAtual < 0 {
        xpAtual = 0
    }

    // Carregar níveis para cálculo de nível atual e barra percentual
    type NivelInfo struct {
        ID           int
        XpNecessario int
    }
    rowsNiveis, err := tx.QueryContext(ctx, "SELECT id, xpnecessario FROM Niveis ORDER BY xpnecessario ASC")
    if err != nil {
        return err
    }
    defer rowsNiveis.Close()

    var niveis []NivelInfo
    for rowsNiveis.Next() {
        var n NivelInfo
        if err := rowsNiveis.Scan(&n.ID, &n.XpNecessario); err != nil {
            return err
        }
        niveis = append(niveis, n)
    }

    // Determinar o nível atual
    calculatedNivel := 1 // Default
    for _, l := range niveis {
        if xpAtual >= l.XpNecessario {
            calculatedNivel = l.ID
        }
    }

    // Determinar o próximo nível para calcular barra percentual
    var nextXp int = 100 // Default fallback
    maxLevelReached := true
    for _, l := range niveis {
        if xpAtual < l.XpNecessario {
            nextXp = l.XpNecessario
            maxLevelReached = false
            break
        }
    }

    var pct float64
    if maxLevelReached {
        pct = 100.00
    } else {
        pct = (float64(xpAtual) / float64(nextXp)) * 100.00
        if pct > 100.00 {
            pct = 100.00
        }
    }

    if progressoExiste {
        _, err = tx.ExecContext(ctx, "UPDATE ProgressoCliente SET xpatual = $1, nivelatual = $2, barrapercentual = $3, updatedat = NOW() WHERE clienteid = $4", xpAtual, calculatedNivel, pct, clienteID)
    } else {
        _, err = tx.ExecContext(ctx, "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($1, $2, $3, $4)", clienteID, xpAtual, calculatedNivel, pct)
    }
    if err != nil {
        return err
    }

    return tx.Commit()
}

func generateRandomCode(prefix string) string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))
    b := make([]byte, 6)
    for i := range b {
        b[i] = charset[seededRand.Intn(len(charset))]
    }
    return prefix + "-" + string(b)
}

func (r *ClientePgRepository) ResgatarCupom(clienteID, nivelID int) (*domain.Cupom, error) {
    ctx := context.Background()
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    // 1. Obter progresso do cliente
    var xpAtual int
    err = tx.QueryRowContext(ctx, "SELECT xpatual FROM ProgressoCliente WHERE clienteid = $1 FOR UPDATE", clienteID).Scan(&xpAtual)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, errors.New("cliente sem progresso registrado (XP zero)")
        }
        return nil, err
    }

    // 2. Buscar nível alvo
    var nomeDoNivel, bonus string
    var xpNecessario int
    err = tx.QueryRowContext(ctx, "SELECT nomedonivel, xpnecessario, bonus FROM Niveis WHERE id = $1", nivelID).Scan(&nomeDoNivel, &xpNecessario, &bonus)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, errors.New("nível não encontrado")
        }
        return nil, err
    }

    // 3. Validar elegibilidade
    if xpAtual < xpNecessario {
        return nil, errors.New("XP insuficiente para resgatar a recompensa deste nível")
    }

    if nivelID == 1 {
        return nil, errors.New("este nível não possui cupom de recompensa")
    }

    // 4. Prevenir resgate duplicado
    descricaoRecompensa := "Recompensa de Nível: " + nomeDoNivel
    var count int
    err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM Cupons WHERE clienteid = $1 AND descricao = $2", clienteID, descricaoRecompensa).Scan(&count)
    if err != nil {
        return nil, err
    }
    if count > 0 {
        return nil, errors.New("recompensa deste nível já resgatada")
    }

    // 5. Mapear o desconto percentual
    var descontoPercent float64
    var prefixCode string
    switch nivelID {
    case 2:
        descontoPercent = 5.00
        prefixCode = "BARBA5"
    case 3:
        descontoPercent = 10.00
        prefixCode = "LENDA10"
    case 4:
        descontoPercent = 100.00
        prefixCode = "REI100"
    default:
        descontoPercent = 0.00
        prefixCode = "DESCONTO"
    }

    // 6. Gerar código único e inserir
    codigoCupom := generateRandomCode(prefixCode)
    validoAte := time.Now().AddDate(0, 0, 30)

    var cupomID int
    err = tx.QueryRowContext(ctx, `
        INSERT INTO Cupons (codigo, descricao, descontopercent, clienteid, usado, validoate)
        VALUES ($1, $2, $3, $4, FALSE, $5)
        RETURNING id
    `, codigoCupom, descricaoRecompensa, descontoPercent, clienteID, validoAte).Scan(&cupomID)
    if err != nil {
        return nil, err
    }

    err = tx.Commit()
    if err != nil {
        return nil, err
    }

    return &domain.Cupom{
        ID:              cupomID,
        Codigo:          codigoCupom,
        Descricao:       descricaoRecompensa,
        DescontoPercent: descontoPercent,
        ClienteID:       clienteID,
        Usado:           false,
        ValidoAte:       validoAte,
    }, nil
}

func (r *ClientePgRepository) ValidarCupom(codigo string) (*domain.Cupom, error) {
    ctx := context.Background()
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    // 1. Buscar e bloquear o cupom
    var c domain.Cupom
    err = tx.QueryRowContext(ctx, "SELECT id, codigo, descricao, descontopercent, clienteid, usado, validoate FROM Cupons WHERE codigo = $1 FOR UPDATE", codigo).Scan(
        &c.ID, &c.Codigo, &c.Descricao, &c.DescontoPercent, &c.ClienteID, &c.Usado, &c.ValidoAte,
    )
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, errors.New("cupom não encontrado")
        }
        return nil, err
    }

    // 2. Verificar estado do cupom
    if c.Usado {
        return nil, errors.New("este cupom já foi utilizado")
    }

    if time.Now().After(c.ValidoAte) {
        return nil, errors.New("cupom expirado")
    }

    // 3. Invalidar o cupom (definir usado = TRUE)
    _, err = tx.ExecContext(ctx, "UPDATE Cupons SET usado = TRUE WHERE id = $1", c.ID)
    if err != nil {
        return nil, err
    }

    err = tx.Commit()
    if err != nil {
        return nil, err
    }

	c.Usado = true
	return &c, nil
}

func (r *ClientePgRepository) ListarServicos() ([]domain.Servico, error) {
	query := `SELECT id, nome, preco, xprecompensa, duracaominutos FROM Servicos ORDER BY id ASC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servicos []domain.Servico
	for rows.Next() {
		var s domain.Servico
		if err := rows.Scan(&s.ID, &s.Nome, &s.Preco, &s.XpRecompensa, &s.DuracaoMinutos); err != nil {
			return nil, err
		}
		servicos = append(servicos, s)
	}
	return servicos, nil
}

func (r *ClientePgRepository) ListarBarbeiros() ([]domain.Barbeiro, error) {
	query := `SELECT id, nome FROM Usuarios WHERE cargo IN ('Barbeiro', 'Adm') ORDER BY nome ASC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var barbeiros []domain.Barbeiro
	for rows.Next() {
		var b domain.Barbeiro
		if err := rows.Scan(&b.ID, &b.Nome); err != nil {
			return nil, err
		}
		barbeiros = append(barbeiros, b)
	}
	return barbeiros, nil
}

func (r *ClientePgRepository) ListarAgendamentos(data string) ([]domain.Agendamento, error) {
	query := `
		SELECT a.id, a.clienteid, u.nome, a.barbeiroid, b.nome, a.servicoid, s.nome, s.duracaominutos, a.datahora, a.status
		FROM Agendamentos a
		JOIN Usuarios u ON a.clienteid = u.id
		JOIN Usuarios b ON a.barbeiroid = b.id
		JOIN Servicos s ON a.servicoid = s.id
		WHERE CAST(a.datahora AS DATE) = $1 AND a.status != 'Cancelado'
		ORDER BY a.datahora ASC
	`
	rows, err := r.db.Query(query, data)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agendamentos []domain.Agendamento
	for rows.Next() {
		var a domain.Agendamento
		if err := rows.Scan(&a.ID, &a.ClienteID, &a.ClienteNome, &a.BarbeiroID, &a.BarbeiroNome, &a.ServicoID, &a.ServicoNome, &a.DuracaoMinutos, &a.DataHora, &a.Status); err != nil {
			return nil, err
		}
		agendamentos = append(agendamentos, a)
	}
	return agendamentos, nil
}

func (r *ClientePgRepository) BuscarServico(id int) (*domain.Servico, error) {
	query := `SELECT id, nome, preco, xprecompensa, duracaominutos FROM Servicos WHERE id = $1`
	var s domain.Servico
	err := r.db.QueryRow(query, id).Scan(&s.ID, &s.Nome, &s.Preco, &s.XpRecompensa, &s.DuracaoMinutos)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ClientePgRepository) ListarAgendamentosDoBarbeiro(barbeiroID int, data string) ([]domain.Agendamento, error) {
	query := `
		SELECT a.id, a.clienteid, u.nome, a.barbeiroid, b.nome, a.servicoid, s.nome, s.duracaominutos, a.datahora, a.status
		FROM Agendamentos a
		JOIN Usuarios u ON a.clienteid = u.id
		JOIN Usuarios b ON a.barbeiroid = b.id
		JOIN Servicos s ON a.servicoid = s.id
		WHERE a.barbeiroid = $1 AND CAST(a.datahora AS DATE) = $2 AND a.status != 'Cancelado'
		ORDER BY a.datahora ASC
	`
	rows, err := r.db.Query(query, barbeiroID, data)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agendamentos []domain.Agendamento
	for rows.Next() {
		var a domain.Agendamento
		if err := rows.Scan(&a.ID, &a.ClienteID, &a.ClienteNome, &a.BarbeiroID, &a.BarbeiroNome, &a.ServicoID, &a.ServicoNome, &a.DuracaoMinutos, &a.DataHora, &a.Status); err != nil {
			return nil, err
		}
		agendamentos = append(agendamentos, a)
	}
	return agendamentos, nil
}

func (r *ClientePgRepository) CriarAgendamento(clienteID, barbeiroID, servicoID int, dataHora time.Time) (int, error) {
	query := `
		INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status)
		VALUES ($1, $2, $3, $4, 'Pendente')
		RETURNING id
	`
	var id int
	err := r.db.QueryRow(query, clienteID, barbeiroID, servicoID, dataHora).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *ClientePgRepository) ListarAgendamentosDoCliente(clienteID int) ([]domain.Agendamento, error) {
	query := `
		SELECT a.id, a.clienteid, u.nome, a.barbeiroid, b.nome, a.servicoid, s.nome, s.duracaominutos, a.datahora, a.status
		FROM Agendamentos a
		JOIN Usuarios u ON a.clienteid = u.id
		JOIN Usuarios b ON a.barbeiroid = b.id
		JOIN Servicos s ON a.servicoid = s.id
		WHERE a.clienteid = $1
		ORDER BY a.datahora DESC
	`
	rows, err := r.db.Query(query, clienteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agendamentos []domain.Agendamento
	for rows.Next() {
		var a domain.Agendamento
		if err := rows.Scan(&a.ID, &a.ClienteID, &a.ClienteNome, &a.BarbeiroID, &a.BarbeiroNome, &a.ServicoID, &a.ServicoNome, &a.DuracaoMinutos, &a.DataHora, &a.Status); err != nil {
			return nil, err
		}
		agendamentos = append(agendamentos, a)
	}
	return agendamentos, nil
}

