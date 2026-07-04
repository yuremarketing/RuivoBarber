package services

import (
	"github.com/google/uuid"
	"fmt"

	"context"

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
	pagamentoService ports.PagamentoService
}

func NewPdvService(repo ports.PdvRepository, clienteRepo ports.ClienteRepository, notifier ports.NotificationService, pagamentoService ports.PagamentoService) *PdvService {
	return &PdvService{
		repo:        repo,
		clienteRepo: clienteRepo,
		notifier:    notifier,
		pagamentoService: pagamentoService,
	}
}

func (s *PdvService) AbrirCaixa(ctx context.Context, operadorID int, saldoInicial float64) (*domain.Caixa, error) {
	if saldoInicial < 0 {
		return nil, errors.New("o saldo inicial não pode ser negativo")
	}

	ativo, err := s.repo.ObterCaixaAtivo(ctx, operadorID)
	if err != nil {
		return nil, err
	}
	if ativo != nil {
		return nil, errors.New("já existe um caixa aberto para este operador")
	}

	id, err := s.repo.AbrirCaixa(ctx, operadorID, saldoInicial)
	if err != nil {
		return nil, err
	}

	return s.repo.ObterCaixaPorID(ctx, id)
}

func (s *PdvService) FecharCaixa(ctx context.Context, operadorID int, saldoInformado float64) (*domain.Caixa, error) {
	if saldoInformado < 0 {
		return nil, errors.New("o saldo informado não pode ser negativo")
	}

	ativo, err := s.repo.ObterCaixaAtivo(ctx, operadorID)
	if err != nil {
		return nil, err
	}
	if ativo == nil {
		return nil, errors.New("nenhum caixa aberto encontrado para este operador")
	}

	mcs, err := s.repo.ObterMovimentacoesCaixa(ctx, ativo.ID)
	if err != nil {
		return nil, err
	}

	vendasDinheiro, err := s.repo.ObterTotalVendasDinheiro(ctx, ativo.ID)
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

	err = s.repo.FecharCaixa(ctx, ativo.ID, saldoEsperado, saldoInformado)
	if err != nil {
		return nil, err
	}

	return s.repo.ObterCaixaPorID(ctx, ativo.ID)
}

func (s *PdvService) ObterStatusCaixa(ctx context.Context, operadorID int) (*CaixaStatusResponse, error) {
	ativo, err := s.repo.ObterCaixaAtivo(ctx, operadorID)
	if err != nil {
		return nil, err
	}
	if ativo == nil {
		return &CaixaStatusResponse{Status: "Fechado"}, nil
	}

	mcs, err := s.repo.ObterMovimentacoesCaixa(ctx, ativo.ID)
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

	vendasDinheiro, err := s.repo.ObterTotalVendasDinheiro(ctx, ativo.ID)
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

func (s *PdvService) MovimentarCaixa(ctx context.Context, operadorID int, tipo string, valor float64, motivo string) error {
	if tipo != "Entrada" && tipo != "Saida" {
		return errors.New("tipo de movimentação inválido. Deve ser 'Entrada' ou 'Saida'")
	}
	if valor <= 0 {
		return errors.New("o valor deve ser maior que zero")
	}
	if motivo == "" {
		return errors.New("o motivo é obrigatório")
	}

	ativo, err := s.repo.ObterCaixaAtivo(ctx, operadorID)
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

	return s.repo.AdicionarMovimentacaoCaixa(ctx, mc)
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

func (s *PdvService) ProcessarVenda(ctx context.Context, operadorID int, req *ProcessarVendaRequest) (interface{}, error) {
	if req.MetodoPagamento != "Dinheiro" && req.MetodoPagamento != "Pix" && req.MetodoPagamento != "Debito" && req.MetodoPagamento != "Credito" {
		return nil, errors.New("método de pagamento inválido. Deve ser 'Dinheiro', 'Pix', 'Debito' ou 'Credito'")
	}
	if req.Desconto < 0 {
		return nil, errors.New("o desconto não pode ser negativo")
	}
	if len(req.Itens) == 0 {
		return nil, errors.New("a venda deve conter pelo menos um item")
	}

	ativo, err := s.repo.ObterCaixaAtivo(ctx, operadorID)
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
		operador, err := s.clienteRepo.FindByID(ctx, operadorID)
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
		ag, err := s.clienteRepo.ObterAgendamentoPorID(ctx, *req.AgendamentoID)
		if err != nil {
			return nil, err
		}
		if ag == nil {
			return nil, errors.New("agendamento não encontrado")
		}
		if ag.Status == "Concluido" {
			return nil, errors.New("agendamento já concluído")
		}

		event, err := s.clienteRepo.ConcluirAtendimento(ctx, *req.AgendamentoID)
		if err != nil {
			return nil, err
		}
		if event != nil {
			s.notifier.EnqueueNotification(*event)
		}

		if req.ClienteID != nil {
			for _, item := range req.Itens {
				if item.ServicoID != nil && *item.ServicoID != ag.ServicoID {
					newAgID, err := s.clienteRepo.CriarAgendamento(ctx, *req.ClienteID, barbeiroID, *item.ServicoID, time.Now())
					if err != nil {
						return nil, err
					}
					eventExtra, err := s.clienteRepo.ConcluirAtendimento(ctx, newAgID)
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
				newAgID, err := s.clienteRepo.CriarAgendamento(ctx, *req.ClienteID, barbeiroID, *item.ServicoID, time.Now())
				if err != nil {
					return nil, err
				}
				event, err := s.clienteRepo.ConcluirAtendimento(ctx, newAgID)
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

	err = s.repo.AdicionarVenda(ctx, venda, itens)
	if err != nil {
		return nil, err
	}

	if req.MetodoPagamento == "Pix" && s.pagamentoService != nil {
		idempotencyKey := uuid.New().String()
		venda.IdempotencyKey = &idempotencyKey
		venda.StatusPagamento = "Pendente"
		
		pixReq := ports.CobrancaPixRequest{
			VendaID:        venda.ID,
			Valor:          venda.ValorLiquido,
			Descricao:      "Venda RuivoBarber #" + fmt.Sprint(venda.ID),
			IdempotencyKey: idempotencyKey,
		}
		
		pixResp, err := s.pagamentoService.CriarCobrancaPix(ctx, pixReq)
		if err != nil {
			return nil, err
		}
		
		venda.GatewayID = &pixResp.IdempotencyKey // Or we could use fmt.Sprint(pixResp.ID)
		gatewayIDStr := fmt.Sprint(pixResp.ID)
		venda.GatewayID = &gatewayIDStr
		
		// Note: Normally we'd UPDATE the venda in the database here with the gateway_id.
		// For now, we return it to the handler.
		return map[string]interface{}{
			"venda": venda,
			"pix":   pixResp,
		}, nil
	}
	
	venda.StatusPagamento = "Aprovado" // Dinheiro, etc
	return venda, nil
}
