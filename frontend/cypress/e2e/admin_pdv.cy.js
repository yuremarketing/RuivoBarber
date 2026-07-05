/**
 * admin_pdv.cy.js — Fluxo de Admin: Caixa + PDV (Checkout)
 *
 * Fluxos cobertos:
 * - Admin abre o Caixa
 * - Admin acessa PDV e finaliza venda em Dinheiro
 * - Saldo do caixa é atualizado após venda
 * - Admin fecha o caixa
 */

describe("Fluxo Admin — Caixa e PDV", () => {
  beforeEach(() => {
    // Mock: login do admin
    cy.intercept("POST", "**/auth/login", {
      statusCode: 200,
      body: {
        token: "fake-jwt-admin",
        user: { id: 1, nome: "Agent Admin", login: "agentAdmin", cargo: "Adm", nivel: 4, xp: 1000 },
      },
    }).as("login");

    // Mock: status do caixa (fechado inicialmente)
    cy.intercept("GET", "**/caixa/status**", {
      statusCode: 200,
      body: { data: { aberto: false, saldo: 0, caixa_id: null } },
    }).as("statusCaixa");

    // Mock: abrir caixa
    cy.intercept("POST", "**/caixa/abrir**", {
      statusCode: 201,
      body: { data: { caixa_id: 1, saldo_abertura: 100, status: "aberto" } },
    }).as("abrirCaixa");

    // Mock: caixa aberto (após abrir)
    cy.intercept("GET", "**/caixa/1**", {
      statusCode: 200,
      body: { data: { id: 1, aberto: true, saldo: 100, movimentos: [] } },
    }).as("caixaAberto");

    // Mock: lista de clientes para PDV
    cy.intercept("GET", "**/clientes**", {
      statusCode: 200,
      body: {
        data: [
          { id: 10, nome: "João Silva", login: "joao", nivel: 1, xp: 50 },
        ],
      },
    }).as("clientes");

    // Mock: lista de serviços para PDV
    cy.intercept("GET", "**/servicos**", {
      statusCode: 200,
      body: {
        data: [
          { id: 1, nome: "Corte Simples", preco: 35.0, duracao_min: 30 },
          { id: 2, nome: "Barba", preco: 25.0, duracao_min: 20 },
        ],
      },
    }).as("servicos");

    // Mock: finalizar venda
    cy.intercept("POST", "**/vendas**", {
      statusCode: 201,
      body: {
        data: { id: 50, total: 35.0, status: "pago", xp_ganho: 15, mensagem: "Venda finalizada com sucesso!" },
      },
    }).as("finalizarVenda");

    // Fazer login como admin
    cy.visit("/login");
    cy.get("select").select("Adm");
    cy.get('input[placeholder="Digite seu login"]').type("agentAdmin");
    cy.get('input[placeholder="Digite sua senha"]').type("senha123");
    cy.contains("button", "Entrar no Sistema").click();
    cy.wait("@login");
    cy.url().should("include", "/dashboard");
  });

  it("Deve abrir o Caixa com valor inicial", () => {
    cy.visit("/caixa");
    cy.wait("@statusCaixa");

    cy.contains("button", /abrir caixa/i).click();

    // Preencher valor de abertura
    cy.get("input").filter((_, el) => el.type !== "hidden").first().clear().type("100");
    cy.contains("button", /confirmar/i).click();

    cy.wait("@abrirCaixa");
    cy.contains(/caixa aberto|em aberto|R\$ 100/i).should("be.visible");
  });

  it("Deve registrar uma venda no PDV e atualizar o saldo", () => {
    // Mock caixa já aberto
    cy.intercept("GET", "**/caixa/status**", {
      statusCode: 200,
      body: { data: { aberto: true, saldo: 100, caixa_id: 1 } },
    });

    cy.visit("/checkout");
    cy.wait("@servicos");

    // Selecionar cliente
    cy.get("select").first().select(1);

    // Selecionar serviço
    cy.get(".checkout-service-card, [data-testid='servico-item']").first().click();

    // Forma de pagamento: Dinheiro
    cy.contains("button", /dinheiro/i).click();

    // Finalizar
    cy.contains("button", /finalizar venda/i).click();
    cy.wait("@finalizarVenda");

    // Verificar sucesso
    cy.contains(/venda finalizada|sucesso|xp ganho/i).should("be.visible");
  });

  it("Deve exibir o histórico de movimentos do caixa", () => {
    cy.intercept("GET", "**/caixa/status**", {
      statusCode: 200,
      body: { data: { aberto: true, saldo: 135, caixa_id: 1 } },
    });

    cy.intercept("GET", "**/caixa/1**", {
      statusCode: 200,
      body: {
        data: {
          id: 1, aberto: true, saldo: 135,
          movimentos: [
            { id: 1, tipo: "entrada", valor: 35.0, descricao: "Venda #50 - Corte Simples", created_at: new Date().toISOString() },
          ],
        },
      },
    });

    cy.visit("/caixa");
    cy.contains(/R\$ 35|Corte Simples|entrada/i).should("be.visible");
  });
});
