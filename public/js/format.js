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

// Escolhe nome/icone certo pro genero da crianca (se ela ainda nao tem
// genero definido, ou a conquista nao tem variante, cai no neutro/emoji).
export function achievementDisplay(a, gender) {
  var name = a.name, icon = a.icon;
  if (gender === "male") { name = a.name_boy || name; icon = a.icon_boy || icon; }
  else if (gender === "female") { name = a.name_girl || name; icon = a.icon_girl || icon; }
  return { name: name, icon: icon };
}

// Um "icone" pode ser um emoji (texto) ou o caminho de uma imagem enviada
// pelo admin/pais - se comeca com "/" ou "http", renderiza como <img>.
export function isImageIcon(icon) {
  var val = icon || "";
  return val.startsWith("/") || val.startsWith("http");
}
export function iconHtml(icon, cssClass) {
  if (isImageIcon(icon)) {
    return '<img class="' + (cssClass || "") + '" src="' + icon + '" alt="">';
  }
  return '<span class="' + (cssClass || "") + '">' + esc(icon || "") + '</span>';
}
