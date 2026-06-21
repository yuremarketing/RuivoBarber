package services

import (
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
	"time"
)

type CaixaStatusResponse struct {
	CaixaID        int                        `json:"caixa_id"`
	Status         string                     `json:"status"`
	AbertoEm       time.Time                  `json:"aberto_em"`
	SaldoInicial   float64                    `json:"saldo_inicial"`
	Entradas       float64                    `json:"entradas"`
	Saidas         float64                    `json:"saidas"`
	SaldoAtual     float64                    `json:"saldo_atual"`
	Movimentacoes  []domain.MovimentacaoCaixa `json:"movimentacoes"`
}

type PdvService struct {
	repo        ports.PdvRepository
	clienteRepo ports.ClienteRepository
	notifier    ports.NotificationService
}

func NewPdvService(repo ports.PdvRepository, clienteRepo ports.ClienteRepository, notifier ports.NotificationService) *PdvService {
	return &PdvService{
		repo:        repo,
		clienteRepo: clienteRepo,
		notifier:    notifier,
	}
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

	vendasDinheiro, err := s.repo.ObterTotalVendasDinheiro(ativo.ID)
	if err != nil {
		return nil, err
	}

	saldoEsperado := ativo.SaldoInicial + vendasDinheiro
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

	vendasDinheiro, err := s.repo.ObterTotalVendasDinheiro(ativo.ID)
	if err != nil {
		return nil, err
	}

	saldoAtual := ativo.SaldoInicial + entradas - saidas + vendasDinheiro

	return &CaixaStatusResponse{
		CaixaID:       ativo.ID,
		Status:        ativo.Status,
		AbertoEm:      ativo.AbertoEm,
		SaldoInicial:  ativo.SaldoInicial,
		Entradas:      entradas,
		Saidas:        saidas,
		SaldoAtual:    saldoAtual,
		Movimentacoes: mcs,
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

type VendaItemRequest struct {
	ServicoID     *int    `json:"servico_id"`
	PrecoUnitario float64 `json:"preco_unitario"`
	Quantidade    int     `json:"quantidade"`
}

type ProcessarVendaRequest struct {
	ClienteID       *int               `json:"cliente_id"`
	AgendamentoID   *int               `json:"agendamento_id"`
	BarbeiroID      *int               `json:"barbeiro_id"`
	Desconto        float64            `json:"desconto"`
	MetodoPagamento string             `json:"metodo_pagamento"`
	Itens           []VendaItemRequest `json:"itens"`
}

func (s *PdvService) ProcessarVenda(operadorID int, req *ProcessarVendaRequest) (*domain.Venda, error) {
	if req.MetodoPagamento != "Dinheiro" && req.MetodoPagamento != "Pix" && req.MetodoPagamento != "Debito" && req.MetodoPagamento != "Credito" {
		return nil, errors.New("método de pagamento inválido. Deve ser 'Dinheiro', 'Pix', 'Debito' ou 'Credito'")
	}
	if req.Desconto < 0 {
		return nil, errors.New("o desconto não pode ser negativo")
	}
	if len(req.Itens) == 0 {
		return nil, errors.New("a venda deve conter pelo menos um item")
	}

	ativo, err := s.repo.ObterCaixaAtivo(operadorID)
	if err != nil {
		return nil, err
	}
	if ativo == nil {
		return nil, errors.New("operação não permitida: nenhum caixa aberto encontrado")
	}

	var barbeiroID int
	if req.BarbeiroID != nil {
		barbeiroID = *req.BarbeiroID
	} else {
		operador, err := s.clienteRepo.FindByID(operadorID)
		if err != nil {
			return nil, err
		}
		if operador == nil {
			return nil, errors.New("operador não encontrado")
		}
		if operador.Cargo == "Barbeiro" {
			barbeiroID = operadorID
		} else if operador.Cargo == "Adm" {
			return nil, errors.New("o id do barbeiro é obrigatório para administradores")
		} else {
			return nil, errors.New("operador não autorizado a processar vendas")
		}
	}

	var valorBruto float64
	var itens []domain.VendaItem
	for _, item := range req.Itens {
		if item.Quantidade <= 0 {
			return nil, errors.New("a quantidade de cada item deve ser maior que zero")
		}
		if item.PrecoUnitario < 0 {
			return nil, errors.New("o preço unitário não pode ser negativo")
		}
		valorBruto += item.PrecoUnitario * float64(item.Quantidade)

		itens = append(itens, domain.VendaItem{
			ServicoID:     item.ServicoID,
			PrecoUnitario: item.PrecoUnitario,
			Quantidade:    item.Quantidade,
		})
	}

	if req.Desconto > valorBruto {
		return nil, errors.New("o desconto não pode ser maior que o valor bruto")
	}
	valorLiquido := valorBruto - req.Desconto

	if req.AgendamentoID != nil {
		ag, err := s.clienteRepo.ObterAgendamentoPorID(*req.AgendamentoID)
		if err != nil {
			return nil, err
		}
		if ag == nil {
			return nil, errors.New("agendamento não encontrado")
		}
		if ag.Status == "Concluido" {
			return nil, errors.New("agendamento já concluído")
		}

		event, err := s.clienteRepo.ConcluirAtendimento(*req.AgendamentoID)
		if err != nil {
			return nil, err
		}
		if event != nil {
			s.notifier.EnqueueNotification(*event)
		}

		if req.ClienteID != nil {
			for _, item := range req.Itens {
				if item.ServicoID != nil && *item.ServicoID != ag.ServicoID {
					newAgID, err := s.clienteRepo.CriarAgendamento(*req.ClienteID, barbeiroID, *item.ServicoID, time.Now())
					if err != nil {
						return nil, err
					}
					eventExtra, err := s.clienteRepo.ConcluirAtendimento(newAgID)
					if err != nil {
						return nil, err
					}
					if eventExtra != nil {
						s.notifier.EnqueueNotification(*eventExtra)
					}
				}
			}
		}
	} else if req.ClienteID != nil {
		for _, item := range req.Itens {
			if item.ServicoID != nil {
				newAgID, err := s.clienteRepo.CriarAgendamento(*req.ClienteID, barbeiroID, *item.ServicoID, time.Now())
				if err != nil {
					return nil, err
				}
				event, err := s.clienteRepo.ConcluirAtendimento(newAgID)
				if err != nil {
					return nil, err
				}
				if event != nil {
					s.notifier.EnqueueNotification(*event)
				}
			}
		}
	}

	venda := &domain.Venda{
		CaixaID:         ativo.ID,
		ClienteID:       req.ClienteID,
		AgendamentoID:   req.AgendamentoID,
		ValorBruto:      valorBruto,
		Desconto:        req.Desconto,
		ValorLiquido:    valorLiquido,
		MetodoPagamento: req.MetodoPagamento,
	}

	err = s.repo.AdicionarVenda(venda, itens)
	if err != nil {
		return nil, err
	}

	return venda, nil
}
