# Sokyo (Missão Arthur)

Sistema de gamificação de responsabilidades para crianças. Produto Plugwise, repositório independente (não compartilha código com nenhum outro sistema da Plugwise).

> "Pequenas missões. Grandes conquistas."

## Status atual (Fase 2 + Fase 3 concluídas)

- ✅ **Fase 0 — Auditoria** (`PROJECT_AUDIT.md`)
- ✅ **Fase 1 — Arquitetura** (`PRODUCT_ARCHITECTURE.md`)
- ✅ **Fase 2 — Banco**: schema SQLite (`src/db/schema.sql`), com seed inicial (família, Arthur, categorias, tarefas, recompensas, metas, conquistas).
- ✅ **Fase 3 — Core game**: crianças, tarefas (rotina/bônus/épica), conclusão, aprovação, XP e moedas como **transações auditáveis** (nunca um incremento direto de saldo), streak, níveis, histórico/diário. Coberto por 9 testes automatizados (`npm test`), todos passando.
- ⏳ **Fase 4 — Pais** (dashboard, CRUD administrativo, mesada): endpoints já existem no backend; falta a interface.
- ⏳ **Fase 5 — Polimento**: PWA, frontend completo, estados vazios/loading, responsividade.

A interface visual (HTML/CSS) da versão anterior do protótipo está preservada em `public/legacy-reference.html`, como referência de identidade visual (cores, tipografia, layout de cards) para reconstruir a interface em cima da nova API — ainda não está conectada a ela.

## Stack

- **Backend**: Node.js 22+ (usa `node:sqlite`, nativo — zero dependências de banco externas) + Express.
- **Frontend**: por enquanto só um placeholder; será reconstruído em HTML/CSS/JS.
- **Persistência**: SQLite (`data/sokyo.db`), schema relacional com transações de XP/moedas auditáveis, multi-filhos desde a raiz do schema.
- **Testes**: `node --test` (nativo do Node), sem dependências extras.

## Rodando localmente

```bash
npm install
npm test        # roda os 9 testes das regras críticas
npm start        # sobe em http://localhost:3000
```

PIN inicial dos pais (seed): `1010`.

## Deploy (Docker)

```bash
docker compose up -d --build
```

Sobe na porta `3010` só em `127.0.0.1` (mapeamento em `docker-compose.yml`) — pensado para ficar atrás de um reverse proxy (Nginx/Caddy) que já exista na VPS, sem expor a porta direto na internet.

**Importante — isolamento na VPS**: este projeto vai para a mesma VPS de outros sistemas da Plugwise, mas em repositório, container e porta próprios, sem tocar em nada existente. Antes de configurar o subdomínio `sokyo.plugwise.com.br`, ainda preciso confirmar como o roteamento de subdomínios já está montado nessa VPS (Nginx? Caddy?) para não colidir com nada — ver `PRODUCT_ARCHITECTURE.md`, seção 8.

## Estrutura

```
src/
  db/            # schema.sql + abertura do banco + seed inicial
  repositories/  # acesso a dados, uma tabela (ou tabelas relacionadas) por arquivo
  services/       # regras de negocio (gameService, rewardsService, allowanceService, reportService, achievementsService)
  routes/         # camada HTTP (Express), fina - so valida entrada e chama services/repositories
tests/           # testes de ponta a ponta das regras criticas (node:test)
public/          # frontend (placeholder + referencia visual do prototipo anterior)
```
