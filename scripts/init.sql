-- ============================================================
-- Estrutura Inicial: RuivoBarber MVP
-- ============================================================

CREATE TABLE Usuarios (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Cargo VARCHAR(20) CHECK (Cargo IN ('Adm', 'Barbeiro', 'Cliente')),
    Login VARCHAR(50) UNIQUE NOT NULL,
    Senha VARCHAR(255) NOT NULL,
    Comissao DECIMAL(5,2),
    AvatarURL TEXT DEFAULT '',
    FotoURL VARCHAR(300) DEFAULT '',
    AvaliacaoMedia DECIMAL(3,2) DEFAULT 5.00
);

CREATE TABLE Niveis (
    ID SERIAL PRIMARY KEY,
    NomeDoNivel VARCHAR(50) NOT NULL,
    XpNecessario INT NOT NULL,
    Bonus VARCHAR(100)
);

INSERT INTO Niveis (NomeDoNivel, XpNecessario, Bonus) VALUES
('Corte Iniciante', 100, '-'),
('Barba de Respeito', 300, '5% de desconto'),
('Lenda da Navalha', 600, '10% de desconto'),
('Rei da Cadeira', 1000, '1 Corte Grátis');

CREATE TABLE ProgressoCliente (
    ID SERIAL PRIMARY KEY,
    ClienteID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    XPAtual INT DEFAULT 0,
    NivelAtual INT DEFAULT 1 REFERENCES Niveis(ID),
    BarraPercentual DECIMAL(5,2) DEFAULT 0.00,
    Moedas INT DEFAULT 0,
    StreakAtual INT DEFAULT 0,
    UltimoCheckIn TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Servicos (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Preco DECIMAL(8,2) NOT NULL,
    XpRecompensa INT NOT NULL DEFAULT 10,
    DuracaoMinutos INT DEFAULT 30
);

INSERT INTO Servicos (Nome, Preco, XpRecompensa, DuracaoMinutos) VALUES
('Corte Simples', 35.00, 10, 30),
('Corte + Barba', 60.00, 25, 60),
('Barba Completa', 40.00, 15, 45),
('Hidratação Capilar', 50.00, 20, 40);

CREATE TABLE Agendamentos (
    ID SERIAL PRIMARY KEY,
    ClienteID INT REFERENCES Usuarios(ID),
    BarbeiroID INT REFERENCES Usuarios(ID),
    ServicoID INT REFERENCES Servicos(ID),
    DataHora TIMESTAMP NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Confirmado', 'Concluido', 'Cancelado', 'Falta', 'Presente', 'EmCadeira')),
    CheckInTime TIMESTAMP,
    EmCadeiraTime TIMESTAMP,
    ConcluidoTime TIMESTAMP,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Cupons (
    ID SERIAL PRIMARY KEY,
    Codigo VARCHAR(50) UNIQUE NOT NULL,
    Descricao VARCHAR(150),
    DescontoPercent DECIMAL(5,2),
    ClienteID INT REFERENCES Usuarios(ID),
    Usado BOOLEAN DEFAULT FALSE,
    ValidoAte DATE
);

CREATE TABLE Configuracoes (
    ID SERIAL PRIMARY KEY,
    ChaveAPIWhatsApp VARCHAR(255),
    UrlWebhook VARCHAR(255),
    TokenValidacao VARCHAR(255)
);

CREATE TABLE MensagensProcessadas (
    MessageID VARCHAR(255) PRIMARY KEY,
    ProcessadoEm TIMESTAMP DEFAULT NOW()
);

-- Utilizador admin inicial (trocar senha em produção)
INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES
('Administrador', 'Adm', 'admin', '$2a$10$placeholder_hash_trocar');

CREATE TABLE Produtos (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Quantidade INT NOT NULL DEFAULT 0 CHECK (Quantidade >= 0)
);

CREATE TABLE ServicoProdutos (
    ServicoID INT REFERENCES Servicos(ID) ON DELETE CASCADE,
    ProdutoID INT REFERENCES Produtos(ID) ON DELETE CASCADE,
    QuantidadeNecessaria INT NOT NULL DEFAULT 1,
    PRIMARY KEY (ServicoID, ProdutoID)
);

CREATE TABLE Temporadas (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    DataInicio TIMESTAMP NOT NULL,
    DataFim TIMESTAMP NOT NULL,
    Ativa BOOLEAN DEFAULT FALSE,
    CriadaEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Clas (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) UNIQUE NOT NULL,
    Descricao VARCHAR(255),
    XPColetivo INT DEFAULT 0,
    NivelAtual INT DEFAULT 1,
    LiderID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

-- Índice para busca rápida de clãs por líder
CREATE INDEX idx_clas_lider ON Clas(LiderID);

CREATE TABLE ClaMembros (
    UsuarioID INT PRIMARY KEY REFERENCES Usuarios(ID) ON DELETE CASCADE,
    ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
    Cargo VARCHAR(20) DEFAULT 'Membro' CHECK (Cargo IN ('Lider', 'ViceLider', 'Membro')),
    DataEntrada TIMESTAMP DEFAULT NOW()
);

-- Índice para busca rápida de membros pertencentes a um clã específico
CREATE INDEX idx_cla_membros_cla ON ClaMembros(ClaID);

CREATE TABLE ClaConvites (
    ID SERIAL PRIMARY KEY,
    ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
    ConvidadoID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    EnviadoPor INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Aceito', 'Recusado')),
    CriadoEm TIMESTAMP DEFAULT NOW(),
    UNIQUE(ClaID, ConvidadoID)
);

CREATE TABLE Badges (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) UNIQUE NOT NULL,
    Descricao VARCHAR(255) NOT NULL,
    IconeURL VARCHAR(255) DEFAULT '',
    RequisitoTipo VARCHAR(50) NOT NULL,
    RequisitoValor INT NOT NULL,
    XpBonus INT DEFAULT 50,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE UsuarioBadges (
    UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    BadgeID INT NOT NULL REFERENCES Badges(ID) ON DELETE CASCADE,
    DesbloqueadoEm TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (UsuarioID, BadgeID)
);

-- Inserir Badges iniciais
INSERT INTO Badges (Nome, Descricao, RequisitoTipo, RequisitoValor, XpBonus) VALUES
('Primeiro Sangue', 'Concluiu o primeiro atendimento na barbearia', 'Cortes', 1, 50),
('Fiel da Navalha', 'Concluiu 5 atendimentos na barbearia', 'Cortes', 5, 50),
('Barba de Respeito', 'Alcançou o nível 2 de progresso', 'Nivel', 2, 50),
('Lenda Viva', 'Alcançou o nível 3 de progresso (patente máxima)', 'Nivel', 3, 50)
ON CONFLICT (Nome) DO NOTHING;

CREATE TABLE ItensLoja (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) UNIQUE NOT NULL,
    Descricao VARCHAR(255) NOT NULL,
    Preco INT NOT NULL,
    TipoItem VARCHAR(50) NOT NULL,
    StyleClass VARCHAR(100) NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE UsuarioItens (
    UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    ItemID INT NOT NULL REFERENCES ItensLoja(ID) ON DELETE CASCADE,
    CompradoEm TIMESTAMP DEFAULT NOW(),
    Equipado BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (UsuarioID, ItemID)
);

-- Inserir itens iniciais da loja
INSERT INTO ItensLoja (Nome, Descricao, Preco, TipoItem, StyleClass) VALUES
('Moldura de Ouro', 'Moldura dourada premium para o seu Card de Jogador', 200, 'Moldura', 'frame-gold'),
('Fundo Neon de Fogo', 'Fundo animado de chamas neon para o seu Card', 350, 'Background', 'bg-neon-fire'),
('Fundo Neon de Gelo', 'Fundo animado de cristais de gelo neon para o seu Card', 350, 'Background', 'bg-neon-ice'),
('Efeito Sombra Pulsante', 'Efeito de brilho neon pulsante ao redor do seu Card', 500, 'Efeito', 'glow-pulsing')
ON CONFLICT (Nome) DO NOTHING;

CREATE TABLE ClaMissoes (
    ID SERIAL PRIMARY KEY,
    Descricao VARCHAR(255) UNIQUE NOT NULL,
    Meta INT NOT NULL,
    TipoRequisito VARCHAR(50) NOT NULL, -- 'Cortes', 'Barbas', 'Atendimentos', 'XpClã'
    XpBonus INT NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ClaMissoesSemanais (
    SemanaAno VARCHAR(10) NOT NULL, -- ex: '2026-W25'
    MissaoID INT NOT NULL REFERENCES ClaMissoes(ID) ON DELETE CASCADE,
    PRIMARY KEY (SemanaAno, MissaoID)
);

CREATE TABLE ClaMissoesProgresso (
    ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
    MissaoID INT NOT NULL REFERENCES ClaMissoes(ID) ON DELETE CASCADE,
    SemanaAno VARCHAR(10) NOT NULL,
    Progresso INT DEFAULT 0,
    Completada BOOLEAN DEFAULT FALSE,
    CompletadaEm TIMESTAMP,
    PRIMARY KEY (ClaID, MissaoID, SemanaAno)
);

INSERT INTO ClaMissoes (Descricao, Meta, TipoRequisito, XpBonus) VALUES
('Navalha de Elite: Realizar 10 atendimentos', 10, 'Atendimentos', 100),
('Esquadrão do Cabelo: Concluir 5 cortes', 5, 'Cortes', 80),
('Barba Suprema: Fazer 5 barbas', 5, 'Barbas', 80),
('Força Coletiva: Acumular 15 XP de Clã', 15, 'XpClã', 150)
ON CONFLICT DO NOTHING;

CREATE TABLE Raids (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) UNIQUE NOT NULL,
    Descricao VARCHAR(255) NOT NULL,
    Meta INT NOT NULL,
    Progresso INT DEFAULT 0,
    TipoRequisito VARCHAR(50) NOT NULL,
    RecompensaXp INT DEFAULT 50,
    RecompensaMoedas INT DEFAULT 50,
    DataInicio TIMESTAMP NOT NULL,
    DataFim TIMESTAMP NOT NULL,
    Status VARCHAR(20) DEFAULT 'Ativo' CHECK (Status IN ('Ativo', 'Concluido', 'Expirado')),
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE RaidContribuicoes (
    RaidID INT REFERENCES Raids(ID) ON DELETE CASCADE,
    UsuarioID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Contribuicao INT DEFAULT 0,
    RecompensaResgatada BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (RaidID, UsuarioID)
);CREATE TABLE Lives (
    ID SERIAL PRIMARY KEY,
    Titulo VARCHAR(150) NOT NULL,
    Url TEXT NOT NULL,
    Plataforma VARCHAR(50) NOT NULL,
    Ativa BOOLEAN DEFAULT FALSE,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ClaMural (
    ID SERIAL PRIMARY KEY,
    ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
    UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Mensagem TEXT NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);
