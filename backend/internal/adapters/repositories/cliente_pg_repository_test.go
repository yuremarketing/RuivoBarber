package repositories

import (
	"context"

	"database/sql"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func setupTestDB(t *testing.T) *sql.DB {
	// Try to get DB config from env (useful when running inside Docker)
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost" // fallback if mapped
	}
	connStr := fmt.Sprintf("host=%s port=5432 user=admin password=secretpassword dbname=ruivobarber sslmode=disable", host)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("Failed to open DB: %v", err)
	}
	
	// Wait for DB to be ready
	for i := 0; i < 5; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}

	if err != nil {
		t.Skipf("Skipping DB test: %v", err)
	}

	// Clean up and seed required data
	_, err = db.Exec(`
		DELETE FROM MlopsAgendamentoMetadata;
		DELETE FROM Agendamentos;
		DELETE FROM Servicos;
		DELETE FROM Usuarios;
	`)
	if err != nil {
		t.Fatalf("Failed to clean tables: %v", err)
	}

	// Insert test data
	_, err = db.Exec(`
		INSERT INTO Usuarios (id, nome, login, senha, cargo) VALUES 
		(1, 'Cliente Teste', 'c1', '123', 'Cliente'),
		(2, 'Barbeiro Teste', 'b1', '123', 'Barbeiro');
		
		INSERT INTO Servicos (id, nome, preco, duracaominutos, xprecompensa) VALUES 
		(1, 'Corte Teste', 50.0, 30, 10);
		
		INSERT INTO BarbeiroDisponibilidade (barbeiroid, diasemana, trabalha, horainicio, horafim) VALUES
		(2, 0, true, '00:00', '23:59'),
		(2, 1, true, '00:00', '23:59'),
		(2, 2, true, '00:00', '23:59'),
		(2, 3, true, '00:00', '23:59'),
		(2, 4, true, '00:00', '23:59'),
		(2, 5, true, '00:00', '23:59'),
		(2, 6, true, '00:00', '23:59');
	`)
	if err != nil {
		t.Fatalf("Failed to seed data: %v", err)
	}

	return db
}

func TestCriarAgendamento_SuccessAndMLOps(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewClientePgRepository(db)

	loc, _ := time.LoadLocation("America/Sao_Paulo")
	// Agendamento para daqui a 24 horas
	dataAgendamento := time.Now().In(loc).Add(24 * time.Hour)

	// Inserir primeiro um corte "Concluido" para gerar histórico de assiduidade
	_, err := db.Exec(`
		INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status)
		VALUES (1, 2, 1, $1, 'Concluido')
	`, time.Now().Add(-48*time.Hour))
	if err != nil {
		t.Fatalf("Failed to setup concluded appointment: %v", err)
	}

	// Executar CriarAgendamento
	_, err = repo.CriarAgendamento(context.Background(), 1, 2, 1, dataAgendamento)
	if err != nil {
		t.Fatalf("Failed to create appointment: %v", err)
	}

	// Validar Tabela Agendamentos
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM Agendamentos WHERE clienteid = 1 AND status = 'Pendente'").Scan(&count)
	if err != nil || count != 1 {
		t.Fatalf("Expected 1 pending appointment, got %d", count)
	}

	// Validar MLOps Metadata
	var (
		tempoAntecedenciaHoras float64
		diaSemana              int
		faixaHoraria           string
		historicoAssiduidade   float64
	)
	err = db.QueryRow(`
		SELECT tempoantecedenciahoras, diasemana, faixahoraria, historicoassiduidadecliente
		FROM MlopsAgendamentoMetadata
		ORDER BY agendamentoid DESC LIMIT 1
	`).Scan(&tempoAntecedenciaHoras, &diaSemana, &faixaHoraria, &historicoAssiduidade)
	
	if err != nil {
		t.Fatalf("Failed to fetch MLOps metadata: %v", err)
	}

	// Antecedência deve ser próxima de 24 horas
	if tempoAntecedenciaHoras < 23.5 || tempoAntecedenciaHoras > 24.5 {
		t.Errorf("Expected tempoAntecedenciaHoras ~24.0, got %f", tempoAntecedenciaHoras)
	}

	if historicoAssiduidade != 1.0 { // Tinha 1 Concluído e 0 Faltas = 1.0 (100%)
		t.Errorf("Expected historicoAssiduidade 1.0, got %f", historicoAssiduidade)
	}
}

func TestCriarAgendamento_ConcurrencyLock(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewClientePgRepository(db)

	loc, _ := time.LoadLocation("America/Sao_Paulo")
	dataAgendamento := time.Now().In(loc).Add(48 * time.Hour)
	// Zera os segundos e nanosegundos para simular o mesmo slot exato
	dataAgendamento = time.Date(dataAgendamento.Year(), dataAgendamento.Month(), dataAgendamento.Day(), 10, 0, 0, 0, loc)

	// Adicionar um segundo cliente para concorrer pelo mesmo horário
	_, _ = db.Exec(`INSERT INTO Usuarios (id, nome, login, senha, cargo) VALUES (3, 'Cliente 2', 'c3', '123', 'Cliente')`)

	var wg sync.WaitGroup
	var mu sync.Mutex
	var errs []error

	// Simula 2 requisições simultâneas
	wg.Add(2)

	go func() {
		defer wg.Done()
		_, err := repo.CriarAgendamento(context.Background(), 1, 2, 1, dataAgendamento)
		if err != nil {
			mu.Lock()
			errs = append(errs, err)
			mu.Unlock()
		}
	}()

	go func() {
		defer wg.Done()
		_, err := repo.CriarAgendamento(context.Background(), 3, 2, 1, dataAgendamento)
		if err != nil {
			mu.Lock()
			errs = append(errs, err)
			mu.Unlock()
		}
	}()

	wg.Wait()

	// 1 deve ter passado, 1 deve ter falhado
	if len(errs) != 1 {
		t.Fatalf("Expected exactly 1 concurrency error, got %d. Errors: %v", len(errs), errs)
	}

	if errs[0].Error() != "conflito de horário: este barbeiro já possui um agendamento neste período" {
		t.Errorf("Expected concurrency error message, got: %v", errs[0])
	}
}
