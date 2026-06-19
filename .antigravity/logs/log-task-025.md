# Log de Execução: [TASK-025] Ajustar os itens de "Status do Estoque" para exibir dados reais, tooltips de estoque mínimo e vincular o botão "Fazer Pedido" à rota de estoque

- **Autor**: Antigravity (LLM)
- **Data**: 2026-06-12
- **Branch**: `main`

## Resumo das Alterações
1. **Nova Server Action**: Criada a Server Action otimizada `getDashboardStockStatus` que retorna apenas os campos necessários (`id`, `name`, `stock`, `minStock`, `unit`), calculando ratios no servidor e limitando aos 3 mais próximos de ruptura, isolados por tenant.
2. **Dinamicização no Frontend**: O widget de estoque foi dinamicizado com suporte a esqueleto de carregamento, placeholder de erro, visualização de limite por tooltips Shadcn UI e código de cores conforme limite crítico (Vermelho, Amarelo, Verde).
3. **Link de Pedido**: Ajustado botão "Fazer Pedido" para navegar via Next.js `Link` para a tela de estoque.

## Arquivos Modificados/Criados
- [MOD] [app/actions/inventory.actions.ts](file:///home/mark/Dev/petwork/app/actions/inventory.actions.ts)
- [MOD] [app/dashboard/page.tsx](file:///home/mark/Dev/petwork/app/dashboard/page.tsx)

## Como Validar / Testar
1. Acesse o Dashboard em `/dashboard`.
2. Verifique o esqueleto animado durante a inicialização e os itens carregados.
3. Passe o mouse sobre um produto e confira se a tooltip de estoque mínimo/atual é exibida.
4. Clique em "Fazer Pedido" e certifique-se de que é redirecionado para `/dashboard/estoque`.
