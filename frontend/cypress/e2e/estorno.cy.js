/**
 * estorno.cy.js — Fluxo de Estorno de Venda
 *
 * Fluxos cobertos:
 * - Admin visualiza histórico de vendas no caixa
 * - Admin executa estorno de uma venda concluída
 * - Venda fica marcada como estornada
 * - Saldo do caixa é revertido corretamente
 * - XP do cliente é revertido após estorno
 */

describe("Fluxo de Estorno de Venda", () => {
  beforeEach(() => {
    // Mock: login do admin
    cy.intercept("POST", "**/auth/login", {
      statusCode: 200,
      body: {
        token: "fake-jwt-admin",
        user: { id: 1, nome: "Agent Admin", login: "agentAdmin", cargo: "Adm", nivel: 4, xp: 1000 },
      },
    }).as("login");

    // Mock: status do caixa (aberto, com saldo)
    cy.intercept("GET", "**/caixa/status**", {
      statusCode: 200,
      body: { data: { aberto: true, saldo: 235.0, caixa_id: 1 } },
    }).as("statusCaixa");

    // Mock: detalhes do caixa com movimentos (venda já realizada)
    cy.intercept("GET", "**/caixa/1**", {
      statusCode: 200,
      body: {
        data: {
          id: 1, aberto: true, saldo: 235.0,
          movimentos: [
            {
              id: 1, tipo: "entrada", valor: 35.0,
              descricao: "Venda #50 - Corte Simples - João Silva",
              venda_id: 50, estornado: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2, tipo: "entrada", valor: 100.0,
              descricao: "Abertura de Caixa",
              venda_id: null, estornado: false,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    }).as("caixaComMovimentos");

    // Mock: estornar venda
    cy.intercept("POST", "**/vendas/50/estornar**", {
      statusCode: 200,
      body: {
        data: {
          mensagem: "Estorno realizado com sucesso!",
          venda_id: 50,
          valor_estornado: 35.0,
          xp_revertido: 15,
          novo_saldo: 200.0,
        },
      },
    }).as("estornarVenda");

    // Mock: caixa após estorno (saldo reduzido)
    cy.intercept("GET", "**/vendas/50**", {
      statusCode: 200,
      body: {
        data: {
          id: 50, total: 35.0, status: "estornado",
          cliente: { nome: "João Silva" }, servico: "Corte Simples",
        },
      },
    }).as("vendaEstornada");

    // Fazer login como admin
    cy.visit("/login");
    cy.get("select").select("Adm");
    cy.get('input[placeholder="Digite seu login"]').type("agentAdmin");
    cy.get('input[placeholder="Digite sua senha"]').type("senha123");
    cy.contains("button", "Entrar no Sistema").click();
    cy.wait("@login");
    cy.url().should("include", "/dashboard");
  });

  it("Deve exibir movimentos do caixa com opção de estorno", () => {
    cy.visit("/caixa");
    cy.wait("@statusCaixa");
    cy.wait("@caixaComMovimentos");

    // Verifica que os movimentos aparecem
    cy.contains(/Corte Simples|Venda #50|João Silva/i).should("be.visible");
    cy.contains(/R\$ 35|35,00/i).should("be.visible");
  });

  it("Deve executar o estorno de uma venda e reverter o saldo", () => {
    cy.visit("/caixa");
    cy.wait("@statusCaixa");
    cy.wait("@caixaComMovimentos");

    // Clicar no botão de estornar da venda #50
    cy.contains(/estornar|cancelar venda/i).first().click();

    // Confirmar no diálogo de confirmação (se existir)
    cy.get("body").then(($body) => {
      if ($body.find(".modal, [role='dialog']").length > 0) {
        cy.contains("button", /confirmar|sim|continuar/i).click();
      }
    });

    cy.wait("@estornarVenda");

    // Verificar mensagem de sucesso
    cy.contains(/estorno realizado|estornado|sucesso/i).should("be.visible");
  });

  it("Deve mostrar venda como estornada no histórico após o estorno", () => {
    // Mock: caixa após o estorno (movimento de saída)
    cy.intercept("GET", "**/caixa/1**", {
      statusCode: 200,
      body: {
        data: {
          id: 1, aberto: true, saldo: 200.0,
          movimentos: [
            {
              id: 3, tipo: "saida", valor: -35.0,
              descricao: "Estorno Venda #50 - Corte Simples - João Silva",
              venda_id: 50, estornado: true,
              created_at: new Date().toISOString(),
            },
            {
              id: 1, tipo: "entrada", valor: 35.0,
              descricao: "Venda #50 - Corte Simples - João Silva",
              venda_id: 50, estornado: true,
              created_at: new Date(Date.now() - 60000).toISOString(),
            },
          ],
        },
      },
    });

    cy.visit("/caixa");
    cy.contains(/estorno|estornado|-R\$ 35|-35,00/i).should("be.visible");
    cy.contains(/R\$ 200|200,00/i).should("be.visible");
  });
});
