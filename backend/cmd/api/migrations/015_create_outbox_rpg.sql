-- Migration: 015_create_outbox_rpg
CREATE TABLE IF NOT EXISTS eventos_rpg_outbox (
    id SERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    processado BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_processado ON eventos_rpg_outbox(processado);
