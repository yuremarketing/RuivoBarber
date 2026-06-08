# 📝 Changelog - RuivoBarber

Todos os registros de evolução de engenharia relevantes e mudanças de versão deste projeto serão documentados aqui.

O projeto segue a especificação de [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) e respeita o versionamento semântico [SemVer](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-06-07

### Adicionado
- **Governança do Repositório:** Configuração inicial de restrições operacionais e limitação de taxa definidas em `.antigravityrules`.
- **Roteiro de Desenvolvimento:** Criação do `TASKS.md` detalhando as sprints do MVP (Infraestrutura, Backend, Frontend, Testes e Segurança).
- **Manual do Desenvolvedor:** Criação do `docs/GEMINI.md` contendo as regras de system override, exclusividade de ferramentas/skills e comandos de bootstrap.
- **Configurações Globais:** Configuração dos dotfiles `.gitignore` e `.env.example` protegendo credenciais locais, logs e binários.
- **Modelagem de Dados:** Criação do Dicionário de Dados em `docs/MODELS.md` mapeando PostgreSQL, Structs Go e React.
- **Docker Compose:** Preparação do ambiente de desenvolvimento orquestrado com instâncias para PostgreSQL (db), Fiber (backend) e Vite (frontend).
- **Estruturação do Git:** Inicialização do repositório Git e publicação na branch principal (`main`) no repositório GitHub (`yuremarketing/RuivoBarber`).
