import os

# 1. Migration for DLQ
os.makedirs("backend/cmd/api/migrations", exist_ok=True)
with open("backend/cmd/api/migrations/018_add_dlq_to_outbox.sql", "w") as f:
    f.write('''-- Up
ALTER TABLE eventos_rpg_outbox ADD COLUMN dlq BOOLEAN DEFAULT false;
CREATE INDEX idx_outbox_dlq ON eventos_rpg_outbox(dlq);

-- Down
DROP INDEX idx_outbox_dlq;
ALTER TABLE eventos_rpg_outbox DROP COLUMN dlq;
''')

# 2. Update rpg_processor.go
worker_code = '''package worker

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

type RPGProcessor struct {
	db *sql.DB
	wg sync.WaitGroup
}

func NewRPGProcessor(db *sql.DB) *RPGProcessor {
	return &RPGProcessor{db: db}
}

func (p *RPGProcessor) Start(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	p.wg.Add(1)
	go func() {
		defer p.wg.Done()
		for {
			select {
			case <-ctx.Done():
				log.Println("[RPG_PROCESSOR] Recebeu sinal de shutdown. Parando loop...")
				ticker.Stop()
				return
			case <-ticker.C:
				p.processBatch(ctx)
			}
		}
	}()
}

func (p *RPGProcessor) Wait() {
	p.wg.Wait()
	log.Println("[RPG_PROCESSOR] Encerrado com segurança.")
}

type OutboxEvent struct {
	ID       int
	VendaID  int
	TenantID int
	Payload  string
}

func (p *RPGProcessor) processBatch(ctx context.Context) {
	// Recover to prevent panic from crashing the worker batch entirely
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RPG_PROCESSOR] [CRITICAL] Recovered from panic in processBatch: %v", r)
		}
	}()

	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("[RPG_PROCESSOR] Erro ao iniciar tx: %v", err)
		return
	}
	defer tx.Rollback()

	// Select FOR UPDATE SKIP LOCKED
	query := `
		SELECT id, venda_id, tenant_id, payload
		FROM eventos_rpg_outbox
		WHERE processado = false AND dlq = false
		ORDER BY id
		FOR UPDATE SKIP LOCKED
		LIMIT 10;
	`
	rows, err := tx.QueryContext(ctx, query)
	if err != nil {
		log.Printf("[RPG_PROCESSOR] Erro na query: %v", err)
		return
	}
	
	var events []OutboxEvent
	for rows.Next() {
		var e OutboxEvent
		var vID sql.NullInt64
		var tID sql.NullInt64
		if err := rows.Scan(&e.ID, &vID, &tID, &e.Payload); err != nil {
			log.Printf("[RPG_PROCESSOR] Erro no scan (ignorado): %v", err)
			continue
		}
		if vID.Valid { e.VendaID = int(vID.Int64) }
		if tID.Valid { e.TenantID = int(tID.Int64) }
		events = append(events, e)
	}
	rows.Close()

	if len(events) > 0 {
		log.Printf("[RPG_PROCESSOR] Iniciando processamento de lote com %d eventos", len(events))
	}

	for _, e := range events {
		err := p.safeProcessEvent(ctx, tx, e)
		if err != nil {
			log.Printf("[RPG_PROCESSOR] [RETRY] Erro no evento %d: %v", e.ID, err)
			// Increment tentativas and check if should send to DLQ
			_, _ = tx.ExecContext(ctx, `
				UPDATE eventos_rpg_outbox 
				SET tentativas = tentativas + 1, 
					erro_ultimo = $1,
					dlq = CASE WHEN tentativas + 1 >= 3 THEN true ELSE false END
				WHERE id = $2
			`, err.Error(), e.ID)

			// Log DLQ entry if applicable
			var dlq bool
			_ = tx.QueryRowContext(ctx, "SELECT dlq FROM eventos_rpg_outbox WHERE id = $1", e.ID).Scan(&dlq)
			if dlq {
				log.Printf("[RPG_PROCESSOR] [DLQ] Evento %d movido para DLQ após falhas sucessivas", e.ID)
			}
		} else {
			_, _ = tx.ExecContext(ctx, "UPDATE eventos_rpg_outbox SET processado = true, erro_ultimo = NULL WHERE id = $1", e.ID)
		}
	}

	err = tx.Commit()
	if err != nil {
		log.Printf("[RPG_PROCESSOR] Erro no commit: %v", err)
	}
}

func (p *RPGProcessor) safeProcessEvent(ctx context.Context, tx *sql.Tx, e OutboxEvent) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic recover: %v", r)
			log.Printf("[RPG_PROCESSOR] [RECOVER] Panic no evento %d isolado: %v", e.ID, r)
		}
	}()
	return p.processEvent(ctx, tx, e)
}

func (p *RPGProcessor) processEvent(ctx context.Context, tx *sql.Tx, e OutboxEvent) error {
	var payload struct {
		Tipo      string      `json:"tipo"`
		VendaID   int         `json:"venda_id"`
		ClienteID interface{} `json:"cliente_id"`
	}
	if err := json.Unmarshal([]byte(e.Payload), &payload); err != nil {
		return fmt.Errorf("poison pill - invalid json: %w", err)
	}

	if payload.Tipo != "venda_aprovada" {
		return nil
	}

	vendaID := e.VendaID
	if vendaID == 0 {
		vendaID = payload.VendaID
	}
	if vendaID == 0 {
		return fmt.Errorf("poison pill - venda_id ausente")
	}

	var exists int
	err := tx.QueryRowContext(ctx, "SELECT 1 FROM historico_xp WHERE venda_id = $1", vendaID).Scan(&exists)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("erro ao verificar idempotência: %w", err)
	}
	if exists == 1 {
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
		return nil
	}

	xpConcedido := 10
	tenantID := e.TenantID
	if tenantID == 0 {
		tenantID = 1
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
'''

with open("backend/cmd/worker/rpg_processor.go", "w") as f:
    f.write(worker_code)


# 3. Update main.go for graceful shutdown
path_main = 'backend/cmd/api/main.go'
with open(path_main, 'r') as f:
    main_content = f.read()

# Replace worker init
worker_old = '''	// Start RPG Worker
	rpgWorker := worker.NewRPGProcessor(db)
	rpgWorker.Start(context.Background())'''
    
worker_new = '''	// Start RPG Worker with Graceful Shutdown context
	workerCtx, workerCancel := context.WithCancel(context.Background())
	rpgWorker := worker.NewRPGProcessor(db)
	rpgWorker.Start(workerCtx)'''
main_content = main_content.replace(worker_old, worker_new)

# Add graceful shutdown logic
shutdown_logic = '''
    // Graceful Shutdown Channel
    c := make(chan os.Signal, 1)
    signal.Notify(c, os.Interrupt, syscall.SIGTERM)

    go func() {
        <-c
        log.Println("Gracefully shutting down...")
        workerCancel()
        rpgWorker.Wait()
        _ = app.Shutdown()
    }()

    log.Printf("Server rodando na porta %s", port)
    err = app.Listen(":" + port)
    if err != nil {
        log.Fatalf("Erro ao iniciar server: %v", err)
    }
}
'''
main_content = main_content.replace('''
    log.Printf("Server rodando na porta %s", port)
    err = app.Listen(":" + port)
    if err != nil {
        log.Fatalf("Erro ao iniciar server: %v", err)
    }
}''', shutdown_logic)

if '"os/signal"' not in main_content:
    main_content = main_content.replace('import (', 'import (\n\t"os/signal"\n\t"syscall"\n', 1)

with open(path_main, 'w') as f:
    f.write(main_content)

print("Robust worker setup complete")
