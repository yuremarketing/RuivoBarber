-- Up
ALTER TABLE eventos_rpg_outbox ADD COLUMN dlq BOOLEAN DEFAULT false;
CREATE INDEX idx_outbox_dlq ON eventos_rpg_outbox(dlq);

-- Down
DROP INDEX idx_outbox_dlq;
ALTER TABLE eventos_rpg_outbox DROP COLUMN dlq;
