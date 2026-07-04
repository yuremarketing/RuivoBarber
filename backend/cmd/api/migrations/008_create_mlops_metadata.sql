-- Migration 008: Tabela de Metadados Preditivos MLOps

CREATE TABLE MlopsAgendamentoMetadata (
    AgendamentoID INT PRIMARY KEY REFERENCES Agendamentos(ID) ON DELETE CASCADE,
    TempoAntecedenciaHoras DECIMAL(10,2) NOT NULL,
    DiaSemana INT NOT NULL,
    FaixaHoraria VARCHAR(20) NOT NULL,
    HistoricoAssiduidadeCliente DECIMAL(5,2) NOT NULL,
    CriadoEm TIMESTAMPTZ DEFAULT NOW()
);
