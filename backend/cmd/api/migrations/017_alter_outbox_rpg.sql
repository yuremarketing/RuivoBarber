-- Up
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
