package domain

import (
	"time"
	"errors"
	"fmt"
)

type Venda struct {
	ID              int       `json:"id"`
	CaixaID         int       `json:"caixa_id"`
	ClienteID       *int      `json:"cliente_id"`
	AgendamentoID   *int      `json:"agendamento_id"`
	ValorBruto      float64   `json:"valor_bruto"`
	Desconto        float64   `json:"desconto"`
	ValorLiquido    float64   `json:"valor_liquido"`
	MetodoPagamento string    `json:"metodo_pagamento"`
	StatusPagamento string    `json:"status_pagamento"`
	GatewayID       *string   `json:"gateway_id"`
	IdempotencyKey  *string   `json:"idempotency_key"`
	CriadoEm        time.Time `json:"criado_em"`
}

type VendaItem struct {
	ID            int     `json:"id"`
	VendaID       int     `json:"venda_id"`
	ServicoID     *int    `json:"servico_id"`
	PrecoUnitario float64 `json:"preco_unitario"`
	Quantidade    int     `json:"quantidade"`
}

// Payment statuses
const (
	StatusPending   = "pending"
	StatusApproved  = "approved"
	StatusCancelled = "cancelled"
	StatusRefunded  = "refunded"
)

// ValidateStatusTransition ensures the state machine rules are respected
func (v *Venda) ValidateStatusTransition(newStatus string) error {
	current := v.StatusPagamento
	
	// If current is empty (new Venda), only pending or approved are allowed
	if current == "" {
		if newStatus != StatusPending && newStatus != StatusApproved {
			return errors.New("nova venda só pode iniciar como pending ou approved")
		}
		return nil
	}

	if current == newStatus {
		return nil // idempotent
	}

	switch current {
	case StatusPending:
		if newStatus != StatusApproved && newStatus != StatusCancelled {
			return fmt.Errorf("transição inválida: de %s para %s", current, newStatus)
		}
	case StatusApproved:
		if newStatus != StatusRefunded {
			return fmt.Errorf("transição inválida: de %s para %s", current, newStatus)
		}
	case StatusCancelled:
		return fmt.Errorf("venda já está cancelada, não é possível alterar para %s", newStatus)
	case StatusRefunded:
		return fmt.Errorf("venda já está estornada, não é possível alterar para %s", newStatus)
	default:
		return fmt.Errorf("estado atual inválido: %s", current)
	}

	return nil
}

// UpdateStatus is a helper that validates and updates the status
func (v *Venda) UpdateStatus(newStatus string) error {
	if err := v.ValidateStatusTransition(newStatus); err != nil {
		return err
	}
	v.StatusPagamento = newStatus
	return nil
}
