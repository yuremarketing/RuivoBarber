import os

# 1. Create Migration 017
os.makedirs("backend/cmd/api/migrations", exist_ok=True)
with open("backend/cmd/api/migrations/017_alter_outbox_rpg.sql", "w") as f:
    f.write('''-- Up
ALTER TABLE eventos_rpg_outbox
ADD COLUMN venda_id INT,
ADD COLUMN tenant_id INT,
ADD COLUMN tentativas INT DEFAULT 0,
ADD COLUMN erro_ultimo TEXT;

CREATE TABLE IF NOT EXISTS historico_xp (
    id SERIAL PRIMARY KEY,
    venda_id INT NOT NULL,
    cliente_id INT NOT NULL,
    tenant_id INT NOT NULL,
    xp_concedido INT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_historico_xp_venda ON historico_xp(venda_id);

-- Down
DROP TABLE IF EXISTS historico_xp;
ALTER TABLE eventos_rpg_outbox
DROP COLUMN venda_id,
DROP COLUMN tenant_id,
DROP COLUMN tentativas,
DROP COLUMN erro_ultimo;
''')

# 2. Update pdv_pg_repository.go Outbox Insert to include venda_id and tenant_id
path_pdv = 'backend/internal/adapters/repositories/pdv_pg_repository.go'
with open(path_pdv, 'r') as f:
    content = f.read()

# Replace the existing outbox insert (which only has payload)
outbox_old = '''	if venda.StatusPagamento == "approved" {
		payload := fmt.Sprintf(`{"tipo": "venda_aprovada", "venda_id": %d, "cliente_id": %v}`, venda.ID, ptrToInt(venda.ClienteID))
		_, err = tx.ExecContext(ctx, "INSERT INTO eventos_rpg_outbox (payload) VALUES ($1)", payload)
		if err != nil {
			return err
		}
	}'''

outbox_new = '''	if venda.StatusPagamento == "approved" {
		payload := fmt.Sprintf(`{"tipo": "venda_aprovada", "venda_id": %d, "cliente_id": %v}`, venda.ID, ptrToInt(venda.ClienteID))
		_, err = tx.ExecContext(ctx, "INSERT INTO eventos_rpg_outbox (payload, venda_id, tenant_id) VALUES ($1, $2, $3)", payload, venda.ID, tenantID)
		if err != nil {
			return err
		}
	}'''
content = content.replace(outbox_old, outbox_new)
with open(path_pdv, 'w') as f:
    f.write(content)

# 3. Create worker package and file
os.makedirs("backend/cmd/worker", exist_ok=True)
with open("backend/cmd/worker/rpg_processor.go", "w") as f:
    f.write('''package worker

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
''')

# 4. Patch main.go to start the worker
path_main = 'backend/cmd/api/main.go'
with open(path_main, 'r') as f:
    main_content = f.read()

import_worker = '"ruivobarber-api/cmd/worker"'
if import_worker not in main_content:
    main_content = main_content.replace('"ruivobarber-api/internal/adapters/handlers"', '"ruivobarber-api/cmd/worker"\n\t"ruivobarber-api/internal/adapters/handlers"')

worker_init = '''
	// Start RPG Worker
	rpgWorker := worker.NewRPGProcessor(db)
	rpgWorker.Start(context.Background())
'''
if 'rpgWorker.Start' not in main_content:
    main_content = main_content.replace('// Handlers', worker_init + '\n\t// Handlers')

with open(path_main, 'w') as f:
    f.write(main_content)

print("RPG Worker created and integrated")
