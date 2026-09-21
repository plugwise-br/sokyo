import { api } from "./api.js";
import { esc, fmtBRL, DOW } from "./format.js";

const TABS = [["hoje", "Hoje"], ["personagem", "Personagem"], ["recompensas", "Recompensas"], ["metas", "Metas"], ["diario", "Diário"]];

function headerHtml(child, ctx) {
  const { level } = child;
  const xpPct = level.xpForNextLevel ? Math.round((level.xpIntoLevel / level.xpForNextLevel) * 100) : 100;
  return `
  <div class="topbar">
    <div class="topbar-row">
      <div class="hero">
        <div class="avatar">${child.avatar || "🦸"}</div>
        <div>
          <div class="hero-name">${esc(child.name)}</div>
          <div class="hero-sub">Nível ${level.level} · ${esc(level.name)}</div>
        </div>
      </div>
      <button class="mode-toggle" id="btn-parent">👪 Modo pais</button>
    </div>
    <div class="xp-row">
      <div class="xp-track"><div class="xp-fill" style="width:${xpPct}%"></div></div>
      <div class="xp-label"><span>XP · ${level.name}${level.nextLevelName ? " → " + esc(level.nextLevelName) : ""}</span><span>${level.xpIntoLevel}${level.xpForNextLevel ? "/" + level.xpForNextLevel : ""}</span></div>
    </div>
    <div class="stat-row">
      <div class="stat-pill">🪙 <div><span class="n">${child.coins}</span><span class="l">moedas</span></div></div>
      <div class="stat-pill">🔥 <div><span class="n">${child.streak.current}</span><span class="l">dias seguidos</span></div></div>
      <div class="stat-pill">⭐ <div><span class="n">${child.xp}</span><span class="l">XP total</span></div></div>
    </div>
  </div>`;
}

function tabsHtml(tab) {
  return `<div class="tabs">${TABS.map(([id, label]) => `<button class="tab ${tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}</div>`;
}

function taskRowHtml(t, childId) {
  const typeBadge = t.type !== "rotina" ? `<span class="badge type-${t.type}">${t.type === "epica" ? "Missão épica" : "Bônus"}</span>` : "";
  if (t.type === "epica") {
    const done = new Set((t._subtasksDone || []));
    const status = t._completion ? t._completion.status : null;
    const locked = status === "pending" || status === "approved"; // ja foi enviada, nao da mais pra mexer nas subtarefas
    let badge = "";
    if (status === "approved") badge = `<span class="badge approved">Validado ✓</span>`;
    else if (status === "pending") badge = `<span class="badge pending">Aguardando</span>`;
    else if (status === "rejected") badge = `<span class="badge rejected">Não validado</span>`;
    return `<div class="task" style="align-items:flex-start; flex-direction:column">
      <div style="display:flex; gap:12px; width:100%; align-items:center">
        <div class="task-icon">${t.icon}</div>
        <div class="task-body">
          <div class="task-name">${esc(t.name)} ${typeBadge}</div>
          <div class="task-meta">${t.xp > 0 ? `<span class="xp">+${t.xp} XP</span>` : ""}${t.coins > 0 ? `<span class="coins">+${t.coins} moedas</span>` : ""}</div>
        </div>
        ${badge}
      </div>
      <div class="subtask-list">
        ${t.subtasks.map((s) => `
          <label class="subtask-row ${done.has(s.id) ? "done" : ""}">
            <input type="checkbox" data-action="subtask" data-task="${t.id}" data-subtask="${s.id}" ${done.has(s.id) ? "checked" : ""} ${locked ? "disabled" : ""}>
            ${esc(s.name)}
          </label>`).join("")}
      </div>
    </div>`;
  }
  const status = t._completion ? t._completion.status : null;
  let action;
  if (!status) action = `<button class="task-btn" data-action="complete" data-task="${t.id}">Concluí!</button>`;
  else if (status === "pending") action = `<span class="badge pending">Aguardando</span>`;
  else if (status === "approved") action = `<span class="badge approved">Validado ✓</span>`;
  else action = `<span class="badge rejected">Não validado</span>`;
  return `<div class="task">
    <div class="task-icon">${t.icon}</div>
    <div class="task-body">
      <div class="task-name">${esc(t.name)} ${typeBadge}</div>
      <div class="task-meta">${t.xp > 0 ? `<span class="xp">+${t.xp} XP</span>` : ""}${t.coins > 0 ? `<span class="coins">+${t.coins} moedas</span>` : ""}</div>
    </div>
    ${action}
  </div>`;
}

async function tabPersonagem(child) {
  const ach = await api.achievements(child.id);
  let html = `<div class="card"><h2>Seu personagem</h2><p class="muted">Conquistas são independentes de moedas — mostram o que você já dominou.</p></div>`;
  html += `<div class="card"><div class="section-head">🏆 Conquistas</div><div class="ach-grid">`;
  ach.all.forEach((a) => {
    const unlocked = ach.unlocked.some((u) => u.id === a.id);
    html += `<div class="ach-card ${unlocked ? "" : "locked"}"><span class="ic">${a.icon}</span>${esc(a.name)}</div>`;
  });
  html += `</div></div>`;
  return html;
}

async function tabRecompensas(child, toast) {
  const rewards = await api.rewards();
  let html = `<div class="card"><h2>Loja de recompensas</h2><p class="muted">Troque suas moedas por prêmios combinados com os pais.</p></div><div class="card">`;
  if (rewards.length === 0) html += `<div class="empty">Nenhuma recompensa cadastrada ainda.</div>`;
  rewards.forEach((r) => {
    const canAfford = child.coins >= r.cost_coins;
    html += `<div class="task">
      <div class="task-icon">${r.icon}</div>
      <div class="task-body"><div class="task-name">${esc(r.name)}</div><div class="task-meta"><span class="coins">${r.cost_coins} moedas</span></div></div>
      <button class="task-btn" data-action="redeem" data-reward="${r.id}" ${canAfford ? "" : "disabled"}>Trocar</button>
    </div>`;
  });
  html += `</div>`;
  return html;
}

async function tabMetas(child) {
  const goals = await api.goals(child.id);
  let html = `<div class="card"><h2>🎯 Minhas metas</h2><p class="muted">Acompanhe o progresso das suas conquistas grandes.</p></div><div class="card">`;
  if (goals.length === 0) html += `<div class="empty">Nenhuma meta cadastrada ainda.</div>`;
  goals.forEach((g) => {
    const pct = Math.max(0, Math.min(100, Math.round((child.coins / g.target_coins) * 100)));
    html += `<div class="goal">
      <div class="goal-top"><span class="goal-name">${g.icon} ${esc(g.name)}</span><span class="goal-target">${child.coins} / ${g.target_coins}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  });
  html += `</div>`;
  return html;
}

async function tabDiario(child) {
  const [diary, report] = await Promise.all([api.diary(child.id, 14), api.weeklyReport(child.id)]);
  let html = `<div class="card"><h2>Sua semana</h2>
    <div class="week-total"><span class="v">${report.xp}</span><span class="muted">XP · <span class="v" style="font-size:1.2rem">${report.coins}</span> moedas ganhas</span></div>`;
  report.categories.forEach((c) => {
    if (c.completed === 0) return;
    html += `<div class="cat-bar-row"><span class="cat-bar-label">${c.icon} ${esc(c.name)}</span><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${c.pct}%; background:${c.color}"></div></div><span class="cat-bar-n">${c.completed}</span></div>`;
  });
  html += `</div>`;

  html += `<div class="card"><h2>Diário</h2>`;
  if (diary.length === 0) html += `<div class="empty">Nenhuma missão registrada ainda.</div>`;
  diary.slice(0, 20).forEach((d) => {
    html += `<div class="task"><div class="task-icon">${d.task_icon}</div><div class="task-body"><div class="task-name">${esc(d.task_name)}</div><div class="muted" style="margin-top:2px">${d.date}</div></div>
      <span class="badge ${d.status}">${d.status === "approved" ? "Validado" : d.status === "pending" ? "Aguardando" : "Não validado"}</span></div>`;
  });
  html += `</div>`;
  return html;
}

export async function renderChildApp(root, ctx) {
  const { child, tab, setTab, goParent, toast } = ctx;

  let bodyHtml;
  if (tab === "hoje") {
    const tasks = await api.tasksToday();
    // anexa status de conclusao de hoje em cada tarefa (busca leve via diario do dia)
    const diaryToday = await api.diary(child.id, 1).catch(() => []);
    tasks.forEach((t) => {
      const c = diaryToday.find((d) => d.task_id === t.id);
      t._completion = c || null;
      if (t.type === "epica" && c) t._subtasksDone = JSON.parse(c.subtasks_done || "[]");
    });
    bodyHtml = await renderTasksTab(tasks, child);
  } else if (tab === "personagem") bodyHtml = await tabPersonagem(child);
  else if (tab === "recompensas") bodyHtml = await tabRecompensas(child, toast);
  else if (tab === "metas") bodyHtml = await tabMetas(child);
  else bodyHtml = await tabDiario(child);

  root.innerHTML = headerHtml(child, ctx) + tabsHtml(tab) + bodyHtml + `<p class="footer-note">Feito com carinho para o Arthur 💛</p>`;

  document.getElementById("btn-parent").addEventListener("click", goParent);
  root.querySelectorAll("[data-tab]").forEach((el) => el.addEventListener("click", () => setTab(el.dataset.tab)));

  root.querySelectorAll('[data-action="complete"]').forEach((btn) => btn.addEventListener("click", async () => {
    btn.disabled = true; btn.textContent = "Enviando...";
    try { await api.completeTask(child.id, btn.dataset.task); } catch (e) { toast("Não foi possível enviar."); }
    ctx.setTab(tab);
  }));
  root.querySelectorAll('[data-action="subtask"]').forEach((cb) => cb.addEventListener("change", async () => {
    cb.disabled = true;
    try { await api.toggleSubtask(child.id, cb.dataset.task, cb.dataset.subtask); } catch (e) { toast("Não foi possível salvar."); }
    ctx.setTab(tab);
  }));
  root.querySelectorAll('[data-action="redeem"]').forEach((btn) => btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const res = await api.redeem(child.id, btn.dataset.reward);
      toast(res.status === "approved" ? "Recompensa liberada!" : "Pedido enviado, aguardando aprovação.");
    } catch (e) { toast(e.code === "insufficient_coins" ? "Moedas insuficientes." : "Não foi possível trocar."); }
    ctx.setTab(tab);
  }));
}

async function renderTasksTab(tasks, child) {
  const categories = await api.categories();
  const today = new Date();
  let html = `<div class="card"><h2>${DOW[today.getDay()]}, missões de hoje</h2><p class="muted">Faça suas missões — algumas precisam que um adulto confirme antes de liberar o prêmio.</p></div>`;
  if (tasks.length === 0) { html += `<div class="card"><div class="empty">Nenhuma missão para hoje. Peça a um adulto para cadastrar em "Modo pais".</div></div>`; return html; }
  categories.forEach((cat) => {
    const items = tasks.filter((t) => t.category_id === cat.id);
    if (items.length === 0) return;
    html += `<div class="card"><div class="section-head" style="color:${cat.color}">${cat.icon} ${esc(cat.name)}</div>`;
    items.forEach((t) => { html += taskRowHtml(t, child.id); });
    html += `</div>`;
  });
  return html;
}
