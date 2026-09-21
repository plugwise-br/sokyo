"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

function listByChild(childId) {
  return db.prepare("SELECT * FROM goals WHERE child_id=? ORDER BY created_at").all(childId);
}

function get(goalId) {
  return db.prepare("SELECT * FROM goals WHERE id=?").get(goalId);
}

function create(familyId, childId, body) {
  const goalId = id();
  db.prepare("INSERT INTO goals (id, family_id, child_id, name, icon, target_coins, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(goalId, familyId, childId, body.name, body.icon || "🎯", Math.max(1, parseInt(body.targetCoins, 10) || 1), new Date().toISOString());
  return get(goalId);
}

function update(goalId, body) {
  const current = get(goalId);
  if (!current) return null;
  const name = body.name !== undefined ? body.name : current.name;
  const icon = body.icon !== undefined ? body.icon : current.icon;
  const target = body.targetCoins !== undefined ? Math.max(1, parseInt(body.targetCoins, 10) || 1) : current.target_coins;
  db.prepare("UPDATE goals SET name=?, icon=?, target_coins=? WHERE id=?").run(name, icon, target, goalId);
  return get(goalId);
}

function remove(goalId) {
  return db.prepare("DELETE FROM goals WHERE id=?").run(goalId).changes > 0;
}

module.exports = { listByChild, get, create, update, remove };
