-- Migration: Add FotoURL and AvaliacaoMedia to Usuarios table (filtered for cargo = 'Barbeiro')
ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS foto_url VARCHAR(300) DEFAULT '';
ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS avaliacao_media DECIMAL(3,2) DEFAULT 5.00;
