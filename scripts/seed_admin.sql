-- ============================================================
-- Seed Data para Auditoria do Administrador - RuivoBarber
-- ============================================================

-- 1. Inserir Clientes Fictícios (Com hashes falsos, pois o foco é dashboard)
INSERT INTO Usuarios (nome, cargo, login, senha, avatar_url) VALUES
('Cliente Ouro', 'Cliente', 'cliente1', '$2a$10$placeholder_hash', 'https://api.dicebear.com/6.x/avataaars/svg?seed=c1'),
('Cliente Prata', 'Cliente', 'cliente2', '$2a$10$placeholder_hash', 'https://api.dicebear.com/6.x/avataaars/svg?seed=c2'),
('Cliente Bronze', 'Cliente', 'cliente3', '$2a$10$placeholder_hash', 'https://api.dicebear.com/6.x/avataaars/svg?seed=c3'),
('Cliente Novo', 'Cliente', 'cliente4', '$2a$10$placeholder_hash', 'https://api.dicebear.com/6.x/avataaars/svg?seed=c4');

-- 2. Inserir Barbeiros
INSERT INTO Usuarios (nome, cargo, login, senha, avatar_url, avaliacao_media) VALUES
('Barbeiro Master', 'Barbeiro', 'barb1', '$2a$10$placeholder_hash', 'https://api.dicebear.com/6.x/avataaars/svg?seed=b1', 4.9),
('Barbeiro Aprendiz', 'Barbeiro', 'barb2', '$2a$10$placeholder_hash', 'https://api.dicebear.com/6.x/avataaars/svg?seed=b2', 4.5);

-- 3. Progresso dos Clientes
INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual, moedas, streakatual) 
SELECT id, 1200, 4, 20.0, 500, 5 FROM Usuarios WHERE login = 'cliente1';

INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual, moedas, streakatual) 
SELECT id, 400, 2, 50.0, 100, 2 FROM Usuarios WHERE login = 'cliente2';

-- 4. Agendamentos Passados (Concluídos e Faltas)
DO $$
DECLARE
    cid1 INT; cid2 INT; cid3 INT;
    bid1 INT; bid2 INT;
    sid1 INT; sid2 INT;
BEGIN
    SELECT id INTO cid1 FROM Usuarios WHERE login = 'cliente1';
    SELECT id INTO cid2 FROM Usuarios WHERE login = 'cliente2';
    SELECT id INTO cid3 FROM Usuarios WHERE login = 'cliente3';
    
    SELECT id INTO bid1 FROM Usuarios WHERE login = 'barb1';
    SELECT id INTO bid2 FROM Usuarios WHERE login = 'barb2';
    
    SELECT id INTO sid1 FROM Servicos WHERE nome = 'Corte Simples' LIMIT 1;
    SELECT id INTO sid2 FROM Servicos WHERE nome = 'Corte + Barba' LIMIT 1;

    -- Concluidos na última semana
    INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status, criadoem)
    VALUES (cid1, bid1, sid2, NOW() - INTERVAL '3 days', 'Concluido', NOW() - INTERVAL '5 days');
    
    INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status, criadoem)
    VALUES (cid2, bid2, sid1, NOW() - INTERVAL '2 days', 'Concluido', NOW() - INTERVAL '4 days');
    
    -- Falta
    INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status, criadoem)
    VALUES (cid3, bid1, sid1, NOW() - INTERVAL '1 days', 'Falta', NOW() - INTERVAL '3 days');

    -- Futuros (Pendentes e Confirmados)
    INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status, criadoem)
    VALUES (cid1, bid1, sid2, NOW() + INTERVAL '1 days', 'Confirmado', NOW());

    INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status, criadoem)
    VALUES (cid2, bid2, sid1, NOW() + INTERVAL '2 days', 'Pendente', NOW());
END $$;

-- 5. Se o banco tiver as tabelas do PDV (Caixas e Vendas), inserir mock de Vendas
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'caixas') THEN
        INSERT INTO caixas (status, saldoinicial, saldofinal, abertoem, fechadoem) 
        VALUES ('Fechado', 100.00, 250.00, NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours');
        
        -- Caixa atual
        INSERT INTO caixas (status, saldoinicial, abertoem) 
        VALUES ('Aberto', 100.00, NOW());
    END IF;
END $$;
