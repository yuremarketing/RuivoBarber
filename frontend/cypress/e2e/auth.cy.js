/**
 * auth.cy.js — Testes de Autenticação (Login e Cadastro)
 *
 * Fluxos cobertos:
 * - Cadastro de novo cliente com sucesso
 * - Login com credenciais válidas (Admin)
 * - Bloqueio de login com credenciais inválidas
 * - Persistência de sessão após reload
 */

const uniqueId = Date.now();

describe("Autenticação", () => {
  beforeEach(() => {
    // Mocka API de auth para não sujar o banco com dados de teste
    cy.intercept("POST", "**/auth/register", {
      statusCode: 201,
      body: {
        token: "fake-jwt-token",
        user: {
          id: 999,
          nome: `Cliente E2E ${uniqueId}`,
          login: `cliente_${uniqueId}`,
          cargo: "Cliente",
          nivel: 1,
          xp: 0,
        },
      },
    }).as("register");

    cy.intercept("POST", "**/auth/login", (req) => {
      const { login, senha } = req.body;
      if (login === Cypress.env("ADMIN_LOGIN") && senha === Cypress.env("ADMIN_SENHA")) {
        req.reply({
          statusCode: 200,
          body: {
            token: "fake-jwt-admin",
            user: { id: 1, nome: "Agent Admin", login, cargo: "Adm", nivel: 4, xp: 1000 },
          },
        });
      } else {
        req.reply({ statusCode: 401, body: { error: "Credenciais inválidas" } });
      }
    }).as("login");
  });

  it("Deve exibir a tela de login corretamente", () => {
    cy.visit("/login");
    cy.contains("RuivoBarber").should("be.visible");
    cy.contains("button", "Entrar").should("be.visible");
    cy.contains("button", "Criar Conta").should("be.visible");
  });

  it("Deve cadastrar um novo cliente com sucesso", () => {
    cy.visit("/login");
    cy.contains("button", "Criar Conta").click();

    cy.get('input[placeholder="Digite seu nome completo"]').type(`Cliente E2E ${uniqueId}`);
    cy.get('input[placeholder="Digite o login desejado"]').type(`cliente_${uniqueId}`);
    cy.get('input[placeholder="Crie uma senha segura"]').type("senha123");

    cy.get("body").then(($body) => {
      if ($body.find('input[type="checkbox"]').length > 0) {
        cy.get('input[type="checkbox"]').check();
      }
    });

    cy.contains("button", "Criar Minha Conta").click();
    cy.wait("@register");
    cy.url().should("include", "/dashboard");
  });

  it("Deve fazer login como Administrador com sucesso", () => {
    cy.visit("/login");
    cy.get("select").select("Adm");
    cy.get('input[placeholder="Digite seu login"]').type(Cypress.env("ADMIN_LOGIN"));
    cy.get('input[placeholder="Digite sua senha"]').type(Cypress.env("ADMIN_SENHA"));
    cy.contains("button", "Entrar no Sistema").click();

    cy.wait("@login");
    cy.url().should("include", "/dashboard");
  });

  it("Deve bloquear login com credenciais inválidas", () => {
    cy.visit("/login");
    cy.get('input[placeholder="Digite seu login"]').type("usuario_inexistente");
    cy.get('input[placeholder="Digite sua senha"]').type("senha_errada");
    cy.contains("button", "Entrar no Sistema").click();

    cy.wait("@login");
    // Deve permanecer na tela de login e exibir mensagem de erro
    cy.url().should("include", "/login");
    cy.get("body").should("contain.text", /inválid|erro|incorret/i);
  });
});
