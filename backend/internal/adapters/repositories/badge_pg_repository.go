package repositories

import (
	"context"
	"database/sql"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type BadgePgRepository struct {
	db *sql.DB
}

func NewBadgePgRepository(db *sql.DB) ports.BadgeRepository {
	return &BadgePgRepository{db: db}
}

func (r *BadgePgRepository) ListBadgesWithUnlockStatus(ctx context.Context, userID int) ([]domain.Badge, error) {
	query := `
		SELECT b.id, b.nome, b.descricao, COALESCE(b.iconeurl, '') as iconeurl, 
		       b.requisitotipo, b.requisitovalor, b.xpbonus, b.criadoem,
		       (ub.usuarioid IS NOT NULL) AS desbloqueada,
		       ub.desbloqueadoem
		FROM Badges b
		LEFT JOIN UsuarioBadges ub ON b.id = ub.badgeid AND ub.usuarioid = $1
		ORDER BY b.id ASC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var badges []domain.Badge
	for rows.Next() {
		var b domain.Badge
		var desbloqueadoEm sql.NullTime
		err := rows.Scan(
			&b.ID, &b.Nome, &b.Descricao, &b.IconeURL,
			&b.RequisitoTipo, &b.RequisitoValor, &b.XpBonus, &b.CriadoEm,
			&b.Desbloqueada, &desbloqueadoEm,
		)
		if err != nil {
			return nil, err
		}
		if desbloqueadoEm.Valid {
			b.DesbloqueadaEm = &desbloqueadoEm.Time
		} else {
			b.DesbloqueadaEm = nil
		}
		badges = append(badges, b)
	}

	return badges, nil
}
