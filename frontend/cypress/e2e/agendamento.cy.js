describe("Fluxo de Agendamento do Cliente (MVP)", () => {
  beforeEach(() => {
    // Acessa a página inicial e vai para Criar Conta
    cy.visit("/");

    cy.contains("button", "Criar Conta").click();
    
    // Preenche o formulário de registro
    const uniqueId = Date.now();
    cy.get('input[placeholder="Digite seu nome completo"]').type(`Cliente E2E ${uniqueId}`);
    cy.get('input[placeholder="Digite o login desejado"]').type(`cliente_${uniqueId}`);
    cy.get('input[placeholder="Crie uma senha segura"]').type("123");
    
    // Aceita LGPD
    cy.get('input[type="checkbox"]').check();
    
    cy.contains("button", "Criar Minha Conta").click();

    // Aguarda o redirecionamento para o dashboard
    cy.url().should("include", "/dashboard");
  });

  it("Deve simular um cliente criando um agendamento com sucesso", () => {
    // Passo 1: O cliente deve acessar a aba de agendamentos e clicar no botão "Novo Agendamento"
    cy.contains("a", "Agendar Horário").click();
    cy.url().should("include", "/agendamentos");
    cy.contains("button", "+ Novo Agendamento").click();

    // Passo 2: O sistema já tem barbeiros na base (admin pode estar cadastrado, ou barbeiros falsos)
    // Se não houver barbeiros, a div "Barbeiro" com o nome não existirá, então clicamos no primeiro barbeiro disponível
    cy.get(".barbeiro-card").first().click();

    // Passo 3: Escolher um Serviço (Clica no primeiro serviço da lista)
    cy.get(".servico-card").first().click();

    // Passo 4: Escolher uma Data (Ex: Clicar na aba de Quinta-Feira, e num botão de data válida disponível se existir, mas no Wizard atual basta clicar nos slots)
    // Para simplificar, como o layout depende de dias, vamos pegar o primeiro "Dia" disponível na tab list se tiver, ou simplesmente prosseguir para horários se não houver bloqueio rígido na UI:
    // O wizard exige clicar em um "Dia" primeiro
    cy.get(".wizard-days-scroll button").eq(3).click(); // Clica num dia futuro (índice 3 = 3 dias a frente)

    // Passo 5: Selecionar um Horário (Vamos pegar o primeiro botão de horário que não esteja 'disabled')
    cy.get(".slots-grid button:not(:disabled)").first().click();

    // Passo 6: Confirmar Agendamento (Resumo final)
    cy.contains("button", "Confirmar Agendamento").click();

    // Verificação de Sucesso
    cy.contains("Agendamento Confirmado!", { matchCase: false }).should("be.visible");
    cy.contains("button", "Voltar para o Início").click();

    // Deve estar no dashboard novamente
    cy.url().should("include", "/dashboard");
  });
});
