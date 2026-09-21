# Sokyo (Missão Arthur)

Sistema de gamificação de responsabilidades para crianças. Produto Plugwise, repositório independente (não compartilha código com nenhum outro sistema da Plugwise).

> "Pequenas missões. Grandes conquistas."

## Status atual (Fase 5 concluída — MVP completo)

- ✅ **Fase 0 — Auditoria** (`PROJECT_AUDIT.md`)
- ✅ **Fase 1 — Arquitetura** (`PRODUCT_ARCHITECTURE.md`)
- ✅ **Fase 2 — Banco**: schema SQLite (`src/db/schema.sql`), com seed inicial (família, Arthur, categorias, tarefas, recompensas, metas, conquistas).
- ✅ **Fase 3 — Core game**: crianças, tarefas (rotina/bônus/épica), conclusão, aprovação, XP e moedas como **transações auditáveis** (nunca um incremento direto de saldo), streak, níveis, histórico/diário. Coberto por 9 testes automatizados (`npm test`), todos passando.
- ✅ **Fase 4 — Pais e app da criança**: seleção de perfil sem senha, app da criança (Hoje / Personagem / Recompensas / Metas / Diário, incluindo checklist de missão épica), painel dos pais atrás de PIN (dashboard, CRUD de missões e recompensas, fila de aprovação, metas por filho, mesada com os dois modelos, troca de PIN).
- ✅ **Fase 5 — Polimento**: PWA instalável (manifest + ícones + service worker que cacheia só o shell, nunca a API), toast de conquista desbloqueada e subida de nível, barra de carregamento, auto-refresh que não atrapalha quem está digitando, avisos de conexão, animações leves respeitando `prefers-reduced-motion`.

Validado end-to-end com Playwright (mobile 390px e tablet 820px) em cada fase, além dos 9 testes automatizados de backend. Pronto para uso real da família — falta só o deploy na VPS (ver seção abaixo).

A interface visual da versão anterior do protótipo está preservada em `public/legacy-reference.html` — a nova interface (`public/js/`, `public/css/`) manteve a mesma identidade (paleta verde/dourado, Baloo 2 + Nunito, cards arredondados) sobre o modelo de dados novo.

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
