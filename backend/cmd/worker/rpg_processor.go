package worker

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

type RPGProcessor struct {
	db *sql.DB
}

func NewRPGProcessor(db *sql.DB) *RPGProcessor {
	return &RPGProcessor{db: db}
}

func (p *RPGProcessor) Start(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				p.processBatch(ctx)
			}
		}
	}()
}

type OutboxEvent struct {
	ID       int
	VendaID  int
	TenantID int
	Payload  string
}

func (p *RPGProcessor) processBatch(ctx context.Context) {
	// Recover to prevent panic from crashing the worker loop
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RPG_PROCESSOR] Recovered from panic: %v", r)
		}
	}()

	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("[RPG_PROCESSOR] Erro ao iniciar tx: %v", err)
		return
	}
	// Always defer rollback, it will be a no-op if committed
	defer tx.Rollback()

	// Select FOR UPDATE SKIP LOCKED
	query := `
		SELECT id, venda_id, tenant_id, payload
		FROM eventos_rpg_outbox
		WHERE processado = false AND tentativas < 3
		ORDER BY id
		FOR UPDATE SKIP LOCKED
		LIMIT 10;
	`
	rows, err := tx.QueryContext(ctx, query)
	if err != nil {
		log.Printf("[RPG_PROCESSOR] Erro na query: %v", err)
		return
	}
	defer rows.Close()

	var events []OutboxEvent
	for rows.Next() {
		var e OutboxEvent
		var vID sql.NullInt64
		var tID sql.NullInt64
		
		if err := rows.Scan(&e.ID, &vID, &tID, &e.Payload); err != nil {
			log.Printf("[RPG_PROCESSOR] Erro no scan: %v", err)
			continue
		}
		if vID.Valid { e.VendaID = int(vID.Int64) }
		if tID.Valid { e.TenantID = int(tID.Int64) }
		events = append(events, e)
	}
	rows.Close() // Close early to free connection resources

	for _, e := range events {
		err := p.processEvent(ctx, tx, e)
		if err != nil {
			// Increment tentativas and set erro_ultimo
			log.Printf("[RPG_PROCESSOR] Erro no evento %d: %v", e.ID, err)
			_, _ = tx.ExecContext(ctx, "UPDATE eventos_rpg_outbox SET tentativas = tentativas + 1, erro_ultimo = $1 WHERE id = $2", err.Error(), e.ID)
		} else {
			// Mark as processed
			_, _ = tx.ExecContext(ctx, "UPDATE eventos_rpg_outbox SET processado = true, erro_ultimo = NULL WHERE id = $1", e.ID)
		}
	}

	err = tx.Commit()
	if err != nil {
		log.Printf("[RPG_PROCESSOR] Erro no commit: %v", err)
	}
}

func (p *RPGProcessor) processEvent(ctx context.Context, tx *sql.Tx, e OutboxEvent) error {
	// Parse payload
	var payload struct {
		Tipo      string      `json:"tipo"`
		VendaID   int         `json:"venda_id"`
		ClienteID interface{} `json:"cliente_id"`
	}
	if err := json.Unmarshal([]byte(e.Payload), &payload); err != nil {
		return fmt.Errorf("poison pill - invalid json: %w", err)
	}

	if payload.Tipo != "venda_aprovada" {
		return nil // Ignorar tipos não mapeados
	}

	// Se venda_id não estiver na tabela, pegamos do payload
	vendaID := e.VendaID
	if vendaID == 0 {
		vendaID = payload.VendaID
	}
	if vendaID == 0 {
		return fmt.Errorf("poison pill - venda_id ausente")
	}

	// Idempotência
	var exists int
	err := tx.QueryRowContext(ctx, "SELECT 1 FROM historico_xp WHERE venda_id = $1", vendaID).Scan(&exists)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("erro ao verificar idempotência: %w", err)
	}
	if exists == 1 {
		// Já processado
		return nil
	}

	clienteID := 0
	switch v := payload.ClienteID.(type) {
	case float64:
		clienteID = int(v)
	case int:
		clienteID = v
	}

	if clienteID == 0 {
		// Venda sem cliente, não ganha XP
		return nil
	}

	// Calcular XP (Exemplo: 10 XP fixo por venda)
	xpConcedido := 10
	tenantID := e.TenantID
	if tenantID == 0 {
		tenantID = 1 // Default fallback
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO historico_xp (venda_id, cliente_id, tenant_id, xp_concedido)
		VALUES ($1, $2, $3, $4)
	`, vendaID, clienteID, tenantID, xpConcedido)
	
	if err != nil {
		return fmt.Errorf("erro ao inserir histórico xp: %w", err)
	}

	return nil
}
