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
    AvatarURL TEXT DEFAULT ''
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
    Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Confirmado', 'Concluido', 'Cancelado', 'Falta')),
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



