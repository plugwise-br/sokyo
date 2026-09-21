export function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}
export function fmtBRL(v) {
  return "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
}
export function keyToLocalDate(key) {
  const p = String(key).split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}
export const DOW = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DOW_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const TASK_TYPE_LABEL = { rotina: "Rotina", bonus: "Bônus", epica: "Missão épica" };
export const REWARD_TYPE_LABEL = { material: "🎁 Material", privilegio: "🎟️ Privilégio", experiencia: "❤️ Experiência", financeira: "💰 Financeira" };
