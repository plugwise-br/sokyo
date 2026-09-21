# PRODUCT_ARCHITECTURE.md — Missão Arthur

Plano técnico decorrente da auditoria (`PROJECT_AUDIT.md`). Ainda não implementado — para aprovação antes da Fase 2.

## 1. Stack (confirmada, sem migração)

- **Backend**: Node.js + Express, reorganizado em `routes/ → services/ → repositories/`.
- **Persistência**: SQLite (arquivo único na VPS, sem serviço externo).
- **Frontend**: HTML/CSS/JS vanilla, reorganizado em módulos (`api.js`, `state.js`, `views/`), sem framework por enquanto — reavaliar React/Preact só se o produto crescer além do escopo familiar.
- **Deploy**: Docker + docker-compose, container próprio, porta própria, sem tocar nos demais serviços da VPS.

## 2. Entidades (schema conceitual)

```
families            (id, name, created_at)
parents             (id, family_id, name, pin_hash, role)
children             (id, family_id, name, avatar, created_at)
levels               (id, min_xp, name)                         -- "Aventureiro", "Explorador"...
task_categories       (id, family_id, name, icon, color)
tasks                (id, family_id, category_id, name, description, icon,
                       type[rotina|bonus|epica], frequency, days_of_week, time,
                       xp, coins, requires_approval, active)
task_subtasks         (id, task_id, name, order)                 -- só para missões épicas
task_completions      (id, task_id, child_id, date, status[pending|approved|rejected],
                       requested_at, resolved_at, resolved_by)
xp_transactions        (id, child_id, amount, source_type, source_id, created_at)
coin_transactions      (id, child_id, amount, source_type, source_id, created_at)
streaks                (child_id, current, best, last_active_date)
rewards               (id, family_id, name, description, icon, type[material|privilegio|experiencia|financeira],
                       cost_coins, requires_approval, stock, active)
reward_redemptions     (id, reward_id, child_id, status[pending|approved|rejected], created_at, resolved_at)
goals                (id, family_id, child_id, name, icon, target_coins, created_at)
achievements           (id, family_id, name, description, icon, rule_type, rule_value)
child_achievements     (id, child_id, achievement_id, unlocked_at)
allowance_settings     (id, family_id, model[fixed|performance], base_value, coin_value)
```

**Regra de ouro (item 11 do briefing)**: saldo de moeda e XP nunca são gravados diretamente — são sempre a soma de `coin_transactions`/`xp_transactions`. Isso resolve os requisitos de auditoria e "XP nunca desaparece".

## 3. Fluxos principais

### 3.1 Criança conclui tarefa
```
Criança seleciona perfil (sem senha) → escolhe missão do dia
→ marca "Concluí!"
→ cria task_completion (status = pending, se requires_approval; senão approved direto)
→ se approved (imediato ou depois da validação dos pais):
    → grava xp_transaction (+xp da tarefa)
    → grava coin_transaction (+coins da tarefa)
    → recalcula streak (se já não contabilizou hoje)
    → verifica regras de achievements (ex.: "7 dias seguidos") e desbloqueia se aplicável
```

### 3.2 Missão épica
```
Criança abre a missão épica → marca subtarefas uma a uma (armazenado local até enviar, ou por completion parcial)
→ quando todas concluídas → cria 1 task_completion para a missão-mãe
→ segue o fluxo 3.1 normalmente (aprovação, xp, coins, achievement possível)
```

### 3.3 Resgate de recompensa (hoje inexistente — a implementar)
```
Criança solicita recompensa (custo em moedas)
→ sistema verifica saldo (derivado de coin_transactions) >= custo
→ cria reward_redemption (pending, se requires_approval)
→ pai aprova → grava coin_transaction NEGATIVA (custo) + marca redemption approved
→ pai rejeita → redemption rejected, nenhuma transação é criada
```

### 3.4 Painel dos pais
```
PIN → sessão (token com expiração, como já existe hoje, agora validando pin_hash)
→ dashboard por filho: nível, xp, moedas, streak, pendências
→ CRUD de tasks / rewards / goals / achievements / allowance_settings
→ fila de aprovação (task_completions + reward_redemptions pendentes)
```

## 4. Permissões (backend valida sempre, nunca confia no frontend)

| Ação | Criança (sem sessão) | Pai/mãe autenticado |
|---|---|---|
| Ver missões do dia, personagem, recompensas, metas, diário | ✅ | ✅ |
| Marcar tarefa como concluída | ✅ (cria `pending`, nunca `approved` direto se `requires_approval=true`) | ✅ |
| Aprovar/rejeitar conclusão ou resgate | ❌ | ✅ |
| Criar/editar/excluir tasks, rewards, goals, achievements | ❌ | ✅ |
| Alterar saldo de moeda/XP diretamente | ❌ (não existe endpoint para isso — só via transação) | ❌ (mesma regra vale pros pais: tudo passa por transação) |
| Configurar mesada, trocar PIN | ❌ | ✅ |

## 5. Níveis iniciais (seed)

| Nível | Nome | XP mínimo |
|---|---|---|
| 1 | Aventureiro | 0 |
| 2 | Explorador | 100 |
| 3 | Guardião | 300 |
| 4 | Herói | 600 |
| 5 | Mestre da Autonomia | 1000 |

Tabela `levels`, então dá pra adicionar mais depois sem mexer em código.

## 6. Multi-filhos (arquitetura pronta, telas não)

Todo endpoint passa a exigir `child_id`. A tela de seleção de perfil da criança lista `children` da família. No MVP só existirá 1 registro (Arthur), mas nenhum endpoint assume "criança única" — evita retrabalho quando o segundo filho entrar.

## 7. Fases de implementação (como pedido, uma por vez)

1. **Fase 2 — Banco**: criar schema SQLite + script de migração dos dados atuais (`data/db.json` → tabelas), sem perder o histórico de mesada já existente (se já estiver em uso quando migrarmos).
2. **Fase 3 — Core game**: children, tasks (com tipos/frequência), completions, xp/coin transactions, streaks, níveis, histórico.
3. **Fase 4 — Pais**: PIN com hash, dashboard, aprovação, rewards + redemptions, goals, achievements, mesada configurável (fixa/performance).
4. **Fase 5 — Polimento**: PWA (manifest + ícones + service worker leve), estados vazios/loading/erro, responsividade fina em tablet, testes (`node:test`) cobrindo as 10 regras críticas do item 37.

Cada fase termina com: rodar os testes daquela fase, validar build, checar responsividade, só então seguir pra próxima — sem deixar erro conhecido para trás, como pedido.

## 8. Em aberto — preciso de decisão de vocês antes de seguir

1. **Nome definitivo do app** (define o `xxxx.plugwise.com.br` e o nome do repositório).
2. **Onde criar o repositório**: organização/conta GitHub de destino (a sessão atual só tem acesso a `plugwise-br/eventos` — preciso que vocês me deem acesso ao destino certo, ou peçam explicitamente pra eu usar essa mesma org com outro nome de repo).
3. **Acesso/descrição da VPS**: não vou tocar em nada da infraestrutura existente sem antes entender como os outros sistemas da Plugwise rodam lá (Nginx/Docker/PM2/Caddy, como o roteamento de subdomínio é feito hoje). Preciso de acesso (SSH) ou de uma descrição de como está montado, para propor um plano de deploy isolado e reversível.
4. **Modelo de mesada**: confirmar se querem os dois modelos (fixa e por desempenho) disponíveis desde a Fase 4, ou só um deles no MVP.

Sem essas respostas eu sigo travado nesses pontos específicos, mas já posso avançar a Fase 2 (banco) e Fase 3 (core game) localmente, sem depender de repositório/VPS definidos.
