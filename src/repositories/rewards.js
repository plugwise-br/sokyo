"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

const VALID_TYPES = ["material", "privilegio", "experiencia", "financeira"];

function listByFamily(familyId, { onlyActive } = {}) {
  const sql = onlyActive
    ? "SELECT * FROM rewards WHERE family_id=? AND active=1 ORDER BY cost_coins"
    : "SELECT * FROM rewards WHERE family_id=? ORDER BY cost_coins";
  return db.prepare(sql).all(familyId);
}

function get(rewardId) {
  return db.prepare("SELECT * FROM rewards WHERE id=?").get(rewardId);
}

function create(familyId, body) {
  const rewardId = id();
  const type = VALID_TYPES.indexOf(body.type) >= 0 ? body.type : "material";
  db.prepare(
    `INSERT INTO rewards (id, family_id, name, description, icon, type, cost_coins, requires_approval, stock, active, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,1,?)`
  ).run(rewardId, familyId, body.name, body.description || null, body.icon || "🎁", type,
    Math.max(1, parseInt(body.costCoins, 10) || 1), body.requiresApproval === false ? 0 : 1,
    body.stock != null ? parseInt(body.stock, 10) : null, new Date().toISOString());
  return get(rewardId);
}

function update(rewardId, body) {
  const current = get(rewardId);
  if (!current) return null;
  const next = {
    name: body.name !== undefined ? body.name : current.name,
    icon: body.icon !== undefined ? body.icon : current.icon,
    type: body.type !== undefined && VALID_TYPES.indexOf(body.type) >= 0 ? body.type : current.type,
    cost_coins: body.costCoins !== undefined ? Math.max(1, parseInt(body.costCoins, 10) || 1) : current.cost_coins,
    active: body.active !== undefined ? (body.active ? 1 : 0) : current.active,
    stock: body.stock !== undefined ? (body.stock != null ? parseInt(body.stock, 10) : null) : current.stock
  };
  db.prepare("UPDATE rewards SET name=?, icon=?, type=?, cost_coins=?, active=?, stock=? WHERE id=?")
    .run(next.name, next.icon, next.type, next.cost_coins, next.active, next.stock, rewardId);
  return get(rewardId);
}

function remove(rewardId) {
  return db.prepare("DELETE FROM rewards WHERE id=?").run(rewardId).changes > 0;
}

function decrementStock(rewardId) {
  db.prepare("UPDATE rewards SET stock = stock - 1 WHERE id=? AND stock IS NOT NULL").run(rewardId);
}

module.exports = { listByFamily, get, create, update, remove, decrementStock, VALID_TYPES };
