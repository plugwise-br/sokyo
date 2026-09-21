"use strict";
// Regra de ouro: saldo de XP e de moedas nunca sao colunas gravadas diretamente -
// sao sempre a SOMA das transacoes. Isso da auditoria completa e garante que XP
// conquistado nunca "desaparece" silenciosamente.
const { db } = require("../db");
const { id } = require("../util/ids");

function addXp(childId, amount, sourceType, sourceId) {
  const txId = id();
  db.prepare("INSERT INTO xp_transactions (id, child_id, amount, source_type, source_id, created_at) VALUES (?,?,?,?,?,?)")
    .run(txId, childId, amount, sourceType, sourceId || null, new Date().toISOString());
  return txId;
}

function addCoins(childId, amount, sourceType, sourceId) {
  const txId = id();
  db.prepare("INSERT INTO coin_transactions (id, child_id, amount, source_type, source_id, created_at) VALUES (?,?,?,?,?,?)")
    .run(txId, childId, amount, sourceType, sourceId || null, new Date().toISOString());
  return txId;
}

function totalXp(childId) {
  return db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM xp_transactions WHERE child_id=?").get(childId).total;
}

function coinBalance(childId) {
  return db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM coin_transactions WHERE child_id=?").get(childId).total;
}

function coinsEarnedInRange(childId, fromDate, toDate) {
  return db.prepare(
    `SELECT COALESCE(SUM(amount),0) as total FROM coin_transactions
     WHERE child_id=? AND amount > 0 AND source_type='task_completion'
     AND created_at >= ? AND created_at < ?`
  ).get(childId, fromDate, toDate).total;
}

function recentLedger(childId, limit) {
  return db.prepare(
    `SELECT 'coin' as kind, amount, source_type, source_id, created_at FROM coin_transactions WHERE child_id=?
     UNION ALL
     SELECT 'xp' as kind, amount, source_type, source_id, created_at FROM xp_transactions WHERE child_id=?
     ORDER BY created_at DESC LIMIT ?`
  ).all(childId, childId, limit || 30);
}

module.exports = { addXp, addCoins, totalXp, coinBalance, coinsEarnedInRange, recentLedger };
