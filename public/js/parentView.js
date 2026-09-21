import { api } from "./api.js";
import { esc, fmtBRL, TASK_TYPE_LABEL, REWARD_TYPE_LABEL } from "./format.js";

const TABS = [["dashboard", "Painel"], ["tarefas", "Missões"], ["aprovacao", "Aprovação"], ["recompensas", "Recompensas"], ["metas", "Metas"], ["mesada", "Mesada"]];

function headerHtml() {
  return `<div class="topbar">
    <div class="topbar-row">
      <div class="hero"><div class="avatar">👪</div><div><div class="hero-name">Painel dos Pais</div><div class="hero-sub">Missão Arthur · Sokyo</div></div></div>
      <button class="mode-toggle" id="btn-child">🧒 Modo criança</button>
    </div>
  </div>`;
}
function tabsHtml(tab) {
  return `<div class="tabs">${TABS.map(([id, label]) => `<button class="tab ${tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}</div>`;
}

// ---------------- Dashboard ----------------
async function tabDashboard() {
  const dash = await api.dashboard();
  const reports = await Promise.all(dash.children.map((c) => api.weeklyReport(c.id).catch(() => null)));

  let html = `<div class="card"><h2>Pendências</h2>
    <div class="stat-row" style="position:static; margin-top:10px">
      <div class="stat-pill" style="background:var(--pending-bg); color:var(--gold)">📋 <div><span class="n">${dash.pendingCompletions}</span><span class="l">missões p/ validar</span></div></div>
      <div class="stat-pill" style="background:var(--pending-bg); color:var(--gold)">🎁 <div><span class="n">${dash.pendingRedemptions}</span><span class="l">trocas p/ validar</span></div></div>
    </div></div>`;

  dash.children.forEach((c, i) => {
    const report = reports[i];
    html += `<div class="card">
      <div class="section-head">${c.avatar} ${esc(c.name)} · Nível ${c.level.level} (${esc(c.level.name)})</div>
      <div class="stat-row" style="position:static; margin:10px 0">
        <div class="stat-pill" style="background:var(--surface-2); color:var(--ink)">⭐ <div><span class="n">${c.xp}</span><span class="l">XP</span></div></div>
        <div class="stat-pill" style="background:var(--surface-2); color:var(--ink)">🪙 <div><span class="n">${c.coins}</span><span class="l">moedas</span></div></div>
        <div class="stat-pill" style="background:var(--surface-2); color:var(--ink)">🔥 <div><span class="n">${c.streak.current}</span><span class="l">dias (recorde ${c.streak.best})</span></div></div>
      </div>`;
    if (report) {
      html += `<p class="muted" style="margin-bottom:6px">Esta semana: <strong>${report.completed}</strong> missões concluídas</p>`;
      report.categories.forEach((cat) => {
        if (cat.completed === 0) return;
        html += `<div class="cat-bar-row"><span class="cat-bar-label">${cat.icon} ${esc(cat.name)}</span><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${cat.pct}%; background:${cat.color}"></div></div><span class="cat-bar-n">${cat.completed}</span></div>`;
      });
    }
    html += `</div>`;
  });
  return html;
}

// ---------------- Tarefas ----------------
async function tabTarefas() {
  const [tasks, categories] = await Promise.all([api.allTasks(), api.categories()]);
  let html = `<div class="card"><h2>Missões</h2><p class="muted">Edite, ative/desative ou crie novas missões. Tarefas do tipo "missão épica" têm subtarefas definidas na criação.</p></div>`;

  categories.forEach((cat) => {
    const items = tasks.filter((t) => t.category_id === cat.id);
    html += `<div class="card"><div class="section-head" style="color:${cat.color}">${cat.icon} ${esc(cat.name)}</div>`;
    if (items.length === 0) html += `<div class="empty">Nenhuma missão nessa categoria.</div>`;
    items.forEach((t) => {
      html += `<div class="list-item" data-task-row="${t.id}">
        <input type="text" class="grow" data-field="name" value="${esc(t.name)}" style="min-width:150px">
        <input type="number" class="sm" data-field="xp" value="${t.xp}" title="XP" min="0">
        <input type="number" class="sm" data-field="coins" value="${t.coins}" title="Moedas" min="0">
        <select data-field="type">${Object.entries(TASK_TYPE_LABEL).map(([v, l]) => `<option value="${v}" ${t.type === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <label class="checkline"><input type="checkbox" data-field="requiresApproval" ${t.requires_approval ? "checked" : ""}> aprovação</label>
        <label class="checkline"><input type="checkbox" data-field="active" ${t.active ? "checked" : ""}> ativa</label>
        <button class="icon-btn no" data-action="delete-task" data-id="${t.id}" title="Excluir">✕</button>
      </div>`;
    });
    html += `</div>`;
  });

  html += `<div class="card">
    <h2>Nova missão</h2>
    <div class="row" style="margin-top:10px; flex-wrap:wrap">
      <div class="field" style="min-width:140px"><label>Nome</label><input type="text" id="nt-name"></div>
      <div style="width:64px"><label>XP</label><input type="number" id="nt-xp" value="10" min="0"></div>
      <div style="width:64px"><label>Moedas</label><input type="number" id="nt-coins" value="2" min="0"></div>
    </div>
    <div class="row" style="margin-top:8px; flex-wrap:wrap">
      <div class="field"><label>Categoria</label><select id="nt-category">${categories.map((c) => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Tipo</label><select id="nt-type">${Object.entries(TASK_TYPE_LABEL).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
    </div>
    <div style="margin-top:8px" id="nt-subtasks-wrap" class="hidden">
      <label>Subtarefas da missão épica (uma por linha)</label>
      <textarea id="nt-subtasks" placeholder="Guardar brinquedos&#10;Organizar livros&#10;Arrumar cama"></textarea>
    </div>
    <label class="checkline" style="margin-top:10px"><input type="checkbox" id="nt-approval" checked> precisa de aprovação dos pais</label>
    <div style="margin-top:12px"><button class="btn btn-primary" id="nt-submit">Criar missão</button></div>
  </div>`;
  return html;
}

// ---------------- Aprovacao ----------------
async function tabAprovacao() {
  const [completions, redemptions] = await Promise.all([api.pendingCompletions(), api.pendingRedemptions()]);
  let html = `<div class="card"><h2>Missões para validar</h2>`;
  if (completions.length === 0) html += `<div class="empty">Nada pendente agora. 🎉</div>`;
  completions.forEach((c) => {
    html += `<div class="pending-row">
      <div class="task-icon">${c.task_icon}</div>
      <div class="task-body"><div class="task-name">${esc(c.task_name)}</div><div class="muted">${c.date} · +${c.task_xp} XP · +${c.task_coins} moedas</div></div>
      <button class="icon-btn ok" data-action="approve-completion" data-id="${c.id}">✓</button>
      <button class="icon-btn no" data-action="reject-completion" data-id="${c.id}">✕</button>
    </div>`;
  });
  html += `</div><div class="card"><h2>Trocas de recompensa para validar</h2>`;
  if (redemptions.length === 0) html += `<div class="empty">Nada pendente agora. 🎉</div>`;
  redemptions.forEach((r) => {
    html += `<div class="pending-row">
      <div class="task-icon">${r.reward_icon}</div>
      <div class="task-body"><div class="task-name">${esc(r.reward_name)}</div><div class="muted">${r.cost_coins} moedas</div></div>
      <button class="icon-btn ok" data-action="approve-redemption" data-id="${r.id}">✓</button>
      <button class="icon-btn no" data-action="reject-redemption" data-id="${r.id}">✕</button>
    </div>`;
  });
  html += `</div>`;
  return html;
}

// ---------------- Recompensas ----------------
async function tabRecompensas() {
  const rewards = await api.allRewards();
  let html = `<div class="card"><h2>Loja de recompensas</h2><p class="muted">Cadastre o que a criança pode trocar por moedas.</p></div><div class="card">`;
  rewards.forEach((r) => {
    html += `<div class="list-item" data-reward-row="${r.id}">
      <input type="text" class="grow" data-field="name" value="${esc(r.name)}">
      <input type="number" class="sm" data-field="costCoins" value="${r.cost_coins}" min="1" title="Custo">
      <select data-field="type">${Object.entries(REWARD_TYPE_LABEL).map(([v, l]) => `<option value="${v}" ${r.type === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <label class="checkline"><input type="checkbox" data-field="active" ${r.active ? "checked" : ""}> ativa</label>
      <button class="icon-btn no" data-action="delete-reward" data-id="${r.id}">✕</button>
    </div>`;
  });
  html += `<div style="margin-top:14px" class="row" style="flex-wrap:wrap">
    <div class="field" style="min-width:140px"><input type="text" id="nr-name" placeholder="Nova recompensa"></div>
    <div style="width:90px"><input type="number" id="nr-cost" placeholder="moedas" min="1" value="30"></div>
  </div>
  <div style="margin-top:8px"><select id="nr-type" style="width:100%">${Object.entries(REWARD_TYPE_LABEL).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
  <label class="checkline" style="margin-top:8px"><input type="checkbox" id="nr-approval" checked> precisa de aprovação</label>
  <div style="margin-top:10px"><button class="btn btn-primary" id="nr-submit">Adicionar recompensa</button></div>
  </div>`;
  return html;
}

// ---------------- Metas ----------------
async function tabMetas(state) {
  const children = await api.children();
  if (!state.metasChild && children[0]) state.metasChild = children[0].id;
  const childId = state.metasChild;
  const goals = childId ? await api.goals(childId) : [];
  let html = `<div class="card"><h2>🎯 Metas</h2>
    <div class="child-select-row">${children.map((c) => `<button class="child-chip ${c.id === childId ? "active" : ""}" data-action="pick-metas-child" data-id="${c.id}">${c.avatar} ${esc(c.name)}</button>`).join("")}</div>
  </div><div class="card">`;
  goals.forEach((g) => {
    html += `<div class="list-item" data-goal-row="${g.id}">
      <input type="text" class="grow" data-field="name" value="${esc(g.name)}">
      <input type="number" class="sm" data-field="targetCoins" value="${g.target_coins}" min="1" style="width:80px">
      <button class="icon-btn no" data-action="delete-goal" data-id="${g.id}">✕</button>
    </div>`;
  });
  html += `<div style="margin-top:14px" class="row" style="flex-wrap:wrap">
    <div class="field"><input type="text" id="ng-name" placeholder="Nova meta"></div>
    <div style="width:90px"><input type="number" id="ng-target" placeholder="moedas" min="1" value="500"></div>
  </div>
  <div style="margin-top:10px"><button class="btn btn-primary" id="ng-submit">Adicionar meta</button></div>
  </div>`;
  return html;
}

// ---------------- Mesada ----------------
async function tabMesada(state) {
  const [settings, children] = await Promise.all([api.allowanceSettings(), api.children()]);
  if (!state.mesadaChild && children[0]) state.mesadaChild = children[0].id;
  const childId = state.mesadaChild;

  let html = `<div class="card"><h2>Configuração da mesada</h2>
    <div class="row" style="margin-top:10px">
      <div class="field"><label>Modelo</label><select id="al-model">
        <option value="fixed" ${settings.model === "fixed" ? "selected" : ""}>Fixa</option>
        <option value="performance" ${settings.model === "performance" ? "selected" : ""}>Por desempenho</option>
      </select></div>
    </div>
    <div class="row" style="margin-top:10px">
      <div class="field"><label>Base fixa semanal (R$)</label><input type="number" id="al-base" step="0.01" min="0" value="${settings.base_value}"></div>
      <div class="field"><label>Valor por moeda (R$)</label><input type="number" id="al-coinvalue" step="0.01" min="0" value="${settings.coin_value}"></div>
    </div>
    <p class="muted" style="margin-top:8px">Modelo por desempenho paga: base + (moedas ganhas na semana × valor por moeda). Modelo fixo paga sempre a base, independente do desempenho.</p>
    <div style="margin-top:10px"><button class="btn btn-ghost" id="al-save">Salvar configuração</button></div>
  </div>`;

  html += `<div class="card"><div class="child-select-row">${children.map((c) => `<button class="child-chip ${c.id === childId ? "active" : ""}" data-action="pick-mesada-child" data-id="${c.id}">${c.avatar} ${esc(c.name)}</button>`).join("")}</div>`;
  if (childId) {
    const report = await api.weeklyReport(childId);
    const history = await api.allowanceHistory(childId);
    const alreadyPaid = history.some((h) => h.week_start === report.weekStart);
    html += `<div class="week-total"><span class="v">${report.coins}</span><span class="muted">moedas ganhas essa semana</span></div>`;
    if (alreadyPaid) html += `<div class="badge approved" style="display:inline-block">Mesada dessa semana já paga ✓</div>`;
    else html += `<button class="btn btn-primary" id="pay-week" data-child="${childId}" ${report.coins === 0 && settings.model === "performance" ? "" : ""}>Pagar mesada da semana</button>`;
    if (history.length > 0) {
      html += `<div style="margin-top:14px">`;
      history.forEach((h) => {
        html += `<div class="task"><div class="task-body"><div class="task-name">Semana de ${h.week_start}</div><div class="muted">${h.coins_spent} moedas</div></div><div style="font-weight:800; color:var(--primary)">${fmtBRL(h.value_brl)}</div></div>`;
      });
      html += `</div>`;
    }
  }
  html += `</div>`;

  html += `<div class="card"><h2>Trocar PIN dos pais</h2>
    <div class="row" style="margin-top:8px"><div class="field"><input type="text" id="pin-new" placeholder="Novo PIN (mín. 4 dígitos)"></div></div>
    <div style="margin-top:10px"><button class="btn btn-ghost" id="pin-save">Salvar PIN</button></div>
  </div>`;
  return html;
}

const state = { metasChild: null, mesadaChild: null };

export async function renderParentApp(root, ctx) {
  const { tab, setTab, goChild, toast } = ctx;
  let bodyHtml;
  try {
    if (tab === "dashboard") bodyHtml = await tabDashboard();
    else if (tab === "tarefas") bodyHtml = await tabTarefas();
    else if (tab === "aprovacao") bodyHtml = await tabAprovacao();
    else if (tab === "recompensas") bodyHtml = await tabRecompensas();
    else if (tab === "metas") bodyHtml = await tabMetas(state);
    else bodyHtml = await tabMesada(state);
  } catch (err) {
    bodyHtml = `<div class="card empty">Não foi possível carregar. ${err.code === "unauthorized" ? "Sessão expirada." : ""}</div>`;
  }

  root.innerHTML = headerHtml() + tabsHtml(tab) + bodyHtml + `<p class="footer-note">Painel dos pais · Sokyo</p>`;
  document.getElementById("btn-child").addEventListener("click", goChild);
  root.querySelectorAll("[data-tab]").forEach((el) => el.addEventListener("click", () => setTab(el.dataset.tab)));

  bindTasksTab(root, ctx, tab);
  bindAprovacaoTab(root, ctx, tab);
  bindRecompensasTab(root, ctx, tab);
  bindMetasTab(root, ctx, tab);
  bindMesadaTab(root, ctx, tab);
}

function bindTasksTab(root, ctx, tab) {
  if (tab !== "tarefas") return;
  const typeSelect = document.getElementById("nt-type");
  const subWrap = document.getElementById("nt-subtasks-wrap");
  const syncSub = () => subWrap.classList.toggle("hidden", typeSelect.value !== "epica");
  typeSelect.addEventListener("change", syncSub);
  syncSub();

  root.querySelectorAll("[data-task-row]").forEach((row) => {
    const id = row.dataset.taskRow;
    row.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("change", async () => {
        const field = input.dataset.field;
        const value = input.type === "checkbox" ? input.checked : input.value;
        try { await api.updateTask(id, { [field]: value }); } catch (e) { ctx.toast("Não foi possível salvar."); ctx.setTab(tab); }
      });
    });
  });
  root.querySelectorAll('[data-action="delete-task"]').forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Excluir esta missão? Essa ação não pode ser desfeita.")) return;
    try { await api.deleteTask(btn.dataset.id); ctx.setTab(tab); } catch (e) { ctx.toast("Não foi possível excluir."); }
  }));
  document.getElementById("nt-submit").addEventListener("click", async () => {
    const name = document.getElementById("nt-name").value.trim();
    if (!name) return;
    const type = typeSelect.value;
    const subtasks = type === "epica" ? document.getElementById("nt-subtasks").value.split("\n").map((s) => s.trim()).filter(Boolean) : undefined;
    try {
      await api.createTask({
        name, xp: document.getElementById("nt-xp").value, coins: document.getElementById("nt-coins").value,
        categoryId: document.getElementById("nt-category").value, type,
        requiresApproval: document.getElementById("nt-approval").checked, subtasks
      });
      ctx.setTab(tab);
    } catch (e) { ctx.toast("Não foi possível criar a missão."); }
  });
}

function bindAprovacaoTab(root, ctx, tab) {
  if (tab !== "aprovacao") return;
  root.querySelectorAll('[data-action="approve-completion"], [data-action="reject-completion"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const status = btn.dataset.action === "approve-completion" ? "approved" : "rejected";
      try { await api.resolveCompletion(btn.dataset.id, status); ctx.setTab(tab); } catch (e) { ctx.toast("Não foi possível registrar."); }
    });
  });
  root.querySelectorAll('[data-action="approve-redemption"], [data-action="reject-redemption"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const status = btn.dataset.action === "approve-redemption" ? "approved" : "rejected";
      try { await api.resolveRedemption(btn.dataset.id, status); ctx.setTab(tab); } catch (e) { ctx.toast(e.code === "insufficient_coins" ? "A criança não tem mais moedas suficientes." : "Não foi possível registrar."); }
    });
  });
}

function bindRecompensasTab(root, ctx, tab) {
  if (tab !== "recompensas") return;
  root.querySelectorAll("[data-reward-row]").forEach((row) => {
    const id = row.dataset.rewardRow;
    row.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("change", async () => {
        const field = input.dataset.field;
        const value = input.type === "checkbox" ? input.checked : input.value;
        try { await api.updateReward(id, { [field]: value }); } catch (e) { ctx.toast("Não foi possível salvar."); }
      });
    });
  });
  root.querySelectorAll('[data-action="delete-reward"]').forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Excluir esta recompensa?")) return;
    try { await api.deleteReward(btn.dataset.id); ctx.setTab(tab); } catch (e) { ctx.toast("Não foi possível excluir."); }
  }));
  document.getElementById("nr-submit").addEventListener("click", async () => {
    const name = document.getElementById("nr-name").value.trim();
    if (!name) return;
    try {
      await api.createReward({
        name, costCoins: document.getElementById("nr-cost").value, type: document.getElementById("nr-type").value,
        requiresApproval: document.getElementById("nr-approval").checked
      });
      ctx.setTab(tab);
    } catch (e) { ctx.toast("Não foi possível criar a recompensa."); }
  });
}

function bindMetasTab(root, ctx, tab) {
  if (tab !== "metas") return;
  root.querySelectorAll('[data-action="pick-metas-child"]').forEach((btn) => btn.addEventListener("click", () => { state.metasChild = btn.dataset.id; ctx.setTab(tab); }));
  root.querySelectorAll("[data-goal-row]").forEach((row) => {
    const id = row.dataset.goalRow;
    row.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("change", async () => {
        const field = input.dataset.field;
        try { await api.updateGoal(id, { [field]: input.value }); } catch (e) { ctx.toast("Não foi possível salvar."); }
      });
    });
  });
  root.querySelectorAll('[data-action="delete-goal"]').forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Excluir esta meta?")) return;
    try { await api.deleteGoal(btn.dataset.id); ctx.setTab(tab); } catch (e) { ctx.toast("Não foi possível excluir."); }
  }));
  const submit = document.getElementById("ng-submit");
  if (submit) submit.addEventListener("click", async () => {
    const name = document.getElementById("ng-name").value.trim();
    if (!name || !state.metasChild) return;
    try { await api.createGoal(state.metasChild, { name, targetCoins: document.getElementById("ng-target").value }); ctx.setTab(tab); }
    catch (e) { ctx.toast("Não foi possível criar a meta."); }
  });
}

function bindMesadaTab(root, ctx, tab) {
  if (tab !== "mesada") return;
  root.querySelectorAll('[data-action="pick-mesada-child"]').forEach((btn) => btn.addEventListener("click", () => { state.mesadaChild = btn.dataset.id; ctx.setTab(tab); }));
  const save = document.getElementById("al-save");
  if (save) save.addEventListener("click", async () => {
    try {
      await api.updateAllowanceSettings({
        model: document.getElementById("al-model").value,
        baseValue: document.getElementById("al-base").value,
        coinValue: document.getElementById("al-coinvalue").value
      });
      ctx.toast("Configuração salva.");
      ctx.setTab(tab);
    } catch (e) { ctx.toast("Não foi possível salvar."); }
  });
  const pay = document.getElementById("pay-week");
  if (pay) pay.addEventListener("click", async () => {
    try { await api.payWeek(pay.dataset.child); ctx.toast("Mesada da semana paga!"); ctx.setTab(tab); }
    catch (e) { ctx.toast(e.code === "already_paid" ? "Já foi paga essa semana." : e.code === "nothing_to_pay" ? "Nada a pagar essa semana." : "Não foi possível pagar."); }
  });
  const pinSave = document.getElementById("pin-save");
  if (pinSave) pinSave.addEventListener("click", async () => {
    const val = document.getElementById("pin-new").value.trim();
    if (!val) return;
    try { await api.changePin(val); ctx.toast("PIN atualizado."); document.getElementById("pin-new").value = ""; }
    catch (e) { ctx.toast("PIN muito curto (mínimo 4 dígitos)."); }
  });
}
