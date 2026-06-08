.PHONY: db-up run-backend run-frontend test clean help

help:
	@echo "Comandos disponíveis:"
	@echo "  make db-up         - Sobe o banco de dados PostgreSQL via Docker Compose"
	@echo "  make run-backend   - Executa o servidor Go localmente"
	@echo "  make run-frontend  - Executa o servidor React localmente"
	@echo "  make test          - Executa testes do backend e build de sanidade do frontend"
	@echo "  make clean         - Limpa contêineres e artefatos de compilação antigos"

db-up:
	docker compose up -d db

run-backend:
	cd backend && go run cmd/api/main.go

run-frontend:
	cd frontend && npm run dev

test:
	@echo "===== Executando Testes do Backend ====="
	cd backend && go test ./...
	@echo "===== Executando Testes de Integração ====="
	./scripts/test_transaction_lock.sh
	./scripts/test_no_show_penalty.sh
	./scripts/test_coupon_redemption.sh
	./scripts/test_coupon_validation.sh
	@echo "===== Executando Sanidade do Frontend (Build) ====="
	cd frontend && npm run build

clean:
	docker compose down -v
	rm -rf backend/main
	rm -rf frontend/dist
