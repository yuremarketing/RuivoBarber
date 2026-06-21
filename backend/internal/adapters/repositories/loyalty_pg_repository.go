package repositories

import (
	"context"
	"database/sql"
	"errors"
	"time"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type LoyaltyPgRepository struct {
	db *sql.DB
}

func NewLoyaltyPgRepository(db *sql.DB) ports.LoyaltyRepository {
	return &LoyaltyPgRepository{db: db}
}

func (r *LoyaltyPgRepository) ObterCheckInInfo(ctx context.Context, userID int) (streak int, ultimoCheckIn *time.Time, err error) {
	query := "SELECT COALESCE(StreakAtual, 0), UltimoCheckIn FROM ProgressoCliente WHERE ClienteID = $1"
	var uCheck sql.NullTime
	err = r.db.QueryRowContext(ctx, query, userID).Scan(&streak, &uCheck)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil, nil
		}
		return 0, nil, err
	}
	if uCheck.Valid {
		t := time.Date(uCheck.Time.Year(), uCheck.Time.Month(), uCheck.Time.Day(),
			uCheck.Time.Hour(), uCheck.Time.Minute(), uCheck.Time.Second(),
			uCheck.Time.Nanosecond(), time.Local)
		return streak, &t, nil
	}
	return streak, nil, nil
}

func (r *LoyaltyPgRepository) RealizarCheckIn(ctx context.Context, userID int, novoStreak int, xpGanhado, moedasGanhadas int) (*domain.CheckInResponse, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var xpAtual, nivelAtual, moedas int
	var existe bool
	err = tx.QueryRowContext(ctx, "SELECT xpatual, nivelatual, moedas FROM ProgressoCliente WHERE clienteid = $1 FOR UPDATE", userID).Scan(&xpAtual, &nivelAtual, &moedas)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			xpAtual = 0
			nivelAtual = 1
			moedas = 0
			existe = false
		} else {
			return nil, err
		}
	} else {
		existe = true
	}

	xpAtual += xpGanhado
	moedas += moedasGanhadas

	type NivelInfo struct {
		ID           int
		NomeDoNivel  string
		XpNecessario int
	}
	rows, err := tx.QueryContext(ctx, "SELECT id, nomedonivel, xpnecessario FROM Niveis ORDER BY xpnecessario ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var niveis []NivelInfo
	for rows.Next() {
		var n NivelInfo
		if err := rows.Scan(&n.ID, &n.NomeDoNivel, &n.XpNecessario); err != nil {
			return nil, err
		}
		niveis = append(niveis, n)
	}

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

	now := time.Now()
	if existe {
		query := `
			UPDATE ProgressoCliente
			SET xpatual = $1, nivelatual = $2, barrapercentual = $3, moedas = $4, streakatual = $5, ultimocheckin = $6, updatedat = NOW()
			WHERE clienteid = $7
		`
		_, err = tx.ExecContext(ctx, query, xpAtual, calculatedNivel, pct, moedas, novoStreak, now, userID)
	} else {
		query := `
			INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual, moedas, streakatual, ultimocheckin)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`
		_, err = tx.ExecContext(ctx, query, userID, xpAtual, calculatedNivel, pct, moedas, novoStreak, now)
	}
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &domain.CheckInResponse{
		Message:         "Check-in realizado com sucesso!",
		XpGanhado:       xpGanhado,
		MoedasGanhadas:  moedasGanhadas,
		StreakAtual:     novoStreak,
		NovoXp:          xpAtual,
		NovoNivel:       calculatedNivel,
		BarraPercentual: pct,
		UltimoCheckIn:   &now,
	}, nil
}
