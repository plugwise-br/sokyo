"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

const VALID_TYPES = ["rotina", "bonus", "epica"];
const VALID_FREQ = ["daily", "weekly", "once"];

function listByFamily(familyId, { onlyActive } = {}) {
  const sql = onlyActive
    ? "SELECT * FROM tasks WHERE family_id = ? AND active = 1 ORDER BY sort_order"
    : "SELECT * FROM tasks WHERE family_id = ? ORDER BY sort_order";
  const tasks = db.prepare(sql).all(familyId);
  const subtasks = db.prepare("SELECT * FROM task_subtasks WHERE task_id = ? ORDER BY sort_order");
  return tasks.map((t) => Object.assign({}, t, {
    days_of_week: t.days_of_week ? JSON.parse(t.days_of_week) : null,
    subtasks: t.type === "epica" ? subtasks.all(t.id) : []
  }));
}

function get(taskId) {
  const t = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!t) return null;
  const subtasks = db.prepare("SELECT * FROM task_subtasks WHERE task_id = ? ORDER BY sort_order").all(taskId);
  return Object.assign({}, t, { days_of_week: t.days_of_week ? JSON.parse(t.days_of_week) : null, subtasks });
}

function isScheduledToday(task, weekdayIdx) {
  if (!task.active) return false;
  if (!task.days_of_week || task.days_of_week.length === 0) return true;
  return task.days_of_week.indexOf(weekdayIdx) >= 0;
}

function create(familyId, body) {
  const taskId = id();
  const now = new Date().toISOString();
  const type = VALID_TYPES.indexOf(body.type) >= 0 ? body.type : "rotina";
  const frequency = VALID_FREQ.indexOf(body.frequency) >= 0 ? body.frequency : "daily";
  db.prepare(
    `INSERT INTO tasks (id, family_id, category_id, name, description, icon, type, frequency, days_of_week, xp, coins, requires_approval, active, sort_order, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`
  ).run(
    taskId, familyId, body.categoryId, body.name, body.description || null, body.icon || "⭐",
    type, frequency, body.daysOfWeek ? JSON.stringify(body.daysOfWeek) : null,
    Math.max(0, parseInt(body.xp, 10) || 0), Math.max(0, parseInt(body.coins, 10) || 0),
    body.requiresApproval === false ? 0 : 1, body.sortOrder || 0, now
  );
  if (type === "epica" && Array.isArray(body.subtasks)) {
    const ins = db.prepare("INSERT INTO task_subtasks (id, task_id, name, sort_order) VALUES (?,?,?,?)");
    body.subtasks.forEach((name, i) => ins.run(id(), taskId, name, i));
  }
  return get(taskId);
}

function update(taskId, body) {
  const current = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!current) return null;
  const next = {
    name: body.name !== undefined ? body.name : current.name,
    description: body.description !== undefined ? body.description : current.description,
    icon: body.icon !== undefined ? body.icon : current.icon,
    category_id: body.categoryId !== undefined ? body.categoryId : current.category_id,
    type: body.type !== undefined && VALID_TYPES.indexOf(body.type) >= 0 ? body.type : current.type,
    frequency: body.frequency !== undefined && VALID_FREQ.indexOf(body.frequency) >= 0 ? body.frequency : current.frequency,
    days_of_week: body.daysOfWeek !== undefined ? (body.daysOfWeek ? JSON.stringify(body.daysOfWeek) : null) : current.days_of_week,
    xp: body.xp !== undefined ? Math.max(0, parseInt(body.xp, 10) || 0) : current.xp,
    coins: body.coins !== undefined ? Math.max(0, parseInt(body.coins, 10) || 0) : current.coins,
    requires_approval: body.requiresApproval !== undefined ? (body.requiresApproval ? 1 : 0) : current.requires_approval,
    active: body.active !== undefined ? (body.active ? 1 : 0) : current.active
  };
  db.prepare(
    `UPDATE tasks SET name=?, description=?, icon=?, category_id=?, type=?, frequency=?, days_of_week=?, xp=?, coins=?, requires_approval=?, active=? WHERE id=?`
  ).run(next.name, next.description, next.icon, next.category_id, next.type, next.frequency, next.days_of_week,
    next.xp, next.coins, next.requires_approval, next.active, taskId);
  return get(taskId);
}

function remove(taskId) {
  const res = db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
  db.prepare("DELETE FROM task_subtasks WHERE task_id = ?").run(taskId);
  return res.changes > 0;
}

module.exports = { listByFamily, get, isScheduledToday, create, update, remove, VALID_TYPES, VALID_FREQ };
