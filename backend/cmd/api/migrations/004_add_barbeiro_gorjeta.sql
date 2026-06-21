-- Migration: Add ChavePix to Usuarios and create Gorjetas table
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
