package repositories

import (
	"context"
	"database/sql"
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type ClaPgRepository struct {
	db *sql.DB
}

func NewClaPgRepository(db *sql.DB) ports.ClaRepository {
	return &ClaPgRepository{db: db}
}

func (r *ClaPgRepository) Create(ctx context.Context, cla *domain.Cla) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	queryCla := `
		INSERT INTO Clas (nome, descricao, liderid, xpcoletivo, nivelatual, criadoem)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id, criadoem
	`
	err = tx.QueryRowContext(ctx, queryCla, cla.Nome, cla.Descricao, cla.LiderID, 0, 1).Scan(&cla.ID, &cla.CriadoEm)
	if err != nil {
		return err
	}

	queryMember := `
		INSERT INTO ClaMembros (usuarioid, claid, cargo, dataentrada)
		VALUES ($1, $2, 'Lider', NOW())
	`
	_, err = tx.ExecContext(ctx, queryMember, cla.LiderID, cla.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *ClaPgRepository) FindByID(ctx context.Context, id int) (*domain.Cla, error) {
	var c domain.Cla
	query := "SELECT id, nome, descricao, xpcoletivo, nivelatual, liderid, criadoem FROM Clas WHERE id = $1"
	err := r.db.QueryRowContext(ctx, query, id).Scan(&c.ID, &c.Nome, &c.Descricao, &c.XPColetivo, &c.NivelAtual, &c.LiderID, &c.CriadoEm)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *ClaPgRepository) FindByName(ctx context.Context, name string) (*domain.Cla, error) {
	var c domain.Cla
	query := "SELECT id, nome, descricao, xpcoletivo, nivelatual, liderid, criadoem FROM Clas WHERE nome = $1"
	err := r.db.QueryRowContext(ctx, query, name).Scan(&c.ID, &c.Nome, &c.Descricao, &c.XPColetivo, &c.NivelAtual, &c.LiderID, &c.CriadoEm)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *ClaPgRepository) FindMember(ctx context.Context, userID int) (*domain.ClaMembro, error) {
	var m domain.ClaMembro
	query := "SELECT usuarioid, claid, cargo, dataentrada FROM ClaMembros WHERE usuarioid = $1"
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&m.UsuarioID, &m.ClaID, &m.Cargo, &m.DataEntrada)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

func (r *ClaPgRepository) AddMember(ctx context.Context, member *domain.ClaMembro) error {
	query := `
		INSERT INTO ClaMembros (usuarioid, claid, cargo, dataentrada)
		VALUES ($1, $2, $3, NOW())
	`
	_, err := r.db.ExecContext(ctx, query, member.UsuarioID, member.ClaID, member.Cargo)
	return err
}

func (r *ClaPgRepository) ListMembers(ctx context.Context, claID int) ([]domain.Cliente, error) {
	query := `
		SELECT u.id, u.nome, u.login, u.cargo, 
			   COALESCE(p.xpatual, 0) as xp, 
			   COALESCE(p.nivelatual, 1) as nivel, 
			   COALESCE(p.barrapercentual, 0.0) as barra_percentual, 
			   COALESCE(n.nomedonivel, 'Corte Iniciante') as nome_do_nivel,
			   COALESCE(u.avatar_url, '') as avatar_url
		FROM ClaMembros m
		JOIN Usuarios u ON m.usuarioid = u.id
		LEFT JOIN ProgressoCliente p ON u.id = p.clienteid
		LEFT JOIN Niveis n ON p.nivelatual = n.id
		WHERE m.claid = $1
		ORDER BY CASE WHEN m.cargo = 'Lider' THEN 1 WHEN m.cargo = 'ViceLider' THEN 2 ELSE 3 END, u.nome ASC
	`
	rows, err := r.db.QueryContext(ctx, query, claID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []domain.Cliente
	for rows.Next() {
		var c domain.Cliente
		err := rows.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo, &c.XP, &c.Nivel, &c.BarraPercentual, &c.NomeDoNivel, &c.AvatarURL)
		if err != nil {
			return nil, err
		}
		members = append(members, c)
	}
	return members, nil
}

func (r *ClaPgRepository) CreateInvite(ctx context.Context, claID, convidadoID, enviadoPor int) error {
	query := `
		INSERT INTO ClaConvites (claid, convidadoid, enviadopor, status, criadoem)
		VALUES ($1, $2, $3, 'Pendente', NOW())
		ON CONFLICT (claid, convidadoid) DO UPDATE SET status = 'Pendente', criadoem = NOW()
	`
	_, err := r.db.ExecContext(ctx, query, claID, convidadoID, enviadoPor)
	return err
}

func (r *ClaPgRepository) FindInviteByID(ctx context.Context, inviteID int) (claID, convidadoID int, status string, err error) {
	query := "SELECT claid, convidadoid, status FROM ClaConvites WHERE id = $1"
	err = r.db.QueryRowContext(ctx, query, inviteID).Scan(&claID, &convidadoID, &status)
	return
}

func (r *ClaPgRepository) UpdateInviteStatus(ctx context.Context, inviteID int, status string) error {
	query := "UPDATE ClaConvites SET status = $1 WHERE id = $2"
	_, err := r.db.ExecContext(ctx, query, status, inviteID)
	return err
}

func (r *ClaPgRepository) ListInvitesByConvidadoID(ctx context.Context, convidadoID int) ([]domain.ClaConviteDTO, error) {
	query := `
		SELECT c.id, c.claid, cl.nome as nome_cla, u.nome as enviado_por, c.criadoem
		FROM ClaConvites c
		JOIN Clas cl ON c.claid = cl.id
		JOIN Usuarios u ON c.enviadopor = u.id
		WHERE c.convidadoid = $1 AND c.status = 'Pendente'
		ORDER BY c.criadoem DESC
	`
	rows, err := r.db.QueryContext(ctx, query, convidadoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invites []domain.ClaConviteDTO
	for rows.Next() {
		var i domain.ClaConviteDTO
		err := rows.Scan(&i.ID, &i.ClaID, &i.NomeCla, &i.EnviadoPor, &i.CriadoEm)
		if err != nil {
			return nil, err
		}
		invites = append(invites, i)
	}
	return invites, nil
}
