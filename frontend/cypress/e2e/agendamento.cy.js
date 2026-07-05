/**
 * agendamento.cy.js — Fluxo de Agendamento do Cliente
 *
 * Fluxos cobertos:
 * - Cliente acessa tela de agendamentos
 * - Cria novo agendamento (barbeiro + serviço + dia + horário)
 * - Confirma e vê sucesso
 * - Agendamento aparece na lista
 */

describe("Fluxo de Agendamento do Cliente", () => {
  beforeEach(() => {
    // Mock: login do cliente
    cy.intercept("POST", "**/auth/login", {
      statusCode: 200,
      body: {
        token: "fake-jwt-cliente",
        user: { id: 10, nome: "Cliente Teste", login: "cliente_teste", cargo: "Cliente", nivel: 1, xp: 50 },
      },
    }).as("login");

    // Mock: lista de barbeiros
    cy.intercept("GET", "**/barbeiros**", {
      statusCode: 200,
      body: {
        data: [
          { id: 1, nome: "João Barbeiro", foto_url: "", especialidade: "Corte e Barba" },
        ],
      },
    }).as("barbeiros");

    // Mock: lista de serviços
    cy.intercept("GET", "**/servicos**", {
      statusCode: 200,
      body: {
        data: [
          { id: 1, nome: "Corte Simples", preco: 35.0, duracao_min: 30 },
          { id: 2, nome: "Barba", preco: 25.0, duracao_min: 20 },
        ],
      },
    }).as("servicos");

    // Mock: slots disponíveis
    cy.intercept("GET", "**/agendamentos/slots**", {
      statusCode: 200,
      body: {
        data: ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "15:00"],
      },
    }).as("slots");

    // Mock: criar agendamento
    cy.intercept("POST", "**/agendamentos**", {
      statusCode: 201,
      body: {
        data: { id: 100, status: "pendente", mensagem: "Agendamento confirmado com sucesso!" },
      },
    }).as("criarAgendamento");

    // Mock: lista de agendamentos do cliente
    cy.intercept("GET", "**/agendamentos**", {
      statusCode: 200,
      body: {
        data: [
          { id: 100, barbeiro: "João Barbeiro", servico: "Corte Simples", data: "2026-07-10", horario: "09:00", status: "pendente" },
        ],
      },
    }).as("listaAgendamentos");

    // Fazer login
    cy.visit("/login");
    cy.get('input[placeholder="Digite seu login"]').type("cliente_teste");
    cy.get('input[placeholder="Digite sua senha"]').type("senha123");
    cy.contains("button", "Entrar no Sistema").click();
    cy.wait("@login");
    cy.url().should("include", "/dashboard");
  });

  it("Deve criar um agendamento completo com sucesso", () => {
    // Navegar para agendamentos
    cy.visit("/agendamentos");
    cy.wait("@listaAgendamentos");

    // Clicar em novo agendamento
    cy.contains("button", /novo agendamento/i).click();

    // Wizard: selecionar barbeiro
    cy.wait("@barbeiros");
    cy.get(".barbeiro-card, [data-testid='barbeiro-card']").first().click();

    // Wizard: selecionar serviço
    cy.wait("@servicos");
    cy.get(".servico-card, [data-testid='servico-card']").first().click();

    // Wizard: selecionar dia (terceiro dia disponível para evitar dia bloqueado)
    cy.get(".wizard-days-scroll button, [data-testid='dia-btn']").eq(2).click();

    // Wizard: selecionar horário
    cy.wait("@slots");
    cy.get(".slots-grid button:not(:disabled), [data-testid='slot-btn']:not(:disabled)").first().click();

    // Confirmar
    cy.contains("button", /confirmar agendamento/i).click();
    cy.wait("@criarAgendamento");

    // Verificar sucesso
    cy.contains(/agendamento confirmado|sucesso/i).should("be.visible");
  });

  it("Deve exibir a lista de agendamentos do cliente", () => {
    cy.visit("/agendamentos");
    cy.wait("@listaAgendamentos");

    // Verifica que a lista não está vazia
    cy.get("body").should("contain.text", "João Barbeiro");
    cy.get("body").should("contain.text", "Corte Simples");
  });
});
