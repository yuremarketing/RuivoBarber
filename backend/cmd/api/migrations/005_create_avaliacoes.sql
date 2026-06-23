-- Migration: Create Avaliacoes table
CREATE TABLE IF NOT EXISTS Avaliacoes (
    ID SERIAL PRIMARY KEY,
    AgendamentoID INT REFERENCES Agendamentos(ID) ON DELETE CASCADE UNIQUE,
    ClienteID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    BarbeiroID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    Nota INT NOT NULL CHECK (Nota >= 1 AND Nota <= 5),
    Comentario TEXT,
    CriadoEm TIMESTAMP DEFAULT NOW()
);
