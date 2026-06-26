-- ============================================================
-- Estrutura Inicial do Banco de Dados: RuivoBarber MVP
-- ============================================================

CREATE TABLE IF NOT EXISTS Usuarios (
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

CREATE TABLE IF NOT EXISTS Niveis (
    ID SERIAL PRIMARY KEY,
    NomeDoNivel VARCHAR(50) NOT NULL,
    XpNecessario INT NOT NULL,
    Bonus VARCHAR(100)
);

INSERT INTO Niveis (NomeDoNivel, XpNecessario, Bonus) VALUES
('Corte Iniciante', 100, '-'),
('Barba de Respeito', 300, '5% de desconto'),
('Lenda da Navalha', 600, '10% de desconto'),
('Rei da Cadeira', 1000, '1 Corte Grátis')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ProgressoCliente (
    ID SERIAL PRIMARY KEY,
    ClienteID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    XPAtual INT DEFAULT 0,
    NivelAtual INT DEFAULT 1 REFERENCES Niveis(ID),
    BarraPercentual DECIMAL(5,2) DEFAULT 0.00,
    Moedas INT DEFAULT 0,
    StreakAtual INT DEFAULT 0,
    UltimoCheckIn TIMESTAMPTZ,
    UpdatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Servicos (
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
('Hidratação Capilar', 50.00, 20, 40)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS Agendamentos (
    ID SERIAL PRIMARY KEY,
    ClienteID INT REFERENCES Usuarios(ID),
    BarbeiroID INT REFERENCES Usuarios(ID),
    ServicoID INT REFERENCES Servicos(ID),
    DataHora TIMESTAMPTZ NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Confirmado', 'Concluido', 'Cancelado', 'Falta', 'Presente', 'EmCadeira')),
    CheckInTime TIMESTAMPTZ,
    EmCadeiraTime TIMESTAMPTZ,
    ConcluidoTime TIMESTAMPTZ,
    CriadoEm TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Cupons (
    ID SERIAL PRIMARY KEY,
    Codigo VARCHAR(50) UNIQUE NOT NULL,
    Descricao VARCHAR(150),
    DescontoPercent DECIMAL(5,2),
    ClienteID INT REFERENCES Usuarios(ID),
    Usado BOOLEAN DEFAULT FALSE,
    ValidoAte DATE
);

CREATE TABLE IF NOT EXISTS Configuracoes (
    ID SERIAL PRIMARY KEY,
    ChaveAPIWhatsApp VARCHAR(255),
    UrlWebhook VARCHAR(255),
    TokenValidacao VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS MensagensProcessadas (
    MessageID VARCHAR(255) PRIMARY KEY,
    ProcessadoEm TIMESTAMP DEFAULT NOW()
);

-- Utilizador admin inicial (trocar senha em produção)
INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES
('Administrador', 'Adm', 'admin', '$2a$10$placeholder_hash_trocar')
ON CONFLICT (Login) DO NOTHING;

CREATE TABLE IF NOT EXISTS Produtos (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Quantidade INT NOT NULL DEFAULT 0 CHECK (Quantidade >= 0)
);

CREATE TABLE IF NOT EXISTS ServicoProdutos (
    ServicoID INT REFERENCES Servicos(ID) ON DELETE CASCADE,
    ProdutoID INT REFERENCES Produtos(ID) ON DELETE CASCADE,
    QuantidadeNecessaria INT NOT NULL DEFAULT 1,
    PRIMARY KEY (ServicoID, ProdutoID)
);

CREATE TABLE IF NOT EXISTS Temporadas (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    DataInicio TIMESTAMPTZ NOT NULL,
    DataFim TIMESTAMPTZ NOT NULL,
    Ativa BOOLEAN DEFAULT FALSE,
    CriadaEm TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Clas (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) UNIQUE NOT NULL,
    Descricao VARCHAR(255),
    XPColetivo INT DEFAULT 0,
    NivelAtual INT DEFAULT 1,
    LiderID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clas_lider ON Clas(LiderID);

CREATE TABLE IF NOT EXISTS ClaMembros (
    UsuarioID INT PRIMARY KEY REFERENCES Usuarios(ID) ON DELETE CASCADE,
    ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
    Cargo VARCHAR(20) DEFAULT 'Membro' CHECK (Cargo IN ('Lider', 'ViceLider', 'Membro')),
    DataEntrada TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cla_membros_cla ON ClaMembros(ClaID);

CREATE TABLE IF NOT EXISTS ClaConvites (
    ID SERIAL PRIMARY KEY,
    ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
    ConvidadoID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    EnviadoPor INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Aceito', 'Recusado')),
    CriadoEm TIMESTAMP DEFAULT NOW(),
    UNIQUE(ClaID, ConvidadoID)
);

CREATE TABLE IF NOT EXISTS Badges (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) UNIQUE NOT NULL,
    Descricao VARCHAR(255) NOT NULL,
    IconeURL VARCHAR(255) DEFAULT '',
    RequisitoTipo VARCHAR(50) NOT NULL, -- 'Cortes', 'Nivel'
    RequisitoValor INT NOT NULL,
    XpBonus INT DEFAULT 50,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS UsuarioBadges (
    UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    BadgeID INT NOT NULL REFERENCES Badges(ID) ON DELETE CASCADE,
    DesbloqueadoEm TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (UsuarioID, BadgeID)
);

CREATE TABLE IF NOT EXISTS ItensLoja (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) UNIQUE NOT NULL,
    Descricao VARCHAR(255) NOT NULL,
    Preco INT NOT NULL,
    TipoItem VARCHAR(50) NOT NULL,
    StyleClass VARCHAR(100) NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS UsuarioItens (
    UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    ItemID INT NOT NULL REFERENCES ItensLoja(ID) ON DELETE CASCADE,
    CompradoEm TIMESTAMP DEFAULT NOW(),
    Equipado BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (UsuarioID, ItemID)
);

CREATE TABLE IF NOT EXISTS ClaMissoes (
    ID SERIAL PRIMARY KEY,
    Descricao VARCHAR(255) UNIQUE NOT NULL,
    Meta INT NOT NULL,
    TipoRequisito VARCHAR(50) NOT NULL, -- 'Cortes', 'Barbas', 'Atendimentos', 'XpClã'
    XpBonus INT NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ClaMissoesSemanais (
    SemanaAno VARCHAR(10) NOT NULL, -- ex: '2026-W25'
    MissaoID INT NOT NULL REFERENCES ClaMissoes(ID) ON DELETE CASCADE,
    PRIMARY KEY (SemanaAno, MissaoID)
);

CREATE TABLE IF NOT EXISTS ClaMissoesProgresso (
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

CREATE TABLE IF NOT EXISTS Raids (
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

CREATE TABLE IF NOT EXISTS RaidContribuicoes (
    RaidID INT REFERENCES Raids(ID) ON DELETE CASCADE,
    UsuarioID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Contribuicao INT DEFAULT 0,
    RecompensaResgatada BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (RaidID, UsuarioID)
);CREATE TABLE IF NOT EXISTS Lives (
    ID SERIAL PRIMARY KEY,
    Titulo VARCHAR(150) NOT NULL,
    Url TEXT NOT NULL,
    Plataforma VARCHAR(50) NOT NULL,
    Ativa BOOLEAN DEFAULT FALSE,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ClaMural (
    ID SERIAL PRIMARY KEY,
    ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
    UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Mensagem TEXT NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS BarbeiroDisponibilidade (
    ID SERIAL PRIMARY KEY,
    BarbeiroID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    DiaSemana INT NOT NULL CHECK (DiaSemana BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    Trabalha BOOLEAN DEFAULT TRUE,
    HoraInicio TIME DEFAULT '09:00',
    HoraFim TIME DEFAULT '19:00',
    UNIQUE(BarbeiroID, DiaSemana)
);

CREATE TABLE IF NOT EXISTS BarbeiroBloqueios (
    ID SERIAL PRIMARY KEY,
    BarbeiroID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    DataBloqueio DATE NOT NULL,
    Motivo VARCHAR(150),
    UNIQUE(BarbeiroID, DataBloqueio)
);

-- Popular dados padrão de exemplo (Todos os dias das 09:00 às 19:00) para todos os Barbeiros cadastrados
INSERT INTO BarbeiroDisponibilidade (BarbeiroID, DiaSemana, Trabalha, HoraInicio, HoraFim)
SELECT u.ID, d.dia, TRUE, '09:00', '19:00'
FROM Usuarios u
CROSS JOIN (SELECT generate_series(0, 6) AS dia) d
WHERE u.Cargo IN ('Barbeiro', 'Adm')
ON CONFLICT DO NOTHING;

ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS chave_pix VARCHAR(150) DEFAULT '';

CREATE TABLE IF NOT EXISTS Gorjetas (
    ID SERIAL PRIMARY KEY,
    AgendamentoID INT REFERENCES Agendamentos(ID) ON DELETE SET NULL,
    ClienteID INT REFERENCES Usuarios(ID) ON DELETE SET NULL,
    BarbeiroID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Valor DECIMAL(8,2) NOT NULL CHECK (Valor > 0),
    ChavePix VARCHAR(150) NOT NULL,
    PixCopiaECola TEXT NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Pago', 'Cancelado')),
    CriadoEm TIMESTAMP DEFAULT NOW(),
    PagoEm TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Avaliacoes (
    ID SERIAL PRIMARY KEY,
    AgendamentoID INT REFERENCES Agendamentos(ID) ON DELETE CASCADE UNIQUE,
    ClienteID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    BarbeiroID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Nota INT NOT NULL CHECK (Nota >= 1 AND Nota <= 5),
    Comentario TEXT,
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Caixas (
    ID SERIAL PRIMARY KEY,
    OperadorID INT REFERENCES Usuarios(ID) ON DELETE SET NULL,
    SaldoInicial DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    SaldoFinal DECIMAL(10,2) DEFAULT NULL,
    SaldoInformado DECIMAL(10,2) DEFAULT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Aberto' CHECK (Status IN ('Aberto', 'Fechado')),
    AbertoEm TIMESTAMP DEFAULT NOW(),
    FechadoEm TIMESTAMP DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS Vendas (
    ID SERIAL PRIMARY KEY,
    CaixaID INT REFERENCES Caixas(ID) ON DELETE CASCADE,
    ClienteID INT REFERENCES Usuarios(ID) ON DELETE SET NULL,
    AgendamentoID INT REFERENCES Agendamentos(ID) ON DELETE SET NULL,
    ValorBruto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Desconto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ValorLiquido DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    MetodoPagamento VARCHAR(30) NOT NULL CHECK (MetodoPagamento IN ('Dinheiro', 'Pix', 'Debito', 'Credito')),
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS VendaItens (
    ID SERIAL PRIMARY KEY,
    VendaID INT REFERENCES Vendas(ID) ON DELETE CASCADE,
    ServicoID INT REFERENCES Servicos(ID) ON DELETE SET NULL,
    PrecoUnitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Quantidade INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS MovimentacoesCaixa (
    ID SERIAL PRIMARY KEY,
    CaixaID INT REFERENCES Caixas(ID) ON DELETE CASCADE,
    Tipo VARCHAR(20) NOT NULL CHECK (Tipo IN ('Entrada', 'Saida')),
    Valor DECIMAL(10,2) NOT NULL CHECK (Valor > 0),
    Motivo VARCHAR(200) NOT NULL,
    CriadoEm TIMESTAMP DEFAULT NOW()
);



