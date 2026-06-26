# Log de Execução: [TASK-024] Criar "Modo PDV Dedicado (Frente de Caixa)" em tela cheia, ocultando a barra lateral (sidebar) e o cabeçalho administrativo

- **Autor**: A definir
- **Data**: A definir
- **Branch**: `main`
- **Status**: 🔲 Backlog — Não iniciada

## Descrição

Criar um modo de operação dedicado para frente de caixa (PDV — Ponto de Venda), onde a interface é exibida em tela cheia sem a sidebar e sem o cabeçalho administrativo. O objetivo é oferecer uma experiência limpa e focada para o operador de caixa, sem distrações do painel administrativo completo.

## Critérios de Aceitação

- [ ] Criar rota dedicada para o modo PDV (ex: `/pdv` ou `/caixa`)
- [ ] Layout sem sidebar e sem header administrativo (tela limpa, modo quiosque)
- [ ] Exibir as funcionalidades essenciais de caixa: agendamentos do dia, check-in, pagamento
- [ ] Botão de saída para voltar ao painel administrativo completo
- [ ] Compatível com telas de tablet e monitores touch
- [ ] Aplicar modo tela cheia (Fullscreen API) ao entrar no PDV
- [ ] Respeitar o tenant do usuário logado

## Arquivos Relacionados

- `app/pdv/` — nova rota a ser criada (ou `app/caixa/`)
- `app/layout.tsx` — verificar separação de layouts
- `components/` — componentes reutilizáveis de PDV

## Notas / Dicas de Implementação

- Criar um layout separado para a rota `/pdv` sem importar o `AppSidebar`
- Usar `document.documentElement.requestFullscreen()` para modo quiosque
- Avaliar com o usuário quais módulos devem aparecer no PDV (agendamentos, pagamentos, produtos?)
- Proteger a rota com autenticação — apenas usuários com permissão de caixa
- Considerar um PIN ou confirmação para sair do modo PDV
