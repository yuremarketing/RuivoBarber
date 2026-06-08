package repositories

import (
    "database/sql"
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
