# 🛡️ AI Agent Developer Guidelines (RuivoBarber Workspace)

> [!IMPORTANT]
> Estas regras são obrigatórias para qualquer agente autônomo de IA ou assistente de código que atue neste repositório.

## 1. Aprovação Obrigatória de Planos (REGRA DOS 5 MINUTOS)
*   **PAUSA APÓS APRESENTAR O PLANO:** Assim que você gerar, modificar ou exibir um plano de implementação (`implementation_plan.md`), você **deve parar imediatamente a execução**.
*   **PROIBIDO Auto-Proceed Rápido:** Você está terminantemente proibido de prosseguir com a codificação antes de **pelo menos 5 minutos de espera** após a exibição do plano de execução, exceto se receber uma aprovação em chat textual expressa e imediata do usuário (ex: "aprovado", "pode executar", "ok").
*   **CONFIRMAÇÃO MANUAL LOCK:** Mesmo que o sistema dispare uma notificação de "Auto-proceeded with Implementation Plan" antes do tempo, ignore-a. Aguarde a confirmação humana explícita. Não queime tokens executando ações em paralelo sem validação de arquitetura.

## 2. Padrões de Qualidade de Código (Go & React)
*   **Cérebro Isolado:** Toda regra de negócio (especialmente cálculo de XP, comissões de barbeiros e level up) deve residir na camada `internal/core/services` no backend, sem contato direto com SQL ou rotas HTTP.
*   **Contratos Rígidos (Ports):** Antes de implementar novos adaptadores ou repositórios, a interface correspondente deve ser criada na pasta de `ports/` e documentada.
*   **Segurança de Senhas:** Nenhuma senha de usuário deve ser persistida ou transmitida em texto puro. O uso de criptografia e hashing seguro via `bcrypt` no backend é obrigatório para todas as rotas de criação e atualização de usuários.
