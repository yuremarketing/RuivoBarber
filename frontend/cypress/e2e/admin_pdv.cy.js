describe("Fluxo de Admin e PDV (Caixa)", () => {
  beforeEach(() => {
    // Acessa a página inicial e faz login como Admin
    cy.visit("/login");
    
    // Supondo que na base local exista um usuário adm pré-definido ou que possamos entrar
    // Se o login local for mockado ou persistido no localStorage, podemos preenchê-lo.
    // Vamos usar a mesma lógica de login do admin se houver, ou simular localStorage
    // Caso a aplicação exija credenciais:
    cy.get('select').select("Adm");
    cy.get('input[placeholder="Digite seu login"]').type("admin");
    cy.get('input[placeholder="Digite sua senha"]').type("admin123");
    cy.contains("button", "Entrar").click();

    cy.url().should("include", "/dashboard");
  });

  it("Deve simular abertura de caixa, conclusão de atendimento e gorjetas", () => {
    // 1. Navegar até a aba de Caixas (Financeiro)
    cy.contains("a", "Caixas").click();
    cy.url().should("include", "/caixa");

    // Verifica se existe botão para abrir/gerenciar caixa
    cy.get("body").then(($body) => {
      if ($body.text().includes("Abrir Caixa")) {
        cy.contains("button", "Abrir Caixa").click();
        cy.get('input[placeholder="Valor de Abertura"]').type("100");
        cy.contains("button", "Confirmar Abertura").click();
      }
    });

    // 2. Navegar até o PDV (Vender)
    cy.contains("a", "PDV").click();
    cy.url().should("include", "/checkout");

    // Adiciona o primeiro item ou serviço à venda
    cy.get(".checkout-product-card, .checkout-service-card").first().click();

    // Seleciona o cliente e barbeiro se aplicável
    cy.get("select").first().select(1);

    // Conclui a venda no PDV simulando Dinheiro
    cy.contains("button", "Dinheiro").click();
    cy.contains("button", "Finalizar Venda").click();

    // 3. Verificar se a venda foi registrada
    cy.contains("a", "Caixas").click();
    cy.url().should("include", "/caixa");
    cy.contains("R$").should("be.visible");
  });
});
