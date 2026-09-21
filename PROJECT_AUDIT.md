# PROJECT_AUDIT.md — Missão Arthur

Data: 2026-09-21
Escopo: auditoria do protótipo atual (`missao-arthur-app`), único código existente do produto. Ainda não há repositório Git nem deploy em nenhuma VPS.

## 1. Stack atual

| Camada | Tecnologia | Observação |
|---|---|---|
| Backend | Node.js + Express 4 | 1 arquivo (`server.js`, 333 linhas), sem framework de estrutura (sem rotas separadas, sem camada de serviço) |
| Frontend | HTML + CSS + JavaScript vanilla | 1 arquivo (`public/index.html`, 723 linhas), renderização via `innerHTML` (template strings), sem build step, sem framework |
| Persistência | Arquivo JSON único (`data/db.json`) | Todo o estado da família cabe em um objeto: `{ state, catalog, goals, logs, ledger }` |
| Autenticação | PIN único + token de sessão em memória (`Map`) | Sem hash do PIN, sem usuário/senha real, sessão perdida a cada restart do processo |
| Deploy | Dockerfile + docker-compose.yml prontos | Testado localmente (curl), nunca implantado em VPS |
| Testes | Nenhum | — |
| PWA | Nenhum | Sem `manifest.json`, sem service worker, sem ícones de instalação |
| Dependências | Só `express` (1 pacote) | Superfície de ataque mínima, o que é bom |

**Veredito da stack**: Node + Express como camada de API é adequado e deve ser mantido — é leve, roda em qualquer VPS, zero contas de terceiros, e atende ao requisito "mesma VPS, isolado". **Não recomendo migrar para Supabase** neste momento: o backend próprio já resolve persistência e sincronização entre dispositivos, e trocar agora adicionaria uma dependência externa (conta, faturamento, rede) sem necessidade — o item 4 do briefing já autoriza isso ("se a stack atual for adequada, mantenha-a"). O ponto real que **não é adequado** é a camada de armazenamento (ver seção 4).

## 2. Arquitetura atual

```
Navegador (público)
   │  fetch /api/*  (polling a cada 5s)
   ▼
Express (server.js)
   │  tudo em um único módulo: rotas + regras de negócio + acesso a dados
   ▼
data/db.json  (um único documento, reescrito por inteiro a cada mutação)
```

Não há separação entre UI, regras de negócio e persistência (item 27 do briefing pede exatamente essa separação). Todas as três coisas estão misturadas em `server.js` e em `index.html`.

## 3. Funcionalidades existentes (funcionam de ponta a ponta, testado com curl)

- Criança marca tarefa como feita → vira log `pending`.
- Pai/mãe autentica por PIN → recebe token de sessão (8h) → aprova/rejeita.
- Aprovação credita moeda a um saldo único (`totalEarned - totalRedeemed`) e a um "XP por atributo" (`pillarXP`), mas **XP de nível e moeda são a mesma grandeza** (ver seção 4).
- Streak (dias seguidos) calculado no servidor, baseado em fuso America/Sao_Paulo.
- CRUD de tarefas e de metas/recompensas pelos pais (nome, ícone, moedas, categoria, ativo/inativo).
- "Fechar semana" converte moedas aprovadas na semana em mesada (R$), com trava para não pagar duas vezes.
- Histórico (`ledger`) só registra eventos de mesada — não registra cada crédito de moeda individual como transação.

## 4. O que está mockado / simplificado demais para a visão de produto

Comparando com os itens 5–21 do briefing:

1. **XP e moedas não são conceitos separados.** Hoje existe um único contador (`totalEarned`) que serve tanto de "saldo gastável" quanto de "progresso de nível". O briefing exige que sejam independentes (ex.: uma tarefa pode dar só XP, sem moeda). Isso exige refatorar o modelo de dados, não é cosmético.
2. **Sem sistema de transações.** Crédito de moeda/XP é hoje um `st.totalEarned += log.coins` direto (mutação simples). O briefing exige `xp_transactions` / `coin_transactions` auditáveis — nenhuma existe hoje, só o `ledger` de mesada.
3. **Sem conquistas/badges.** Não existe a entidade `achievements` nem lógica de desbloqueio.
4. **Sem missões épicas (subtarefas).** O catálogo de tarefas é flat, uma tarefa = uma ação simples. Não há composição.
5. **Sem tipos de tarefa** (rotina / bônus / épica) nem frequência/dias da semana/horário configuráveis — hoje toda tarefa aparece todo dia, sem agenda.
6. **Aprovação é sempre obrigatória.** Não há flag por tarefa para pular aprovação.
7. **Recompensas não têm tipo** (material/privilégio/experiência/financeira) nem fluxo de solicitação→aprovação — hoje "Recompensas" só mostra barra de progresso; **não existe endpoint de resgate**, é só visualização.
8. **Metas e recompensas são a mesma entidade** (`goals`) hoje; o briefing trata "loja de recompensas" e "minhas metas" como conceitos relacionados mas distintos (recompensa = algo que se compra com moedas agora; meta = acúmulo de longo prazo, pode não ser "compra" no sentido de loja).
9. **Sem multi-filhos.** Todo o schema é um documento único por família — não há entidade `children`. Adicionar um segundo filho hoje exigiria duplicar o servidor inteiro.
10. **Níveis sem nome.** Existe `Math.floor(xp/100)+1`, mas não há mapeamento para "Aventureiro / Explorador / Guardião...".
11. **Relatório semanal por categoria em barras** não existe como visão dedicada (dá pra derivar dos dados, mas não está implementado).
12. **PWA**: zero. Sem manifest, sem ícones, sem "adicionar à tela inicial" configurado, sem service worker.
13. **Segurança**: o PIN é comparado em texto puro (sem hash), guardado no mesmo JSON do resto do estado; sessões vivem só em memória (reiniciar o processo desloga todo mundo); não há distinção de permissões entre "pai" e "mãe" (um PIN só, papel único "pais").
14. **Testes**: nenhum. O briefing pede testes específicos para as 10 regras críticas (seção 37) — nenhuma delas tem cobertura hoje.

## 5. O que está bem feito e deve ser preservado

- **Identidade visual**: paleta (verde + dourado + fundo claro), tipografia (Baloo 2 + Nunito), cards arredondados, "sensação de game" sem ser infantil — bate com o item 23 do briefing. Reaproveitar integralmente.
- **Separação de fluxo criança vs. pais** com PIN — o modelo de interação já está certo, só falta reforçar a validação no backend (já existe via `requireAuth`, é um bom começo).
- **Fuso horário tratado no servidor** (America/Sao_Paulo) em vez de confiar no relógio do aparelho — decisão correta, manter.
- **Escrita atômica em disco** (`.tmp` + rename) — bom hábito, evita corrupção de arquivo, vale preservar o princípio mesmo trocando o formato de armazenamento.
- **Zero dependências externas** de conta/serviço — alinhado com a exigência de isolamento na VPS.

## 6. Recomendação de armazenamento

Um único JSON não aguenta as novas exigências (transações auditáveis, múltiplos filhos, consultas de relatório por categoria/semana). Recomendo migrar a persistência para **SQLite** (via `node:sqlite`, nativo do Node 22+, ou `better-sqlite3` se a VPS estiver em Node mais antigo) — continua sendo um único arquivo na VPS, zero serviço externo, zero conta nova, mas ganha:
- Transações reais (`xp_transactions`, `coin_transactions`) com consistência.
- Consultas agregadas para o relatório semanal/por categoria sem carregar tudo em memória.
- Suporte natural a múltiplos filhos/pais via chaves estrangeiras.

Isso é uma troca de **camada de armazenamento**, não de stack — Express continua sendo a API, o deploy continua sendo o mesmo Docker/VPS.

## 7. Riscos / dívidas técnicas a resolver na Fase 1 (arquitetura)

- Definir claramente as entidades novas (`families`, `children`, `tasks`, `task_completions`, `xp_transactions`, `coin_transactions`, `rewards`, `reward_redemptions`, `goals`, `achievements`, `streaks`) — ver `PRODUCT_ARCHITECTURE.md`.
- Separar `server.js` em módulos: rotas / serviços (regras de negócio) / repositório (acesso a dados) — hoje tudo está junto.
- Decidir o nome definitivo do app (afeta o subdomínio `xxxx.plugwise.com.br`) e criar o repositório novo no GitHub antes de qualquer deploy.
- Isolamento na VPS: como ainda não sei como os outros sistemas da Plugwise estão publicados nela (Nginx? Docker? PM2? Caddy?), **não vou propor configuração de deploy definitiva até vocês me passarem acesso/descrição da VPS** — o Dockerfile atual já roda em porta própria (3000) e não assume nada sobre o host, o que facilita esse isolamento quando chegar a hora.
