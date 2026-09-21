"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

function create({ rewardId, childId, costCoins, status }) {
  const redemptionId = id();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO reward_redemptions (id, reward_id, child_id, status, cost_coins, created_at, resolved_at, resolved_by)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(redemptionId, rewardId, childId, status, costCoins, now, status === "approved" ? now : null, status === "approved" ? "auto" : null);
  return get(redemptionId);
}

function get(redemptionId) {
  return db.prepare("SELECT * FROM reward_redemptions WHERE id=?").get(redemptionId);
}

function resolve(redemptionId, status, resolvedBy) {
  const now = new Date().toISOString();
  db.prepare("UPDATE reward_redemptions SET status=?, resolved_at=?, resolved_by=? WHERE id=?").run(status, now, resolvedBy, redemptionId);
  return get(redemptionId);
}

function listPendingByFamily(familyId) {
  return db.prepare(
    `SELECT rr.*, r.name as reward_name, r.icon as reward_icon
     FROM reward_redemptions rr JOIN rewards r ON r.id = rr.reward_id
     WHERE r.family_id=? AND rr.status='pending' ORDER BY rr.created_at`
  ).all(familyId);
}

module.exports = { create, get, resolve, listPendingByFamily };
