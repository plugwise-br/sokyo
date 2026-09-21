import { api, getToken, setToken, setUnauthorizedHandler } from "./api.js";
import { renderChildApp, resetChildCache } from "./childView.js";
import { renderParentApp, resetParentCache } from "./parentView.js";
import { loadBranding, getBranding } from "./branding.js";

const CHILD_KEY = "sokyo.childId";
const root = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastEl = document.getElementById("toast");
let toastTimer = null;

export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

const state = {
  mode: "select", // select | child | parent
  childId: (() => { try { return localStorage.getItem(CHILD_KEY); } catch (e) { return null; } })(),
  childTab: "hoje",
  parentTab: "dashboard",
  children: [],
  pinModalOpen: false
};

function setChild(id) {
  state.childId = id;
  try { localStorage.setItem(CHILD_KEY, id || ""); } catch (e) {}
}

setUnauthorizedHandler(() => {
  if (state.mode === "parent") {
    state.mode = "child";
    toast("Sessão dos pais expirada, entre novamente.");
    render();
  }
});

async function loadChildren() {
  state.children = await api.children().catch(() => []);
}

function goParent() {
  if (getToken()) { state.mode = "parent"; render(); return; }
  state.pinModalOpen = true;
  renderPinModal();
}

function goChild() {
  state.mode = state.childId ? "child" : "select";
  render();
}

function renderPinModal() {
  if (!state.pinModalOpen) { modalRoot.innerHTML = ""; return; }
  modalRoot.innerHTML = `
    <div class="overlay" id="pin-overlay">
      <div class="modal" onclick="event.stopPropagation()">
        <h3>👪 Modo pais</h3>
        <p class="muted" style="margin-bottom:12px">Digite o PIN para aprovar missões e ajustar o jogo.</p>
        <input type="password" inputmode="numeric" id="pin-input" placeholder="PIN">
        <div id="pin-error" style="color:var(--danger); font-size:.78rem; font-weight:800; min-height:18px; margin-top:6px"></div>
        <div class="row" style="margin-top:10px">
          <button class="btn btn-ghost field" id="pin-cancel">Cancelar</button>
          <button class="btn btn-primary field" id="pin-submit">Entrar</button>
        </div>
      </div>
    </div>`;
  document.getElementById("pin-overlay").addEventListener("click", () => { state.pinModalOpen = false; renderPinModal(); });
  document.getElementById("pin-cancel").addEventListener("click", () => { state.pinModalOpen = false; renderPinModal(); });
  const input = document.getElementById("pin-input");
  const submit = async () => {
    const btn = document.getElementById("pin-submit");
    btn.disabled = true;
    try {
      const res = await api.login(input.value);
      setToken(res.token);
      state.pinModalOpen = false;
      state.mode = "parent";
      renderPinModal();
      render();
    } catch (err) {
      btn.disabled = false;
      let msg = "PIN incorreto, tente de novo.";
      if (err.code === "too_many_attempts") msg = "Muitas tentativas, aguarde alguns minutos.";
      else if (err.code !== "invalid_pin") msg = "Não foi possível conectar ao servidor. Tente novamente em instantes.";
      document.getElementById("pin-error").textContent = msg;
    }
  };
  document.getElementById("pin-submit").addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  setTimeout(() => input.focus(), 30);
}

function renderProfileSelect() {
  const b = getBranding();
  root.innerHTML = `
    <div class="profile-screen">
      <h1>${b && b.logo_url ? `<img src="${b.logo_url}" alt="" style="height:56px; display:block; margin:0 auto 8px">` : "🎮"} ${b ? b.app_name : "Sokyo"}</h1>
      <p class="muted">Quem está jogando hoje?</p>
      <div class="profile-grid" id="profile-grid"></div>
      <button class="link-btn" id="go-parent-empty" style="align-self:center; background:var(--surface-2); color:var(--ink); border-color:var(--line)">👪 Modo pais</button>
    </div>`;
  const grid = document.getElementById("profile-grid");
  if (state.children.length === 0) {
    grid.innerHTML = `<div class="empty">Nenhuma criança cadastrada ainda. Peça a um adulto para criar o primeiro perfil no Modo pais.</div>`;
  }
  state.children.forEach((c) => {
    const card = document.createElement("button");
    card.className = "profile-card";
    card.innerHTML = `<span class="av">${c.avatar || "🦸"}</span><span>${c.name}</span>`;
    card.addEventListener("click", () => { setChild(c.id); state.mode = "child"; render(); });
    grid.appendChild(card);
  });
  document.getElementById("go-parent-empty").addEventListener("click", goParent);
}

let loadingDepth = 0;
function setLoading(on) {
  loadingDepth = Math.max(0, loadingDepth + (on ? 1 : -1));
  document.getElementById("loading-bar").classList.toggle("show", loadingDepth > 0);
}

export async function render() {
  setLoading(true);
  try { await renderInner(); } finally { setLoading(false); }
}

async function renderInner() {
  if (state.mode === "select") {
    resetChildCache(); resetParentCache();
    await loadChildren();
    if (state.children.length === 1 && !state.childId) setChild(state.children[0].id);
    if (state.childId && state.children.some((c) => c.id === state.childId)) { state.mode = "child"; }
    else { renderProfileSelect(); return; }
  }

  if (state.mode === "child") {
    resetParentCache();
    await loadChildren();
    const child = state.children.find((c) => c.id === state.childId);
    if (!child) { state.mode = "select"; setChild(null); return render(); }
    await renderChildApp(root, {
      child, tab: state.childTab,
      setTab: (t) => { state.childTab = t; render(); },
      goParent, toast
    });
    return;
  }

  if (state.mode === "parent") {
    resetChildCache();
    await renderParentApp(root, {
      tab: state.parentTab,
      setTab: (t) => { state.parentTab = t; render(); },
      goChild: () => { setToken(null); goChild(); },
      toast, refresh: render
    });
  }
}

function userIsTyping() {
  const el = document.activeElement;
  if (!el || !root.contains(el)) return false;
  return el.matches("input, textarea, select");
}

loadBranding().finally(render);
setInterval(() => { if (!state.pinModalOpen && !userIsTyping()) render(); }, 6000);
window.addEventListener("focus", () => { if (!state.pinModalOpen && !userIsTyping()) render(); });

window.addEventListener("online", () => toast("Conexão restabelecida ✓"));
window.addEventListener("offline", () => toast("Sem conexão com a internet — algumas ações podem falhar."));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
