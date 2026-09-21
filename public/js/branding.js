// Aplica a marca do produto (nome, cores, logo) definida pelo super
// admin em /admin. Le uma vez no boot e pinta a interface via variaveis
// CSS - nenhuma tela de familia/crianca pode alterar isso.
let cached = null;

export async function loadBranding() {
  try {
    const res = await fetch("/api/branding");
    if (!res.ok) return null;
    cached = await res.json();
    applyBranding(cached);
    return cached;
  } catch (e) { return null; }
}

export function getBranding() { return cached; }

export function applyBranding(b) {
  if (!b) return;
  const root = document.documentElement;
  if (b.primary_color) root.style.setProperty("--primary", b.primary_color);
  if (b.secondary_color) root.style.setProperty("--secondary", b.secondary_color);
  if (b.gold_color) root.style.setProperty("--gold", b.gold_color);
  if (b.accent_color) root.style.setProperty("--accent", b.accent_color);
  if (b.app_name) document.title = b.app_name;
  if (b.logo_url) {
    let link = document.querySelector('link[rel="icon"]');
    if (link) link.href = b.logo_url;
  }
}
