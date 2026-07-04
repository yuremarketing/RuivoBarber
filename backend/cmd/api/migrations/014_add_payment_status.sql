-- Migration: 014_add_payment_status
ALTER TABLE movimentacao_financeira ADD COLUMN gateway_id VARCHAR(255);
ALTER TABLE movimentacao_financeira ADD COLUMN status_pagamento VARCHAR(50) DEFAULT 'approved';
