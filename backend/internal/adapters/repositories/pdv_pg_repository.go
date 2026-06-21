package repositories

import (
	"database/sql"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type PdvPgRepository struct {
	db *sql.DB
}

func NewPdvPgRepository(db *sql.DB) ports.PdvRepository {
	return &PdvPgRepository{db: db}
}

func (r *PdvPgRepository) AbrirCaixa(operadorID int, saldoInicial float64) (int, error) {
	query := `INSERT INTO Caixas (operadorid, saldoinicial, status) VALUES ($1, $2, 'Aberto') RETURNING id`
	var id int
	err := r.db.QueryRow(query, operadorID, saldoInicial).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *PdvPgRepository) FecharCaixa(caixaID int, saldoFinal float64, saldoInformado float64) error {
	query := `UPDATE Caixas SET status = 'Fechado', saldofinal = $1, saldoinformado = $2, fechadoem = NOW() WHERE id = $3`
	_, err := r.db.Exec(query, saldoFinal, saldoInformado, caixaID)
	return err
}

func (r *PdvPgRepository) ObterCaixaAtivo(operadorID int) (*domain.Caixa, error) {
	query := `SELECT id, operadorid, saldoinicial, saldofinal, saldoinformado, status, abertoem, fechadoem FROM Caixas WHERE operadorid = $1 AND status = 'Aberto'`
	var c domain.Caixa
	var operadorIDNull sql.NullInt64
	var saldoFinalNull, saldoInformadoNull sql.NullFloat64
	var fechadoEmNull sql.NullTime

	err := r.db.QueryRow(query, operadorID).Scan(&c.ID, &operadorIDNull, &c.SaldoInicial, &saldoFinalNull, &saldoInformadoNull, &c.Status, &c.AbertoEm, &fechadoEmNull)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if operadorIDNull.Valid {
		v := int(operadorIDNull.Int64)
		c.OperadorID = &v
	}
	if saldoFinalNull.Valid {
		c.SaldoFinal = &saldoFinalNull.Float64
	}
	if saldoInformadoNull.Valid {
		c.SaldoInformado = &saldoInformadoNull.Float64
	}
	if fechadoEmNull.Valid {
		c.FechadoEm = &fechadoEmNull.Time
	}

	return &c, nil
}

func (r *PdvPgRepository) ObterCaixaPorID(caixaID int) (*domain.Caixa, error) {
	query := `SELECT id, operadorid, saldoinicial, saldofinal, saldoinformado, status, abertoem, fechadoem FROM Caixas WHERE id = $1`
	var c domain.Caixa
	var operadorIDNull sql.NullInt64
	var saldoFinalNull, saldoInformadoNull sql.NullFloat64
	var fechadoEmNull sql.NullTime

	err := r.db.QueryRow(query, caixaID).Scan(&c.ID, &operadorIDNull, &c.SaldoInicial, &saldoFinalNull, &saldoInformadoNull, &c.Status, &c.AbertoEm, &fechadoEmNull)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if operadorIDNull.Valid {
		v := int(operadorIDNull.Int64)
		c.OperadorID = &v
	}
	if saldoFinalNull.Valid {
		c.SaldoFinal = &saldoFinalNull.Float64
	}
	if saldoInformadoNull.Valid {
		c.SaldoInformado = &saldoInformadoNull.Float64
	}
	if fechadoEmNull.Valid {
		c.FechadoEm = &fechadoEmNull.Time
	}

	return &c, nil
}

func (r *PdvPgRepository) AdicionarMovimentacaoCaixa(mc *domain.MovimentacaoCaixa) error {
	query := `INSERT INTO MovimentacoesCaixa (caixaid, tipo, valor, motivo) VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(query, mc.CaixaID, mc.Tipo, mc.Valor, mc.Motivo)
	return err
}

func (r *PdvPgRepository) ObterMovimentacoesCaixa(caixaID int) ([]domain.MovimentacaoCaixa, error) {
	query := `SELECT id, caixaid, tipo, valor, motivo, criadoem FROM MovimentacoesCaixa WHERE caixaid = $1 ORDER BY criadoem ASC`
	rows, err := r.db.Query(query, caixaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mcs []domain.MovimentacaoCaixa
	for rows.Next() {
		var mc domain.MovimentacaoCaixa
		err := rows.Scan(&mc.ID, &mc.CaixaID, &mc.Tipo, &mc.Valor, &mc.Motivo, &mc.CriadoEm)
		if err != nil {
			return nil, err
		}
		mcs = append(mcs, mc)
	}
	return mcs, nil
}

func (r *PdvPgRepository) AdicionarVenda(venda *domain.Venda, itens []domain.VendaItem) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Inserir a venda
	queryVenda := `
		INSERT INTO Vendas (caixaid, clienteid, agendamentoid, valorbruto, desconto, valorliquido, metodopagamento)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, criadoem
	`
	err = tx.QueryRow(queryVenda,
		venda.CaixaID, venda.ClienteID, venda.AgendamentoID,
		venda.ValorBruto, venda.Desconto, venda.ValorLiquido, venda.MetodoPagamento,
	).Scan(&venda.ID, &venda.CriadoEm)
	if err != nil {
		return err
	}

	// 2. Inserir os itens e realizar a baixa de estoque APENAS se o cliente for anônimo (ClienteID == nil)
	queryItem := `
		INSERT INTO VendaItens (vendaid, servicoid, precounitario, quantidade)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	for i := range itens {
		itens[i].VendaID = venda.ID
		err = tx.QueryRow(queryItem,
			itens[i].VendaID, itens[i].ServicoID, itens[i].PrecoUnitario, itens[i].Quantidade,
		).Scan(&itens[i].ID)
		if err != nil {
			return err
		}

		// Se o cliente for anônimo (venda.ClienteID == nil), damos baixa no estoque dos produtos associados a esse serviço.
		if venda.ClienteID == nil && itens[i].ServicoID != nil {
			queryProdutos := `
				SELECT produtoid, quantidadenecessaria
				FROM ServicoProdutos
				WHERE servicoid = $1
			`
			rows, err := tx.Query(queryProdutos, *itens[i].ServicoID)
			if err != nil {
				return err
			}
			
			type ProdInfo struct {
				ProdutoID int
				QtdNec    int
			}
			var prods []ProdInfo
			for rows.Next() {
				var p ProdInfo
				if err := rows.Scan(&p.ProdutoID, &p.QtdNec); err != nil {
					rows.Close()
					return err
				}
				prods = append(prods, p)
			}
			rows.Close()

			for _, p := range prods {
				_, err = tx.Exec(
					"UPDATE Produtos SET quantidade = quantidade - $1 WHERE id = $2",
					p.QtdNec * itens[i].Quantidade, p.ProdutoID,
				)
				if err != nil {
					return err
				}
			}
		}
	}

	return tx.Commit()
}

func (r *PdvPgRepository) ObterTotalVendasDinheiro(caixaID int) (float64, error) {
	query := `SELECT COALESCE(SUM(valorliquido), 0) FROM Vendas WHERE caixaid = $1 AND metodopagamento = 'Dinheiro'`
	var total float64
	err := r.db.QueryRow(query, caixaID).Scan(&total)
	return total, err
}

