-- Add LGPD fields to Usuarios
ALTER TABLE Usuarios 
ADD COLUMN IF NOT EXISTS lgpdaceito BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lgpdaceitoem TIMESTAMPTZ;

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS LogsAuditoria (
    id SERIAL PRIMARY KEY,
    usuarioid INT REFERENCES Usuarios(id) ON DELETE SET NULL, -- Who performed the action
    alvoid INT, -- Optional: Who the action was performed upon (e.g. client ID)
    acao VARCHAR(150) NOT NULL, 
    detalhes TEXT,              
    criadoem TIMESTAMPTZ DEFAULT NOW()
);
