# Log de Execução: [TASK-011] Corrigir fallback não determinístico do getTenantId() no helper de autenticação

- **Autor**: Antigravity (LLM)
- **Data**: 2026-06-12
- **Branch**: `main`

## Resumo das Alterações
1. **Helper de Autenticação**: Editado o arquivo [lib/auth-helper.ts](file:///home/mark/Dev/petwork/lib/auth-helper.ts) para remover a consulta findFirst sem critério de ordenação determinístico que buscava a organização do usuário caso a `activeOrganizationId` estivesse nula. Agora, a função retorna `null` diretamente em caso de ausência de organização ativa.
2. **Verificação**: Compilação TypeScript efetuada com sucesso sem erros.

## Arquivos Modificados/Criados
- [MOD] [lib/auth-helper.ts](file:///home/mark/Dev/petwork/lib/auth-helper.ts)
