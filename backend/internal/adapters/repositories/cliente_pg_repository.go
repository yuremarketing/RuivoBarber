package repositories

import (
    "context"
    "database/sql"
    "errors"
    "ruivobarber-api/internal/core/domain"
)

type ClientePgRepository struct {
    db *sql.DB
}

func NewClientePgRepository(db *sql.DB) *ClientePgRepository {
    return &ClientePgRepository{db: db}
}

func (r *ClientePgRepository) FindAll() ([]domain.Cliente, error) {
    query := `
        SELECT u.id, u.nome, u.login, u.cargo, COALESCE(p.xpatual, 0) as xp, COALESCE(n.nomedonivel, 'Corte Iniciante') as nivel
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
        err := rows.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel)
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
        SELECT u.id, u.nome, u.login, u.cargo, COALESCE(p.xpatual, 0) as xp, COALESCE(n.nomedonivel, 'Corte Iniciante') as nivel
        FROM Usuarios u
        LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
        LEFT JOIN Niveis n ON p.nivelatual = n.id
        WHERE u.id = $1
    `
    row := r.db.QueryRow(query, id)
    err := row.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel)
    if err != nil {
        return nil, err
    }
    return &c, nil
}

func (r *ClientePgRepository) Save(c *domain.Cliente) error {
    _, err := r.db.Exec(
        "INSERT INTO Usuarios (nome, login, senha, cargo) VALUES ($1, $2, $3, $4)",
        c.Nome, c.Login, "hashed_senha", c.Cargo,
    )
    return err
}

func (r *ClientePgRepository) ConcluirAtendimento(agendamentoID int) error {
    ctx := context.Background()
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // 1. Obter e travar o agendamento (Transaction Lock)
    var clienteID, servicoID int
    var status string
    err = tx.QueryRowContext(ctx, "SELECT clienteid, servicoid, status FROM Agendamentos WHERE id = $1 FOR UPDATE", agendamentoID).Scan(&clienteID, &servicoID, &status)
    if err != nil {
        return err
    }

    if status == "Concluido" {
        return errors.New("agendamento já concluído")
    }

    // 2. Obter XP de recompensa do Serviço
    var xpRecompensa int
    err = tx.QueryRowContext(ctx, "SELECT xprecompensa FROM Servicos WHERE id = $1", servicoID).Scan(&xpRecompensa)
    if err != nil {
        return err
    }

    // 3. Buscar produtos associados ao serviço e dar baixa no estoque
    type ServicoProduto struct {
        ProdutoID            int
        QuantidadeNecessaria int
    }
    rows, err := tx.QueryContext(ctx, "SELECT produtoid, quantidadenecessaria FROM ServicoProdutos WHERE servicoid = $1", servicoID)
    if err != nil {
        return err
    }
    defer rows.Close()

    var produtos []ServicoProduto
    for rows.Next() {
        var sp ServicoProduto
        if err := rows.Scan(&sp.ProdutoID, &sp.QuantidadeNecessaria); err != nil {
            return err
        }
        produtos = append(produtos, sp)
    }

    for _, p := range produtos {
        _, err = tx.ExecContext(ctx, "UPDATE Produtos SET quantidade = quantidade - $1 WHERE id = $2", p.QuantidadeNecessaria, p.ProdutoID)
        if err != nil {
            // Se falhar (ex: quantidade < 0 CHECK constraint), a transação falha e o rollback é executado.
            return err
        }
    }

    // 4. Atualizar status do agendamento
    _, err = tx.ExecContext(ctx, "UPDATE Agendamentos SET status = 'Concluido' WHERE id = $1", agendamentoID)
    if err != nil {
        return err
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
            return err
        }
    } else {
        progressoExiste = true
    }

    xpAtual += xpRecompensa

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
