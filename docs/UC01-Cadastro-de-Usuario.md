# Caso de Uso 01: Cadastro de Novo Usuário (Sign Up)

## 1. Resumo
Permite que um visitante do sistema crie uma nova conta para acessar as funcionalidades do RuivoBarber (agendamentos, gamificação RPG, etc).

## 2. Atores
- **Visitante:** Usuário não autenticado tentando criar uma conta.

## 3. Pré-condições
- O sistema deve estar online e o banco de dados acessível.
- O visitante não pode escolher um `login` (nome de usuário) já existente.

## 4. Fluxo Principal (Caminho Feliz)
1. O visitante acessa a tela inicial do sistema.
2. O visitante seleciona a aba "Criar Conta".
3. O sistema apresenta o formulário com os campos: `Nome Completo`, `Login (Nome de Usuário)`, e `Senha`.
4. O sistema apresenta uma caixa de seleção (checkbox) obrigatória ou opcional para consentimento de notificações via WhatsApp (campo `whatsappconsent`).
5. O visitante preenche todos os campos obrigatórios corretamente e marca o consentimento.
6. O visitante clica em "CRIAR MINHA CONTA".
7. O sistema valida os dados inseridos (ex: verifica se a senha atende aos requisitos de segurança e se o login está disponível).
8. O sistema registra o novo usuário no banco de dados (tabela `usuarios`), salvando também a preferência do `whatsappconsent`.
9. O sistema exibe uma mensagem de sucesso ("Conta criada com sucesso!") e redireciona o usuário para o Dashboard ou tela de Login.

## 5. Fluxos de Exceção e Alternativos

### [A1] Login já em uso
- No Passo 7, se o sistema identificar que o login escolhido já existe, ele interrompe o fluxo e exibe a mensagem de erro: "Este nome de usuário já está em uso, por favor escolha outro."

### [A2] Campos vazios ou inválidos
- No Passo 7, se algum campo obrigatório não for preenchido, o sistema avisa o usuário sobre os campos faltantes e impede o cadastro.

### [A3] Erro de Banco de Dados (Ex: Coluna Inexistente)
- No Passo 8, caso ocorra um erro de infraestrutura (ex: coluna `whatsappconsent` não existir na tabela), o sistema deve tratar a falha, logar o erro internamente e exibir uma mensagem amigável: "Ocorreu um erro interno ao criar sua conta. Tente novamente mais tarde ou contate o suporte."

## 6. Pós-condições
- Um novo registro de usuário é criado no banco de dados e o usuário está apto a fazer login no sistema.
