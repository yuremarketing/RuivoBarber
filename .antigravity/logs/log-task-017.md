# Log de Execução: [TASK-017] Renomeação das Configurações do Sistema e Página de Minha Conta

- **Autor**: Antigravity (LLM)
- **Data**: 2026-06-12
- **Branch**: `main`

## Resumo das Alterações
1. **Renomeação do Menu**: O item "Configurações" no menu principal da sidebar foi renomeado para "Configurações do Sistema" em `app-sidebar.tsx`.
2. **Página de Minha Conta**: Criada a rota `/dashboard/minha-conta/page.tsx` para edições do perfil do usuário logado (Nome de exibição, Email leitura, Cargo leitura).
3. **Server Action**: Criada a action `updateProfile` em `app/actions/profile.actions.ts` para persistência dos dados do usuário.
4. **Mapeamento de Rotas**: Atualizados os breadcrumbs no header para lidar com a nova nomenclatura e nova página.

## Arquivos Modificados/Criados
- [MOD] [components/layout/app-sidebar.tsx](file:///home/mark/Dev/petwork/components/layout/app-sidebar.tsx)
- [MOD] [components/layout/dashboard-header.tsx](file:///home/mark/Dev/petwork/components/layout/dashboard-header.tsx)
- [NEW] [app/actions/profile.actions.ts](file:///home/mark/Dev/petwork/app/actions/profile.actions.ts)
- [NEW] [app/dashboard/minha-conta/page.tsx](file:///home/mark/Dev/petwork/app/dashboard/minha-conta/page.tsx)

## Como Validar / Testar
1. Navegue pelo link "Minha Conta" no dropdown do rodapé da barra lateral e edite o nome do usuário.
2. Verifique se o nome é atualizado instantaneamente no rodapé e na mensagem de boas-vindas do dashboard.
