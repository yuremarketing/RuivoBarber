-- Migration: 013_add_tenant_id_to_all

-- Add nullable tenant_id to all main tables
ALTER TABLE clientes ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE barbeiros ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE servicos ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE agendamentos ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE movimentacao_financeira ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE guildas ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE configuracoes ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE niveis ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Safely assign existing data to the master tenant (00000000-0000-0000-0000-000000000001)
-- Only safe because this is the first deployment and all existing data belongs to the primary client
UPDATE clientes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE barbeiros SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE servicos SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE agendamentos SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE movimentacao_financeira SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE guildas SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE configuracoes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE niveis SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Enforce NOT NULL constraint
ALTER TABLE clientes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE barbeiros ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE servicos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE agendamentos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE movimentacao_financeira ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE guildas ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE configuracoes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE niveis ALTER COLUMN tenant_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_barbeiros_tenant_id ON barbeiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_id ON agendamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_tenant_id ON movimentacao_financeira(tenant_id);
