package ports

import "ruivobarber-api/internal/core/domain"

type PdvRepository interface {
	AbrirCaixa(operadorID int, saldoInicial float64) (int, error)
	FecharCaixa(caixaID int, saldoFinal float64, saldoInformado float64) error
	ObterCaixaAtivo(operadorID int) (*domain.Caixa, error)
	ObterCaixaPorID(caixaID int) (*domain.Caixa, error)
	AdicionarMovimentacaoCaixa(mc *domain.MovimentacaoCaixa) error
	ObterMovimentacoesCaixa(caixaID int) ([]domain.MovimentacaoCaixa, error)
	AdicionarVenda(venda *domain.Venda, itens []domain.VendaItem) error
	ObterTotalVendasDinheiro(caixaID int) (float64, error)
}
