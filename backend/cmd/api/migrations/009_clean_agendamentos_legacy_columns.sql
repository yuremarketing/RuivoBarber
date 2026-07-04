-- Migration 009: Remover colunas legadas da tabela de Agendamentos

ALTER TABLE Agendamentos 
DROP COLUMN IF EXISTS diasantecedencia, 
DROP COLUMN IF EXISTS diadasemana, 
DROP COLUMN IF EXISTS turno;
