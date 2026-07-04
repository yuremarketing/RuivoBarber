-- Up
UPDATE vendas SET status_pagamento = 'pending' WHERE status_pagamento = 'Pendente';
UPDATE vendas SET status_pagamento = 'approved' WHERE status_pagamento = 'Aprovado';
UPDATE vendas SET status_pagamento = 'cancelled' WHERE status_pagamento = 'Cancelado';

ALTER TABLE vendas
ADD CONSTRAINT chk_vendas_status_pagamento
CHECK (status_pagamento IN ('pending', 'approved', 'cancelled', 'refunded'));

-- Down
ALTER TABLE vendas DROP CONSTRAINT chk_vendas_status_pagamento;
