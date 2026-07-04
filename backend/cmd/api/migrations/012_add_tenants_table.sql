-- Migration: 012_add_tenants_table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed the first tenant (Master/Default)
INSERT INTO tenants (id, nome, slug) 
VALUES ('00000000-0000-0000-0000-000000000001', 'RuivoBarber Oficial', 'ruivobarber')
ON CONFLICT (id) DO NOTHING;
