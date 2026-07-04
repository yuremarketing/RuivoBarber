package repositories

import (
	"context"
	"database/sql"
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type QueuePgRepository struct {
	db *sql.DB
}

func NewQueuePgRepository(db *sql.DB) ports.QueueRepository {
	return &QueuePgRepository{db: db}
}

func (r *QueuePgRepository) RegistrarCheckIn(ctx context.Context, agendamentoID int) (int, error) {
	query := `
		UPDATE Agendamentos
		SET Status = 'Presente', CheckInTime = NOW()
		WHERE ID = $1 AND Status IN ('Confirmado', 'Pendente')
		RETURNING BarbeiroID
	`
	var barbeiroID int
	err := r.db.QueryRowContext(ctx, query, agendamentoID).Scan(&barbeiroID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, errors.New("agendamento não encontrado ou em status inválido para check-in")
		}
		return 0, err
	}
	return barbeiroID, nil
}

func (r *QueuePgRepository) RegistrarEmCadeira(ctx context.Context, agendamentoID int) error {
	query := `
		UPDATE Agendamentos
		SET Status = 'EmCadeira', EmCadeiraTime = NOW()
		WHERE ID = $1 AND Status = 'Presente'
	`
	res, err := r.db.ExecContext(ctx, query, agendamentoID)
	if err != nil {
		return err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("agendamento não encontrado ou não está com status 'Presente'")
	}
	return nil
}

func (r *QueuePgRepository) ObterMetricas(ctx context.Context, barbeiroID *int) (*domain.QueueMetrics, error) {
	query := `
		SELECT 
			COALESCE(AVG(EXTRACT(EPOCH FROM (EmCadeiraTime - CheckInTime)) / 60.0), 0.0) as avg_wait,
			COALESCE(AVG(EXTRACT(EPOCH FROM (ConcluidoTime - EmCadeiraTime)) / 60.0), 0.0) as avg_service,
			COUNT(*) as total_concluidos
		FROM Agendamentos
		WHERE Status = 'Concluido' 
		  AND CheckInTime IS NOT NULL 
		  AND EmCadeiraTime IS NOT NULL 
		  AND ConcluidoTime IS NOT NULL
	`

	var args []interface{}
	if barbeiroID != nil {
		query += " AND BarbeiroID = $1"
		args = append(args, *barbeiroID)
	}

	var m domain.QueueMetrics
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&m.TempoMedioEsperaMinutos, &m.TempoMedioAtendimentoMinutos, &m.TotalAtendimentosConcluidos)
	if err != nil {
		return nil, err
	}

	return &m, nil
}
