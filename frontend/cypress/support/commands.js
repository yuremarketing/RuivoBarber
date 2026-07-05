// ***********************************************
// Comandos customizados reutilizáveis
// ***********************************************

/**
 * Login rápido usando localStorage (sem passar pela UI, mais rápido)
 * Uso: cy.loginAs('Adm') | cy.loginAs('Cliente') | cy.loginAs('Barbeiro')
 */
Cypress.Commands.add("loginAs", (role = "Adm") => {
  const credentials = {
    Adm: { login: Cypress.env("ADMIN_LOGIN"), senha: Cypress.env("ADMIN_SENHA"), cargo: "Adm", nome: "Agent Admin" },
    Barbeiro: { login: Cypress.env("BARBEIRO_LOGIN"), senha: Cypress.env("BARBEIRO_SENHA"), cargo: "Barbeiro", nome: "Barbeiro Teste" },
    Cliente: { login: Cypress.env("CLIENTE_LOGIN"), senha: Cypress.env("CLIENTE_SENHA"), cargo: "Cliente", nome: "Cliente E2E" },
  };

  const cred = credentials[role];
  if (!cred) throw new Error(`Role desconhecida: ${role}`);

  cy.visit("/login");
  cy.get("select").select(cred.cargo);
  cy.get('input[placeholder="Digite seu login"]').type(cred.login);
  cy.get('input[placeholder="Digite sua senha"]').type(cred.senha);
  cy.contains("button", "Entrar no Sistema").click();
  cy.url().should("include", "/dashboard");
});

/**
 * Cadastra um novo usuário pela UI
 * Uso: cy.registerUser('Nome', 'login', 'senha', 'Cliente')
 */
Cypress.Commands.add("registerUser", (nome, login, senha, cargo = "Cliente") => {
  cy.visit("/login");
  cy.contains("button", "Criar Conta").click();

  if (cargo !== "Cliente") {
    cy.get("select").select(cargo);
  }

  cy.get('input[placeholder="Digite seu nome completo"]').type(nome);
  cy.get('input[placeholder="Digite o login desejado"]').type(login);
  cy.get('input[placeholder="Crie uma senha segura"]').type(senha);

  // Aceitar LGPD se existir
  cy.get("body").then(($body) => {
    if ($body.find('input[type="checkbox"]').length > 0) {
      cy.get('input[type="checkbox"]').check();
    }
  });

  cy.contains("button", "Criar Minha Conta").click();
  cy.url().should("include", "/dashboard");
});

/**
 * Abre o Caixa (navega até /caixa e abre com valor)
 * Uso: cy.abrirCaixa(100)
 */
Cypress.Commands.add("abrirCaixa", (valorAbertura = 100) => {
  cy.visit("/caixa");
  cy.get("body").then(($body) => {
    if ($body.text().includes("Abrir Caixa")) {
      cy.contains("button", "Abrir Caixa").click();
      cy.get("input").first().clear().type(String(valorAbertura));
      cy.contains("button", /confirmar/i).click();
      cy.contains(/caixa aberto|em aberto/i).should("be.visible");
    }
  });
});

/**
 * Intercepta chamadas da API mockando a resposta
 * Uso: cy.mockApi('GET', '/clientes', { data: [] })
 */
Cypress.Commands.add("mockApi", (method, path, response, statusCode = 200) => {
  const apiUrl = Cypress.env("API_URL");
  cy.intercept(method, `${apiUrl}${path}`, {
    statusCode,
    body: response,
  });
});
