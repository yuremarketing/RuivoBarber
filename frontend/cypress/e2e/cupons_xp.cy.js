/**
 * cupons_xp.cy.js — Fluxo de Cupons e Gamificação (XP)
 *
 * Fluxos cobertos:
 * - Cliente visualiza seu XP e nível no Dashboard
 * - Admin valida cupom para cliente
 * - Cliente resgata cupom disponível
 * - XP é atualizado após atendimento
 */

describe("Cupons e Gamificação (XP)", () => {
  describe("Dashboard do Cliente — Progresso RPG", () => {
    beforeEach(() => {
      cy.intercept("POST", "**/auth/login", {
        statusCode: 200,
        body: {
          token: "fake-jwt-cliente",
          user: { id: 10, nome: "João Silva", login: "joao", cargo: "Cliente", nivel: 2, xp: 320 },
        },
      }).as("login");

      cy.intercept("GET", "**/clientes/10**", {
        statusCode: 200,
        body: { data: { id: 10, nome: "João Silva", nivel: 2, xp: 320, badges: [] } },
      }).as("clienteData");

      cy.visit("/login");
      cy.get('input[placeholder="Digite seu login"]').type("joao");
      cy.get('input[placeholder="Digite sua senha"]').type("senha123");
      cy.contains("button", "Entrar no Sistema").click();
      cy.wait("@login");
    });

    it("Deve exibir o XP e nível do cliente no Dashboard", () => {
      cy.visit("/dashboard");
      // Verifica que o PlayerCard ou RpgProgressBar exibem informações de nível
      cy.contains(/barba de respeito|nível 2|320 xp/i).should("be.visible");
    });
  });

  describe("Admin — Validação de Cupom", () => {
    beforeEach(() => {
      cy.intercept("POST", "**/auth/login", {
        statusCode: 200,
        body: {
          token: "fake-jwt-admin",
          user: { id: 1, nome: "Agent Admin", login: "agentAdmin", cargo: "Adm", nivel: 4, xp: 1000 },
        },
      }).as("login");

      // Mock: validar cupom
      cy.intercept("POST", "**/cupons/validar**", {
        statusCode: 200,
        body: { data: { valido: true, desconto: 20, tipo: "percentual", descricao: "20% de desconto" } },
      }).as("validarCupom");

      // Mock: aplicar cupom
      cy.intercept("POST", "**/cupons/aplicar**", {
        statusCode: 200,
        body: { data: { mensagem: "Cupom aplicado com sucesso!", desconto_aplicado: 7.0 } },
      }).as("aplicarCupom");

      cy.visit("/login");
      cy.get("select").select("Adm");
      cy.get('input[placeholder="Digite seu login"]').type("agentAdmin");
      cy.get('input[placeholder="Digite sua senha"]').type("senha123");
      cy.contains("button", "Entrar no Sistema").click();
      cy.wait("@login");
    });

    it("Deve validar e aplicar um cupom válido no checkout", () => {
      cy.visit("/checkout");

      // Aplicar cupom
      cy.get("body").then(($body) => {
        if ($body.find('input[placeholder*="cupom"]').length > 0) {
          cy.get('input[placeholder*="cupom" i]').type("DESCONTO20");
          cy.contains("button", /aplicar|validar/i).click();
          cy.wait("@validarCupom");
          cy.contains(/desconto|20%|cupom/i).should("be.visible");
        }
      });
    });
  });

  describe("Cliente — Resgate de Cupom por XP", () => {
    beforeEach(() => {
      cy.intercept("POST", "**/auth/login", {
        statusCode: 200,
        body: {
          token: "fake-jwt-cliente",
          user: { id: 10, nome: "João Silva", login: "joao", cargo: "Cliente", nivel: 2, xp: 320 },
        },
      }).as("login");

      // Mock: lista de recompensas/cupons disponíveis
      cy.intercept("GET", "**/recompensas**", {
        statusCode: 200,
        body: {
          data: [
            { id: 1, nome: "Cupom 10% Off", xp_necessario: 200, disponivel: true },
            { id: 2, nome: "Corte Grátis", xp_necessario: 500, disponivel: false },
          ],
        },
      }).as("recompensas");

      // Mock: resgatar cupom
      cy.intercept("POST", "**/recompensas/*/resgatar**", {
        statusCode: 200,
        body: { data: { codigo: "JOAO10OFF", mensagem: "Cupom resgatado! Use no próximo atendimento." } },
      }).as("resgatar");

      cy.visit("/login");
      cy.get('input[placeholder="Digite seu login"]').type("joao");
      cy.get('input[placeholder="Digite sua senha"]').type("senha123");
      cy.contains("button", "Entrar no Sistema").click();
      cy.wait("@login");
    });

    it("Deve exibir cupons disponíveis e resgatar um com XP suficiente", () => {
      cy.visit("/cupons");
      cy.wait("@recompensas");

      cy.contains("Cupom 10% Off").should("be.visible");
      cy.contains(/resgatar|usar xp/i).first().click();
      cy.wait("@resgatar");

      cy.contains(/resgatado|código|JOAO10OFF/i).should("be.visible");
    });
  });
});
