# Gestão de Segredos (RC-1)

A integridade e segurança dos dados do projeto RuivoBarber exigem que credenciais reais nunca sejam injetadas no histórico de versão (Git).

## Onde ficam as credenciais?

As variáveis sensíveis e credenciais de ambiente residem **exclusivamente** nos arquivos ocultos `.env`, seja na raiz do projeto ou dentro das pastas de serviço.

Arquivos configurados no ambiente local:
- `backend/.env`
- `frontend/.env`
- `.env` (Raiz)

## O que NUNCA deve ser commitado?

Nenhum arquivo `.env` (ou variações como `.env.local`, `.env.production`, etc.) deve ser adicionado ao repositório. O `.gitignore` está configurado para bloquear a subida destes arquivos e eles foram expurgados do rastreamento (tracking) do Git.

Nunca crie chaves hardcoded no:
- `docker-compose.yml`
- Códigos-fonte (`.go`, `.js`, `.ts`)
- Arquivos JSON de configuração pública

## Como configurar um ambiente novo?

Ao clonar o projeto em um novo ambiente ou na máquina de um colaborador:

1. Localize os arquivos `.env.example`.
2. Duplique-os e renomeie-os para `.env`.
3. Preencha as credenciais verdadeiras localmente (exemplo: `MERCADO_PAGO_ACCESS_TOKEN`, `SENTRY_DSN`, `DISCORD_WEBHOOK_URL`).
4. Rode a infraestrutura ou o backend/frontend isoladamente.

O `.env.example` serve apenas como um molde vazio e **deve** ser mantido atualizado sempre que o sistema exigir uma nova variável de ambiente.
