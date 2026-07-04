import re
import os

# 1. Update domain/venda.go
path_venda = 'backend/internal/core/domain/venda.go'
with open(path_venda, 'r') as f:
    venda_content = f.read()

fsm_methods = '''
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
'''
if 'ValidateStatusTransition' not in venda_content:
    venda_content = venda_content + fsm_methods
    if '"errors"' not in venda_content:
        venda_content = venda_content.replace('import "time"', 'import (\n\t"time"\n\t"errors"\n\t"fmt"\n)')

with open(path_venda, 'w') as f:
    f.write(venda_content)


# 2. Update pdv_service.go
path_pdv = 'backend/internal/core/services/pdv_service.go'
with open(path_pdv, 'r') as f:
    pdv_content = f.read()

pdv_content = pdv_content.replace('venda.StatusPagamento = "Pendente"', 'venda.StatusPagamento = domain.StatusPending')
pdv_content = pdv_content.replace('venda.StatusPagamento = "Aprovado"', 'venda.StatusPagamento = domain.StatusApproved')
pdv_content = pdv_content.replace('venda.StatusPagamento = "Cancelado"', 'venda.StatusPagamento = domain.StatusCancelled')

# Use UpdateStatus in ProcessarWebhookPix
pdv_content = pdv_content.replace('venda.StatusPagamento = domain.StatusApproved\n\t\terr = s.repo.AtualizarVenda', 'err = venda.UpdateStatus(domain.StatusApproved)\n\t\tif err != nil {\n\t\t\treturn err\n\t\t}\n\t\terr = s.repo.AtualizarVenda')
pdv_content = pdv_content.replace('venda.StatusPagamento = domain.StatusCancelled\n\t\t_ = s.repo.AtualizarVenda', 'err = venda.UpdateStatus(domain.StatusCancelled)\n\t\tif err == nil {\n\t\t\t_ = s.repo.AtualizarVenda(ctx, venda)\n\t\t}')

with open(path_pdv, 'w') as f:
    f.write(pdv_content)


# 3. Create Migration for constraints and updating old values
migration_path = 'backend/cmd/api/migrations/012_add_venda_status_fsm.sql'
with open(migration_path, 'w') as f:
    f.write('''-- Up
UPDATE vendas SET status_pagamento = 'pending' WHERE status_pagamento = 'Pendente';
UPDATE vendas SET status_pagamento = 'approved' WHERE status_pagamento = 'Aprovado';
UPDATE vendas SET status_pagamento = 'cancelled' WHERE status_pagamento = 'Cancelado';

ALTER TABLE vendas
ADD CONSTRAINT chk_vendas_status_pagamento
CHECK (status_pagamento IN ('pending', 'approved', 'cancelled', 'refunded'));

-- Down
ALTER TABLE vendas DROP CONSTRAINT chk_vendas_status_pagamento;
''')

print("FSM implemented in App and Migration created.")
