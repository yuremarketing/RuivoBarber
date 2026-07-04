package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)
type PdvRepository interface {
	AbrirCaixa(ctx context.Context, operadorID int, saldoInicial float64) (int, error)
	FecharCaixa(ctx context.Context, caixaID int, saldoFinal float64, saldoInformado float64) error
	ObterCaixaAtivo(ctx context.Context, operadorID int) (*domain.Caixa, error)
	ObterCaixaPorID(ctx context.Context, caixaID int) (*domain.Caixa, error)
	AdicionarMovimentacaoCaixa(ctx context.Context, mc *domain.MovimentacaoCaixa) error
	ObterMovimentacoesCaixa(ctx context.Context, caixaID int) ([]domain.MovimentacaoCaixa, error)
	AdicionarVenda(ctx context.Context, venda *domain.Venda, itens []domain.VendaItem) error
	ObterTotalVendasDinheiro(ctx context.Context, caixaID int) (float64, error)
	ObterVendaPorGatewayID(ctx context.Context, gatewayID string) (*domain.Venda, error)
	AtualizarVenda(ctx context.Context, venda *domain.Venda) error
}
