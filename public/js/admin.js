// Area do super admin (voce, dono do produto Sokyo). Completamente
// separada do app da familia: PIN proprio, nunca acessivel a partir do
// modo pais/crianca. So controla a marca (nome, cores, logo) do produto
// inteiro - nao mexe em dados de nenhuma familia.
const TOKEN_KEY = "sokyo.adminToken";
const root = document.getElementById("app");
const toastEl = document.getElementById("toast");
let toastTimer = null;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}
function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

async function api(path, opts = {}) {
  const isFormData = opts.body instanceof FormData;
  const headers = Object.assign({}, isFormData ? {} : { "Content-Type": "application/json" }, opts.headers || {});
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch("/api" + path, { method: opts.method || "GET", headers, body: opts.body });
  if (res.status === 401) setToken(null);
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const json = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) throw Object.assign(new Error(json.error || "erro"), { code: json.error, status: res.status });
  return json;
}

function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }

async function renderLogin() {
  root.innerHTML = `
    <div class="profile-screen">
      <h1>🛠️ Sokyo — Admin</h1>
      <p class="muted">Área restrita: identidade visual do produto. PIN próprio do super admin.</p>
      <div class="card" style="text-align:left">
        <input type="password" inputmode="numeric" id="admin-pin" placeholder="PIN de admin">
        <div id="admin-error" style="color:var(--danger); font-size:.78rem; font-weight:800; min-height:18px; margin-top:8px"></div>
        <div style="margin-top:10px"><button class="btn btn-primary" id="admin-login" style="width:100%">Entrar</button></div>
      </div>
    </div>`;
  const submit = async () => {
    const btn = document.getElementById("admin-login");
    btn.disabled = true;
    try {
      const res = await api("/admin/login", { method: "POST", body: JSON.stringify({ pin: document.getElementById("admin-pin").value }) });
      setToken(res.token);
      render();
    } catch (err) {
      btn.disabled = false;
      const msg = err.code === "admin_disabled" ? "Área de admin desativada (defina ADMIN_PIN no servidor)."
        : err.code === "too_many_attempts" ? "Muitas tentativas, aguarde." : "PIN incorreto.";
      document.getElementById("admin-error").textContent = msg;
    }
  };
  document.getElementById("admin-login").addEventListener("click", submit);
  document.getElementById("admin-pin").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
}

async function renderPanel() {
  let b;
  try { b = await api("/branding"); } catch (e) { setToken(null); return renderLogin(); }

  root.innerHTML = `
    <div class="topbar">
      <div class="topbar-row">
        <div class="hero"><div class="avatar">🛠️</div><div><div class="hero-name">Admin Sokyo</div><div class="hero-sub">Identidade visual do produto</div></div></div>
        <button class="mode-toggle" id="admin-logout">Sair</button>
      </div>
    </div>

    <div class="card">
      <h2>Nome e mensagem</h2>
      <div class="row" style="margin-top:10px"><div class="field"><label>Nome do app</label><input type="text" id="b-name" value="${esc(b.app_name)}"></div></div>
      <div class="row" style="margin-top:10px"><div class="field"><label>Tagline</label><input type="text" id="b-tagline" value="${esc(b.tagline || "")}"></div></div>
    </div>

    <div class="card">
      <h2>Cores</h2>
      <div class="row" style="margin-top:10px; flex-wrap:wrap">
        <div><label>Principal</label><input type="color" id="b-primary" value="${b.primary_color}"></div>
        <div><label>Secundária</label><input type="color" id="b-secondary" value="${b.secondary_color}"></div>
        <div><label>Dourada</label><input type="color" id="b-gold" value="${b.gold_color}"></div>
        <div><label>Destaque</label><input type="color" id="b-accent" value="${b.accent_color}"></div>
      </div>
    </div>

    <div class="card">
      <h2>Logo / ícone</h2>
      <p class="muted">Vira o ícone do PWA e o topo da tela de seleção de perfil. Ideal: PNG quadrado, fundo sólido.</p>
      ${b.logo_url ? `<img src="${b.logo_url}" alt="logo atual" style="height:64px; border-radius:12px; margin:10px 0">` : ""}
      <div style="margin-top:8px"><input type="file" id="b-logo" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
      <div style="margin-top:10px"><button class="btn btn-ghost" id="b-logo-save" disabled>Enviar logo</button></div>
    </div>

    <div style="margin-top:4px"><button class="btn btn-primary" id="b-save" style="width:100%">Salvar identidade visual</button></div>
    <p class="footer-note">As mudanças aparecem pra todo mundo na próxima vez que abrirem o app.</p>`;

  document.getElementById("admin-logout").addEventListener("click", () => { setToken(null); renderLogin(); });

  const fileInput = document.getElementById("b-logo");
  const logoBtn = document.getElementById("b-logo-save");
  fileInput.addEventListener("change", () => { logoBtn.disabled = !fileInput.files.length; });
  logoBtn.addEventListener("click", async () => {
    if (!fileInput.files.length) return;
    logoBtn.disabled = true; logoBtn.textContent = "Enviando...";
    const form = new FormData();
    form.append("logo", fileInput.files[0]);
    try {
      await api("/admin/branding/logo", { method: "POST", body: form, headers: {} });
      toast("Logo atualizado.");
      renderPanel();
    } catch (e) {
      toast("Não foi possível enviar o logo.");
      logoBtn.disabled = false; logoBtn.textContent = "Enviar logo";
    }
  });

  document.getElementById("b-save").addEventListener("click", async () => {
    try {
      await api("/admin/branding", {
        method: "PUT",
        body: JSON.stringify({
          appName: document.getElementById("b-name").value,
          tagline: document.getElementById("b-tagline").value,
          primaryColor: document.getElementById("b-primary").value,
          secondaryColor: document.getElementById("b-secondary").value,
          goldColor: document.getElementById("b-gold").value,
          accentColor: document.getElementById("b-accent").value
        })
      });
      toast("Identidade visual salva.");
    } catch (e) { toast("Não foi possível salvar."); }
  });
}

async function render() {
  if (getToken()) return renderPanel();
  return renderLogin();
}

render();
