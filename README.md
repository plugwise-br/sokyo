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
- **Frontend**: HTML/CSS/JS vanilla com ES modules (`public/js/`), sem build step, PWA instalável.
- **Persistência**: SQLite (`data/sokyo.db`), schema relacional com transações de XP/moedas auditáveis, multi-filhos desde a raiz do schema.
- **Testes**: `node --test` (nativo do Node), sem dependências extras.

## Rodando localmente

```bash
npm install
npm test        # roda os 9 testes das regras críticas
npm start        # sobe em http://localhost:3000
```

PIN inicial dos pais (seed): `1010`.

## Deploy na VPS

Runbook completo, com diagnóstico da infraestrutura existente antes de mexer em qualquer coisa (a VPS já roda outros sistemas da Plugwise — o deploy é isolado e nunca assume que ela está vazia): **ver [`DEPLOY.md`](./DEPLOY.md)**.

Resumo: `bash deploy/discover.sh` (só lê o ambiente) → `bash deploy/deploy.sh` (sobe o container numa porta livre, detectada automaticamente) → configurar `sokyo.plugwise.com.br` no Nginx/Caddy existente com os exemplos em `deploy/`.

## Estrutura

```
src/
  db/            # schema.sql + abertura do banco + seed inicial
  repositories/  # acesso a dados, uma tabela (ou tabelas relacionadas) por arquivo
  services/       # regras de negocio (gameService, rewardsService, allowanceService, reportService, achievementsService)
  routes/         # camada HTTP (Express), fina - so valida entrada e chama services/repositories
tests/           # testes de ponta a ponta das regras criticas (node:test)
public/
  index.html, css/, js/   # frontend (ES modules, sem build step)
  manifest.json, service-worker.js, icons/   # PWA
  legacy-reference.html    # referencia visual do prototipo anterior
deploy/          # scripts de deploy isolado (discover.sh, deploy.sh) + exemplos de Nginx/Caddy
```
