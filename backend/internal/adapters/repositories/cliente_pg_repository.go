package repositories

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
    "math/rand"
    "strings"
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
               COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel,
               COALESCE(u.avatar_url, '') as avatar_url,
               COALESCE(p.moedas, 0) as moedas,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Moldura' LIMIT 1), '') as moldura_equipada,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Background' LIMIT 1), '') as fundo_equipado,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Efeito' LIMIT 1), '') as efeito_equipado
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
        err := rows.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel, &c.AvatarURL, &c.Moedas, &c.MolduraEquipada, &c.FundoEquipado, &c.EfeitoEquipado)
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
               COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel,
               COALESCE(u.avatar_url, '') as avatar_url,
               COALESCE(p.moedas, 0) as moedas,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Moldura' LIMIT 1), '') as moldura_equipada,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Background' LIMIT 1), '') as fundo_equipado,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Efeito' LIMIT 1), '') as efeito_equipado
        FROM Usuarios u
        LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
        LEFT JOIN Niveis n ON p.nivelatual = n.id
        WHERE u.id = $1
    `
    row := r.db.QueryRow(query, id)
    err := row.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel, &c.AvatarURL, &c.Moedas, &c.MolduraEquipada, &c.FundoEquipado, &c.EfeitoEquipado)
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
               COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel,
               COALESCE(u.avatar_url, '') as avatar_url,
               COALESCE(p.moedas, 0) as moedas,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Moldura' LIMIT 1), '') as moldura_equipada,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Background' LIMIT 1), '') as fundo_equipado,
               COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Efeito' LIMIT 1), '') as efeito_equipado
        FROM Usuarios u
        LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
        LEFT JOIN Niveis n ON p.nivelatual = n.id
        WHERE u.login = $1
    `
    row := r.db.QueryRow(query, login)
    err := row.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel, &c.AvatarURL, &c.Moedas, &c.MolduraEquipada, &c.FundoEquipado, &c.EfeitoEquipado)
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
    queryUser := "INSERT INTO Usuarios (nome, login, senha, cargo, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING id"
    err = tx.QueryRowContext(ctx, queryUser, c.Nome, c.Login, hashedSenha, c.Cargo, c.AvatarURL).Scan(&id)
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
        query := "UPDATE Usuarios SET nome = $1, login = $2, senha = $3, avatar_url = $4 WHERE id = $5"
        _, err := r.db.Exec(query, c.Nome, c.Login, hashedSenha, c.AvatarURL, c.ID)
        return err
    }
    query := "UPDATE Usuarios SET nome = $1, login = $2, avatar_url = $3 WHERE id = $4"
    _, err := r.db.Exec(query, c.Nome, c.Login, c.AvatarURL, c.ID)
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

    // 2. Obter XP de recompensa e nome do Serviço
    var xpRecompensa int
    var servicoNome string
    err = tx.QueryRowContext(ctx, "SELECT nome, xprecompensa FROM Servicos WHERE id = $1", servicoID).Scan(&servicoNome, &xpRecompensa)
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
    _, err = tx.ExecContext(ctx, "UPDATE Agendamentos SET status = 'Concluido', concluidotime = NOW() WHERE id = $1", agendamentoID)
    if err != nil {
        return nil, err
    }

    // 5. Atualizar ou Criar ProgressoCliente e calcular XP/Nivel
    var xpAtual, nivelAtual, moedas int
    var progressoExiste bool
    err = tx.QueryRowContext(ctx, "SELECT xpatual, nivelatual, moedas FROM ProgressoCliente WHERE clienteid = $1", clienteID).Scan(&xpAtual, &nivelAtual, &moedas)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            xpAtual = 0
            nivelAtual = 1
            moedas = 0
            progressoExiste = false
        } else {
            return nil, err
        }
    } else {
        progressoExiste = true
    }

    xpAtual += xpRecompensa
    moedas += xpRecompensa

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
        _, err = tx.ExecContext(ctx, "UPDATE ProgressoCliente SET xpatual = $1, nivelatual = $2, barrapercentual = $3, moedas = $4, updatedat = NOW() WHERE clienteid = $5", xpAtual, calculatedNivel, pct, moedas, clienteID)
    } else {
        _, err = tx.ExecContext(ctx, "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual, moedas) VALUES ($1, $2, $3, $4, $5)", clienteID, xpAtual, calculatedNivel, pct, moedas)
    }
    if err != nil {
        return nil, err
    }

    // Atualizar XP do Clã se o cliente pertencer a um clã
    var claID int
    err = tx.QueryRowContext(ctx, "SELECT claid FROM ClaMembros WHERE usuarioid = $1", clienteID).Scan(&claID)
    if err == nil {
        var xpColetivo, nivelAtual int
        err = tx.QueryRowContext(ctx, "UPDATE Clas SET xpcoletivo = xpcoletivo + 1 WHERE id = $1 RETURNING xpcoletivo, nivelatual", claID).Scan(&xpColetivo, &nivelAtual)
        if err != nil {
            return nil, err
        }

        // Determinar o novo nível do clã
        novoNivel := 1
        if xpColetivo >= 100 {
            novoNivel = 5
            levelRequirement := 100
            for lvl := 5; ; lvl++ {
                nextReq := levelRequirement + (lvl * 25)
                if xpColetivo >= nextReq {
                    novoNivel = lvl + 1
                    levelRequirement = nextReq
                } else {
                    break
                }
            }
        } else if xpColetivo >= 60 {
            novoNivel = 4
        } else if xpColetivo >= 30 {
            novoNivel = 3
        } else if xpColetivo >= 10 {
            novoNivel = 2
        }

        if novoNivel > nivelAtual {
            _, err = tx.ExecContext(ctx, "UPDATE Clas SET nivelatual = $1 WHERE id = $2", novoNivel, claID)
            if err != nil {
                return nil, err
            }
        }

        // Atualizar progresso das missões semanais do clã
        year, week := time.Now().ISOWeek()
        semanaAno := fmt.Sprintf("%d-W%02d", year, week)

        if err := incrementQuestProgress(ctx, tx, claID, semanaAno, "Atendimentos", 1); err != nil {
            return nil, err
        }
        if err := incrementQuestProgress(ctx, tx, claID, semanaAno, "XpClã", 1); err != nil {
            return nil, err
        }

        if strings.Contains(strings.ToLower(servicoNome), "corte") {
            if err := incrementQuestProgress(ctx, tx, claID, semanaAno, "Cortes", 1); err != nil {
                return nil, err
            }
        }

        if strings.Contains(strings.ToLower(servicoNome), "barba") {
            if err := incrementQuestProgress(ctx, tx, claID, semanaAno, "Barbas", 1); err != nil {
                return nil, err
            }
        }
    } else if !errors.Is(err, sql.ErrNoRows) {
        return nil, err
    }

    // Atualizar progresso de qualquer Raid ativa
    if err := incrementRaidProgress(ctx, tx, clienteID, servicoNome); err != nil {
        return nil, err
    }

    // --- Início da Lógica de Badges (Cascading Unlocks) ---
    for {
        var totalCortes int
        err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM Agendamentos WHERE clienteid = $1 AND status = 'Concluido'", clienteID).Scan(&totalCortes)
        if err != nil {
            return nil, err
        }

        var xpAtual, nivelAtual, moedas int
        err = tx.QueryRowContext(ctx, "SELECT xpatual, nivelatual, moedas FROM ProgressoCliente WHERE clienteid = $1", clienteID).Scan(&xpAtual, &nivelAtual, &moedas)
        if err != nil {
            return nil, err
        }

        type LockedBadge struct {
            ID             int
            RequisitoTipo  string
            RequisitoValor int
            XpBonus        int
        }

        rowsB, err := tx.QueryContext(ctx, "SELECT id, requisitotipo, requisitovalor, xpbonus FROM Badges WHERE id NOT IN (SELECT badgeid FROM UsuarioBadges WHERE usuarioid = $1)", clienteID)
        if err != nil {
            return nil, err
        }

        var lockedBadges []LockedBadge
        for rowsB.Next() {
            var lb LockedBadge
            if err := rowsB.Scan(&lb.ID, &lb.RequisitoTipo, &lb.RequisitoValor, &lb.XpBonus); err != nil {
                rowsB.Close()
                return nil, err
            }
            lockedBadges = append(lockedBadges, lb)
        }
        rowsB.Close()

        unlockedAny := false
        for _, b := range lockedBadges {
            met := false
            if b.RequisitoTipo == "Cortes" && totalCortes >= b.RequisitoValor {
                met = true
            } else if b.RequisitoTipo == "Nivel" && nivelAtual >= b.RequisitoValor {
                met = true
            }

            if met {
                // 1. Inserir conquista
                _, err = tx.ExecContext(ctx, "INSERT INTO UsuarioBadges (usuarioid, badgeid) VALUES ($1, $2)", clienteID, b.ID)
                if err != nil {
                    return nil, err
                }

                // 2. Adicionar XP e Moedas bonus e atualizar ProgressoCliente
                xpAtual += b.XpBonus
                moedas += b.XpBonus

                calculatedNivel := 1
                for _, l := range niveis {
                    if xpAtual >= l.XpNecessario {
                        calculatedNivel = l.ID
                    }
                }

                var nextXp int = 100
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

                _, err = tx.ExecContext(ctx, "UPDATE ProgressoCliente SET xpatual = $1, nivelatual = $2, barrapercentual = $3, moedas = $4, updatedat = NOW() WHERE clienteid = $5", xpAtual, calculatedNivel, pct, moedas, clienteID)
                if err != nil {
                    return nil, err
                }

                unlockedAny = true
                break // Recomeçar laço para verificar novos requisitos com estatísticas atualizadas
            }
        }

        if !unlockedAny {
            break
        }
    }
    // --- Fim da Lógica de Badges ---

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
	query := `SELECT id, nome, COALESCE(foto_url, ''), COALESCE(avaliacao_media, 5.00), COALESCE(chave_pix, '') FROM Usuarios WHERE cargo IN ('Barbeiro', 'Adm') ORDER BY nome ASC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var barbeiros []domain.Barbeiro
	for rows.Next() {
		var b domain.Barbeiro
		if err := rows.Scan(&b.ID, &b.Nome, &b.FotoURL, &b.AvaliacaoMedia, &b.ChavePix); err != nil {
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
		a.DataHora = time.Date(a.DataHora.Year(), a.DataHora.Month(), a.DataHora.Day(),
			a.DataHora.Hour(), a.DataHora.Minute(), a.DataHora.Second(),
			a.DataHora.Nanosecond(), time.Local)
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
		a.DataHora = time.Date(a.DataHora.Year(), a.DataHora.Month(), a.DataHora.Day(),
			a.DataHora.Hour(), a.DataHora.Minute(), a.DataHora.Second(),
			a.DataHora.Nanosecond(), time.Local)
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
		a.DataHora = time.Date(a.DataHora.Year(), a.DataHora.Month(), a.DataHora.Day(),
			a.DataHora.Hour(), a.DataHora.Minute(), a.DataHora.Second(),
			a.DataHora.Nanosecond(), time.Local)
		agendamentos = append(agendamentos, a)
	}
	return agendamentos, nil
}

func (r *ClientePgRepository) ObterConfiguracoes() (*domain.Configuracoes, error) {
	var cfg domain.Configuracoes
	query := "SELECT id, COALESCE(ChaveAPIWhatsApp, ''), COALESCE(UrlWebhook, ''), COALESCE(TokenValidacao, '') FROM Configuracoes ORDER BY id ASC LIMIT 1"
	err := r.db.QueryRow(query).Scan(&cfg.ID, &cfg.ChaveAPIWhatsApp, &cfg.UrlWebhook, &cfg.TokenValidacao)
	if err != nil {
		if err == sql.ErrNoRows {
			insertQuery := "INSERT INTO Configuracoes (ChaveAPIWhatsApp, UrlWebhook, TokenValidacao) VALUES ('', '', '') RETURNING id"
			err = r.db.QueryRow(insertQuery).Scan(&cfg.ID)
			if err != nil {
				return nil, err
			}
			cfg.ChaveAPIWhatsApp = ""
			cfg.UrlWebhook = ""
			cfg.TokenValidacao = ""
			return &cfg, nil
		}
		return nil, err
	}
	return &cfg, nil
}

func (r *ClientePgRepository) SalvarConfiguracoes(cfg *domain.Configuracoes) error {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM Configuracoes").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		query := "INSERT INTO Configuracoes (ChaveAPIWhatsApp, UrlWebhook, TokenValidacao) VALUES ($1, $2, $3)"
		_, err = r.db.Exec(query, cfg.ChaveAPIWhatsApp, cfg.UrlWebhook, cfg.TokenValidacao)
	} else {
		query := "UPDATE Configuracoes SET ChaveAPIWhatsApp = $1, UrlWebhook = $2, TokenValidacao = $3 WHERE id = (SELECT id FROM Configuracoes ORDER BY id ASC LIMIT 1)"
		_, err = r.db.Exec(query, cfg.ChaveAPIWhatsApp, cfg.UrlWebhook, cfg.TokenValidacao)
	}
	return err
}

func (r *ClientePgRepository) BuscarClientePorTelefone(telefone string) (*domain.Cliente, error) {
	cleanPhone := telefone
	if len(cleanPhone) > 0 && cleanPhone[0] == '+' {
		cleanPhone = cleanPhone[1:]
	}

	var c domain.Cliente
	query := `
		SELECT u.id, u.nome, u.login, u.cargo, 
		       COALESCE(p.xpatual, 0) as xp, 
		       COALESCE(p.nivelatual, 1) as nivel, 
		       COALESCE(p.barrapercentual, 0.0) as barra_percentual, 
		       COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel,
		       COALESCE(u.avatar_url, '') as avatar_url,
		       COALESCE(p.moedas, 0) as moedas,
		       COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Moldura' LIMIT 1), '') as moldura_equipada,
		       COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Background' LIMIT 1), '') as fundo_equipado,
		       COALESCE((SELECT styleclass FROM UsuarioItens ui JOIN ItensLoja i ON ui.itemid = i.id WHERE ui.usuarioid = u.id AND ui.equipado = TRUE AND i.tipoitem = 'Efeito' LIMIT 1), '') as efeito_equipado
		FROM Usuarios u
		LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
		LEFT JOIN Niveis n ON p.nivelatual = n.id
		WHERE (u.login = $1 OR u.login = $2) AND u.cargo = 'Cliente'
		LIMIT 1
	`
	err := r.db.QueryRow(query, telefone, cleanPhone).Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel, &c.AvatarURL, &c.Moedas, &c.MolduraEquipada, &c.FundoEquipado, &c.EfeitoEquipado)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ClientePgRepository) RegistrarMensagemProcessada(messageID string) (bool, error) {
	query := `INSERT INTO MensagensProcessadas (MessageID) VALUES ($1) ON CONFLICT DO NOTHING`
	res, err := r.db.Exec(query, messageID)
	if err != nil {
		return false, err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rowsAffected > 0, nil
}

func (r *ClientePgRepository) CriarServico(s *domain.Servico) (int, error) {
	query := `INSERT INTO Servicos (nome, preco, xprecompensa, duracaominutos) VALUES ($1, $2, $3, $4) RETURNING id`
	var id int
	err := r.db.QueryRow(query, s.Nome, s.Preco, s.XpRecompensa, s.DuracaoMinutos).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *ClientePgRepository) AtualizarServico(s *domain.Servico) error {
	query := `UPDATE Servicos SET nome = $1, preco = $2, xprecompensa = $3, duracaominutos = $4 WHERE id = $5`
	_, err := r.db.Exec(query, s.Nome, s.Preco, s.XpRecompensa, s.DuracaoMinutos, s.ID)
	return err
}

func (r *ClientePgRepository) DeletarServico(id int) error {
	query := `DELETE FROM Servicos WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func incrementQuestProgress(ctx context.Context, tx *sql.Tx, claID int, semanaAno, tipoRequisito string, incremento int) error {
	queryActive := `
		SELECT m.id, m.meta, m.xpbonus, COALESCE(p.progresso, 0), COALESCE(p.completada, FALSE)
		FROM ClaMissoesSemanais s
		JOIN ClaMissoes m ON s.missaoid = m.id
		LEFT JOIN ClaMissoesProgresso p ON s.missaoid = p.missaoid AND p.claid = $1 AND p.semanaano = $2
		WHERE s.semanaano = $2 AND m.tiporequisito = $3
	`
	rows, err := tx.QueryContext(ctx, queryActive, claID, semanaAno, tipoRequisito)
	if err != nil {
		return err
	}
	defer rows.Close()

	type questState struct {
		id         int
		meta       int
		xpBonus    int
		progresso  int
		completada bool
	}
	var quests []questState
	for rows.Next() {
		var q questState
		if err := rows.Scan(&q.id, &q.meta, &q.xpBonus, &q.progresso, &q.completada); err != nil {
			return err
		}
		quests = append(quests, q)
	}
	rows.Close()

	for _, q := range quests {
		if q.completada {
			continue
		}

		novoProgresso := q.progresso + incremento
		completou := false
		if novoProgresso >= q.meta {
			novoProgresso = q.meta
			completou = true
		}

		var exists bool
		err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM ClaMissoesProgresso WHERE claid = $1 AND missaoid = $2 AND semanaano = $3)", claID, q.id, semanaAno).Scan(&exists)
		if err != nil {
			return err
		}

		if exists {
			if completou {
				_, err = tx.ExecContext(ctx, "UPDATE ClaMissoesProgresso SET progresso = $1, completada = TRUE, completadaem = NOW() WHERE claid = $2 AND missaoid = $3 AND semanaano = $4", novoProgresso, claID, q.id, semanaAno)
			} else {
				_, err = tx.ExecContext(ctx, "UPDATE ClaMissoesProgresso SET progresso = $1 WHERE claid = $2 AND missaoid = $3 AND semanaano = $4", novoProgresso, claID, q.id, semanaAno)
			}
		} else {
			if completou {
				_, err = tx.ExecContext(ctx, "INSERT INTO ClaMissoesProgresso (claid, missaoid, semanaano, progresso, completada, completadaem) VALUES ($1, $2, $3, $4, TRUE, NOW())", claID, q.id, semanaAno, novoProgresso)
			} else {
				_, err = tx.ExecContext(ctx, "INSERT INTO ClaMissoesProgresso (claid, missaoid, semanaano, progresso) VALUES ($1, $2, $3, $4)", claID, q.id, semanaAno, novoProgresso)
			}
		}
		if err != nil {
			return err
		}

		if completou {
			var xpColetivo, nivelAtual int
			err = tx.QueryRowContext(ctx, "UPDATE Clas SET xpcoletivo = xpcoletivo + $1 WHERE id = $2 RETURNING xpcoletivo, nivelatual", q.xpBonus, claID).Scan(&xpColetivo, &nivelAtual)
			if err != nil {
				return err
			}

			novoNivel := 1
			if xpColetivo >= 100 {
				novoNivel = 5
				levelRequirement := 100
				for lvl := 5; ; lvl++ {
					nextReq := levelRequirement + (lvl * 25)
					if xpColetivo >= nextReq {
						novoNivel = lvl + 1
						levelRequirement = nextReq
					} else {
						break
					}
				}
			} else if xpColetivo >= 60 {
				novoNivel = 4
			} else if xpColetivo >= 30 {
				novoNivel = 3
			} else if xpColetivo >= 10 {
				novoNivel = 2
			}

			if novoNivel > nivelAtual {
				_, err = tx.ExecContext(ctx, "UPDATE Clas SET nivelatual = $1 WHERE id = $2", novoNivel, claID)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func incrementRaidProgress(ctx context.Context, tx *sql.Tx, clienteID int, servicoNome string) error {
	query := `
		SELECT id, meta, progresso, tiporequisito
		FROM Raids
		WHERE status = 'Ativo' AND NOW() BETWEEN datainicio AND datafim
	`
	rows, err := tx.QueryContext(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	type raidState struct {
		id            int
		meta          int
		progresso     int
		tipoRequisito string
	}
	var raids []raidState
	for rows.Next() {
		var r raidState
		if err := rows.Scan(&r.id, &r.meta, &r.progresso, &r.tipoRequisito); err != nil {
			return err
		}
		raids = append(raids, r)
	}
	rows.Close()

	for _, r := range raids {
		compativel := false
		reqLower := strings.ToLower(r.tipoRequisito)
		servLower := strings.ToLower(servicoNome)

		if reqLower == "atendimentos" {
			compativel = true
		} else if reqLower == "cortes" && strings.Contains(servLower, "corte") {
			compativel = true
		} else if reqLower == "barbas" && strings.Contains(servLower, "barba") {
			compativel = true
		}

		if !compativel {
			continue
		}

		novoProgresso := r.progresso + 1
		novoStatus := "Ativo"
		if novoProgresso >= r.meta {
			novoProgresso = r.meta
			novoStatus = "Concluido"
		}

		_, err = tx.ExecContext(ctx, "UPDATE Raids SET progresso = $1, status = $2 WHERE id = $3", novoProgresso, novoStatus, r.id)
		if err != nil {
			return err
		}

		var exists bool
		err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM RaidContribuicoes WHERE raidid = $1 AND usuarioid = $2)", r.id, clienteID).Scan(&exists)
		if err != nil {
			return err
		}

		if exists {
			_, err = tx.ExecContext(ctx, "UPDATE RaidContribuicoes SET contribuicao = contribuicao + 1 WHERE raidid = $1 AND usuarioid = $2", r.id, clienteID)
		} else {
			_, err = tx.ExecContext(ctx, "INSERT INTO RaidContribuicoes (raidid, usuarioid, contribuicao) VALUES ($1, $2, 1)", r.id, clienteID)
		}
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *ClientePgRepository) ObterDisponibilidadeBarbeiro(barbeiroID int) ([]domain.BarbeiroDisponibilidade, error) {
	query := `
		SELECT id, barbeiroid, diasemana, trabalha, 
		       to_char(horainicio, 'HH24:MI') as horainicio, 
		       to_char(horafim, 'HH24:MI') as horafim
		FROM BarbeiroDisponibilidade
		WHERE barbeiroid = $1
		ORDER BY diasemana
	`
	rows, err := r.db.Query(query, barbeiroID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var disps []domain.BarbeiroDisponibilidade
	for rows.Next() {
		var d domain.BarbeiroDisponibilidade
		err := rows.Scan(&d.ID, &d.BarbeiroID, &d.DiaSemana, &d.Trabalha, &d.HoraInicio, &d.HoraFim)
		if err != nil {
			return nil, err
		}
		disps = append(disps, d)
	}

	// Se não houver registros, criar os padrões (todos os dias trabalham por padrão)
	if len(disps) == 0 {
		disps = make([]domain.BarbeiroDisponibilidade, 7)
		for i := 0; i < 7; i++ {
			trabalha := true // Todos os dias trabalham por padrão para facilidade de testes
			disps[i] = domain.BarbeiroDisponibilidade{
				BarbeiroID: barbeiroID,
				DiaSemana:  i,
				Trabalha:   trabalha,
				HoraInicio: "09:00",
				HoraFim:    "19:00",
			}
		}
	}

	return disps, nil
}

func (r *ClientePgRepository) SalvarDisponibilidadeBarbeiro(barbeiroID int, disps []domain.BarbeiroDisponibilidade) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO BarbeiroDisponibilidade (barbeiroid, diasemana, trabalha, horainicio, horafim)
		VALUES ($1, $2, $3, $4::time, $5::time)
		ON CONFLICT (barbeiroid, diasemana) 
		DO UPDATE SET trabalha = EXCLUDED.trabalha, horainicio = EXCLUDED.horainicio, horafim = EXCLUDED.horafim
	`
	for _, d := range disps {
		_, err := tx.Exec(query, barbeiroID, d.DiaSemana, d.Trabalha, d.HoraInicio, d.HoraFim)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *ClientePgRepository) ObterBloqueiosBarbeiro(barbeiroID int) ([]domain.BarbeiroBloqueio, error) {
	query := `
		SELECT id, barbeiroid, to_char(databloqueio, 'YYYY-MM-DD') as databloqueio, COALESCE(motivo, '') as motivo
		FROM BarbeiroBloqueios
		WHERE barbeiroid = $1
		ORDER BY databloqueio
	`
	rows, err := r.db.Query(query, barbeiroID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bloqueios []domain.BarbeiroBloqueio
	for rows.Next() {
		var b domain.BarbeiroBloqueio
		err := rows.Scan(&b.ID, &b.BarbeiroID, &b.DataBloqueio, &b.Motivo)
		if err != nil {
			return nil, err
		}
		bloqueios = append(bloqueios, b)
	}
	return bloqueios, nil
}

func (r *ClientePgRepository) AdicionarBloqueioBarbeiro(barbeiroID int, data string, motivo string) error {
	query := `
		INSERT INTO BarbeiroBloqueios (barbeiroid, databloqueio, motivo)
		VALUES ($1, $2::date, $3)
		ON CONFLICT (barbeiroid, databloqueio) 
		DO UPDATE SET motivo = EXCLUDED.motivo
	`
	_, err := r.db.Exec(query, barbeiroID, data, motivo)
	return err
}

func (r *ClientePgRepository) RemoverBloqueioBarbeiro(barbeiroID int, data string) error {
	query := `
		DELETE FROM BarbeiroBloqueios
		WHERE barbeiroid = $1 AND databloqueio = $2::date
	`
	_, err := r.db.Exec(query, barbeiroID, data)
	return err
}

func (r *ClientePgRepository) SalvarChavePixBarbeiro(barbeiroID int, chavePix string) error {
	query := `UPDATE Usuarios SET chave_pix = $1 WHERE id = $2`
	_, err := r.db.Exec(query, chavePix, barbeiroID)
	return err
}

func (r *ClientePgRepository) CriarGorjeta(g *domain.Gorjeta) (int, error) {
	query := `
		INSERT INTO Gorjetas (agendamentoid, clienteid, barbeiroid, valor, chavepix, pixcopiaecola, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	var id int
	err := r.db.QueryRow(query, g.AgendamentoID, g.ClienteID, g.BarbeiroID, g.Valor, g.ChavePix, g.PixCopiaECola, g.Status).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *ClientePgRepository) ConfirmarPagamentoGorjeta(id int) error {
	query := `UPDATE Gorjetas SET status = 'Pago', pagoem = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *ClientePgRepository) ObterGorjetasDoBarbeiro(barbeiroID int) ([]domain.Gorjeta, error) {
	query := `
		SELECT id, agendamentoid, clienteid, barbeiroid, valor, chavepix, pixcopiaecola, status, criadoem, pagoem
		FROM Gorjetas
		WHERE barbeiroid = $1
		ORDER BY criadoem DESC
	`
	rows, err := r.db.Query(query, barbeiroID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var gorjetas []domain.Gorjeta
	for rows.Next() {
		var g domain.Gorjeta
		var pagoEmNull sql.NullTime
		var agendamentoIDNull, clienteIDNull sql.NullInt64
		err := rows.Scan(&g.ID, &agendamentoIDNull, &clienteIDNull, &g.BarbeiroID, &g.Valor, &g.ChavePix, &g.PixCopiaECola, &g.Status, &g.CriadoEm, &pagoEmNull)
		if err != nil {
			return nil, err
		}
		if agendamentoIDNull.Valid {
			v := int(agendamentoIDNull.Int64)
			g.AgendamentoID = &v
		}
		if clienteIDNull.Valid {
			v := int(clienteIDNull.Int64)
			g.ClienteID = &v
		}
		if pagoEmNull.Valid {
			g.PagoEm = &pagoEmNull.Time
		}
		gorjetas = append(gorjetas, g)
	}
	return gorjetas, nil
}




