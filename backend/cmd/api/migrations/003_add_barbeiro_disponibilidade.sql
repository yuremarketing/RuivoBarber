-- Migration: Add BarbeiroDisponibilidade and BarbeiroBloqueios tables
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

-- Popular dados padrão de exemplo (Segunda a Sábado das 09:00 às 19:00) para todos os Barbeiros cadastrados
INSERT INTO BarbeiroDisponibilidade (BarbeiroID, DiaSemana, Trabalha, HoraInicio, HoraFim)
SELECT u.ID, d.dia, TRUE, '09:00', '19:00'
FROM Usuarios u
CROSS JOIN (SELECT generate_series(1, 6) AS dia) d
WHERE u.Cargo IN ('Barbeiro', 'Adm')
ON CONFLICT DO NOTHING;
