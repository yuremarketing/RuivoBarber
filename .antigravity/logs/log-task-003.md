# Log de Execução: [TASK-003] Analisar e Desenhar Engenharia de IA e RAG no Petwork

- **Autor**: Antigravity (LLM)
- **Revisores**: Mark, Claude
- **Data**: 2026-06-11
- **Branch**: `main`

## Resumo das Alterações
Desenho e detalhamento da arquitetura profissional de IA e RAG (Retrieval-Augmented Generation) alinhados estritamente com as diretrizes e limites técnicos do projeto Petwork SaaS.

## Detalhes do Design de Arquitetura Aprovados
1. **Padrão de Entrada (Entry Point)**:
   * Sem rotas de API adicionais. Todo o tráfego do chat e inteligência artificial será servido por Server Actions em `app/actions/ai.actions.ts`.
   * Streaming utilizando `createStreamableValue` do `@ai-sdk/google` via Vercel AI SDK de forma assíncrona.
2. **Segurança e Validação**:
   * Validação de payload de histórico de chat na Server Action usando o **Zod** para precaver abusos.
3. **Isolamento de Tenants (Multi-tenancy)**:
   * Centralização do método `getTenantId()` na camada compartilhada `lib/auth-helper.ts` para ser consumida de forma limpa por todos os módulos.
   * Filtro obrigatório de `organizationId` em todas as buscas semânticas e transações de IA.
4. **Banco Vetorial & Prisma**:
   * Acréscimo do modelo `DocumentChunk` no schema do Prisma utilizando `Unsupported("vector(768)")`.
   * Queries de similaridade no banco PostgreSQL executadas via `$queryRaw`.
5. **Performance e Ingestão de Dados**:
   * Modelo de embedding: Google `text-embedding-004` (vetores de 768 dimensões).
   * Ingestão Assíncrona: Para evitar o bloqueio da interface do usuário (UX) com latência de chamadas de rede da API de embeddings, as atualizações serão tratadas via execução assíncrona não bloqueante (fire-and-forget):
     ```typescript
     salvarPet(data).then(() => {
       ingestDataAction(petId).catch(console.error); // Execução assíncrona em background
     });
     ```

## Arquivos Modificados/Criados
- N/A (Apenas desenho conceitual documentado em logs e Kanban local)

## Verificação dos Requisitos (.antigravityrules)
- [x] Sem rotas de API clássicas.
- [x] Isolamento de dados por organização.
- [x] Definição de mapeamento de tipos primitivos para retorno ao cliente.
