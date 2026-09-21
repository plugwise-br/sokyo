"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

function getSettings(familyId) {
  return db.prepare("SELECT * FROM allowance_settings WHERE family_id=?").get(familyId);
}

function updateSettings(familyId, body) {
  const current = getSettings(familyId);
  const model = body.model === "fixed" || body.model === "performance" ? body.model : current.model;
  const baseValue = body.baseValue !== undefined ? Math.max(0, parseFloat(body.baseValue) || 0) : current.base_value;
  const coinValue = body.coinValue !== undefined ? Math.max(0, parseFloat(body.coinValue) || 0) : current.coin_value;
  db.prepare("UPDATE allowance_settings SET model=?, base_value=?, coin_value=? WHERE family_id=?")
    .run(model, baseValue, coinValue, familyId);
  return getSettings(familyId);
}

function findPayout(childId, weekStart) {
  return db.prepare("SELECT * FROM allowance_payouts WHERE child_id=? AND week_start=?").get(childId, weekStart);
}

function createPayout(childId, weekStart, coinsSpent, valueBRL) {
  const payoutId = id();
  db.prepare("INSERT INTO allowance_payouts (id, child_id, week_start, coins_spent, value_brl, created_at) VALUES (?,?,?,?,?,?)")
    .run(payoutId, childId, weekStart, coinsSpent, valueBRL, new Date().toISOString());
  return db.prepare("SELECT * FROM allowance_payouts WHERE id=?").get(payoutId);
}

function listPayouts(childId, limit) {
  return db.prepare("SELECT * FROM allowance_payouts WHERE child_id=? ORDER BY week_start DESC LIMIT ?").all(childId, limit || 20);
}

module.exports = { getSettings, updateSettings, findPayout, createPayout, listPayouts };
