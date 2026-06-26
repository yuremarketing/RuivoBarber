# Log de Execução: [TASK-022] Ajustar os itens de "Próximos Agendamentos" para exibir dados reais do banco, atalhos de link e tooltips informativas no mouseover

- **Autor**: A definir
- **Data**: A definir
- **Branch**: `main`
- **Status**: 🔲 Backlog — Não iniciada

## Descrição

Atualmente, os itens da seção "Próximos Agendamentos" no dashboard exibem dados mockados ou incompletos. Esta task tem como objetivo conectar essa seção ao banco de dados real, além de adicionar atalhos de navegação e tooltips informativas para melhorar a usabilidade.

## Critérios de Aceitação

- [ ] Exibir dados reais dos agendamentos vindos do banco de dados (Prisma/Supabase)
- [ ] Cada item de agendamento deve ter um link clicável que redireciona para a página de detalhes do agendamento
- [ ] Adicionar tooltips no mouseover com informações complementares (nome do pet, serviço, status, horário)
- [ ] Tratar estado de carregamento (loading skeleton)
- [ ] Tratar estado vazio (nenhum agendamento próximo)
- [ ] Garantir que apenas agendamentos futuros do tenant atual sejam exibidos

## Arquivos Relacionados

- `app/dashboard/page.tsx` — componente principal do dashboard
- `app/actions/` — server actions de agendamentos
- `prisma/schema.prisma` — modelo de agendamentos

## Notas / Dicas de Implementação

- Reutilizar server actions já existentes para busca de agendamentos
- Verificar se já existe query de agendamentos por data/tenant no projeto
- Usar componente `Tooltip` do shadcn/ui para as tooltips
- Limitar a exibição a ~5 próximos agendamentos para não sobrecarregar o dashboard
