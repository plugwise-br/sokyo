"use strict";
// Todas as datas do jogo sao calculadas no fuso America/Sao_Paulo, no servidor -
// nunca no relogio do aparelho que abre a pagina.

const SP_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function todayKey() {
  return SP_FMT.format(new Date());
}

function keyToUTCDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysKey(key, n) {
  const d = keyToUTCDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function startOfWeekKey(key) {
  const d = keyToUTCDate(key || todayKey());
  const day = d.getUTCDay(); // 0 dom .. 6 sab
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function weekdayIndex(key) {
  // 1 = segunda ... 7 = domingo (ISO-like), usado em tasks.days_of_week
  const d = keyToUTCDate(key);
  const dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}

module.exports = { todayKey, keyToUTCDate, addDaysKey, startOfWeekKey, weekdayIndex };
