package services

import (
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
	"time"
)

type CaixaStatusResponse struct {
	CaixaID      int       `json:"caixa_id"`
	Status       string    `json:"status"`
	AbertoEm     time.Time `json:"aberto_em"`
	SaldoInicial float64   `json:"saldo_inicial"`
	Entradas     float64   `json:"entradas"`
	Saidas       float64   `json:"saidas"`
	SaldoAtual   float64   `json:"saldo_atual"`
}

type PdvService struct {
	repo ports.PdvRepository
}

func NewPdvService(repo ports.PdvRepository) *PdvService {
	return &PdvService{repo: repo}
}

func (s *PdvService) AbrirCaixa(operadorID int, saldoInicial float64) (*domain.Caixa, error) {
	if saldoInicial < 0 {
		return nil, errors.New("o saldo inicial não pode ser negativo")
	}

	ativo, err := s.repo.ObterCaixaAtivo(operadorID)
	if err != nil {
		return nil, err
	}
	if ativo != nil {
		return nil, errors.New("já existe um caixa aberto para este operador")
	}

	id, err := s.repo.AbrirCaixa(operadorID, saldoInicial)
	if err != nil {
		return nil, err
	}

	return s.repo.ObterCaixaPorID(id)
}

func (s *PdvService) FecharCaixa(operadorID int, saldoInformado float64) (*domain.Caixa, error) {
	if saldoInformado < 0 {
		return nil, errors.New("o saldo informado não pode ser negativo")
	}

	ativo, err := s.repo.ObterCaixaAtivo(operadorID)
	if err != nil {
		return nil, err
	}
	if ativo == nil {
		return nil, errors.New("nenhum caixa aberto encontrado para este operador")
	}

	mcs, err := s.repo.ObterMovimentacoesCaixa(ativo.ID)
	if err != nil {
		return nil, err
	}

	saldoEsperado := ativo.SaldoInicial
	for _, mc := range mcs {
		if mc.Tipo == "Entrada" {
			saldoEsperado += mc.Valor
		} else if mc.Tipo == "Saida" {
			saldoEsperado -= mc.Valor
		}
	}

	err = s.repo.FecharCaixa(ativo.ID, saldoEsperado, saldoInformado)
	if err != nil {
		return nil, err
	}

	return s.repo.ObterCaixaPorID(ativo.ID)
}

func (s *PdvService) ObterStatusCaixa(operadorID int) (*CaixaStatusResponse, error) {
	ativo, err := s.repo.ObterCaixaAtivo(operadorID)
	if err != nil {
		return nil, err
	}
	if ativo == nil {
		return &CaixaStatusResponse{Status: "Fechado"}, nil
	}

	mcs, err := s.repo.ObterMovimentacoesCaixa(ativo.ID)
	if err != nil {
		return nil, err
	}

	var entradas, saidas float64
	for _, mc := range mcs {
		if mc.Tipo == "Entrada" {
			entradas += mc.Valor
		} else if mc.Tipo == "Saida" {
			saidas += mc.Valor
		}
	}

	saldoAtual := ativo.SaldoInicial + entradas - saidas

	return &CaixaStatusResponse{
		CaixaID:      ativo.ID,
		Status:       ativo.Status,
		AbertoEm:     ativo.AbertoEm,
		SaldoInicial: ativo.SaldoInicial,
		Entradas:     entradas,
		Saidas:       saidas,
		SaldoAtual:   saldoAtual,
	}, nil
}

func (s *PdvService) MovimentarCaixa(operadorID int, tipo string, valor float64, motivo string) error {
	if tipo != "Entrada" && tipo != "Saida" {
		return errors.New("tipo de movimentação inválido. Deve ser 'Entrada' ou 'Saida'")
	}
	if valor <= 0 {
		return errors.New("o valor deve ser maior que zero")
	}
	if motivo == "" {
		return errors.New("o motivo é obrigatório")
	}

	ativo, err := s.repo.ObterCaixaAtivo(operadorID)
	if err != nil {
		return err
	}
	if ativo == nil {
		return errors.New("operação não permitida: o caixa está fechado")
	}

	mc := &domain.MovimentacaoCaixa{
		CaixaID: ativo.ID,
		Tipo:    tipo,
		Valor:   valor,
		Motivo:  motivo,
	}

	return s.repo.AdicionarMovimentacaoCaixa(mc)
}
