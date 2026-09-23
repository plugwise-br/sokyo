"use strict";
const { db } = require("../db");

function get(childId) {
  return db.prepare("SELECT * FROM streaks WHERE child_id=?").get(childId) || { child_id: childId, current: 0, best: 0, last_active_date: null };
}

function registerActivity(childId, todayKey, yesterdayKey) {
  const s = get(childId);
  if (s.last_active_date === todayKey) return s; // já contou nesse dia
  // Uma aprovacao atrasada (pai valida uma tarefa de dias atras) nunca pode
  // "voltar no tempo" o streak - se ja existe atividade mais recente
  // registrada, essa data antiga e so histórico, nao mexe no streak atual.
  if (s.last_active_date && todayKey < s.last_active_date) return s;
  const nextCurrent = s.last_active_date === yesterdayKey ? s.current + 1 : 1;
  const nextBest = Math.max(s.best, nextCurrent);
  db.prepare(
    `INSERT INTO streaks (child_id, current, best, last_active_date) VALUES (?,?,?,?)
     ON CONFLICT(child_id) DO UPDATE SET current=excluded.current, best=excluded.best, last_active_date=excluded.last_active_date`
  ).run(childId, nextCurrent, nextBest, todayKey);
  return get(childId);
}

module.exports = { get, registerActivity };
