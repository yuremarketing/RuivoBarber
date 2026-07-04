-- Migration: Add Payment Configuration Fields
-- Descrição: Adiciona controle de gateways e ativação de métodos de pagamento.

ALTER TABLE Configuracoes ADD COLUMN IF NOT EXISTS AceitaDinheiro BOOLEAN DEFAULT TRUE;
ALTER TABLE Configuracoes ADD COLUMN IF NOT EXISTS AceitaPix BOOLEAN DEFAULT TRUE;
ALTER TABLE Configuracoes ADD COLUMN IF NOT EXISTS AceitaCartao BOOLEAN DEFAULT TRUE;
ALTER TABLE Configuracoes ADD COLUMN IF NOT EXISTS ChavePix VARCHAR(255) DEFAULT '';
ALTER TABLE Configuracoes ADD COLUMN IF NOT EXISTS MercadoPagoToken VARCHAR(255) DEFAULT '';
