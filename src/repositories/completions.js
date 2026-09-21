"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

function findByTaskChildDate(taskId, childId, date) {
  return db.prepare("SELECT * FROM task_completions WHERE task_id=? AND child_id=? AND date=?").get(taskId, childId, date);
}

function get(completionId) {
  return db.prepare("SELECT * FROM task_completions WHERE id=?").get(completionId);
}

function create({ taskId, childId, date, status, subtasksDone }) {
  const completionId = id();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO task_completions (id, task_id, child_id, date, status, subtasks_done, requested_at, resolved_at, resolved_by)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(completionId, taskId, childId, date, status, subtasksDone ? JSON.stringify(subtasksDone) : null, now,
    status === "approved" ? now : null, status === "approved" ? "auto" : null);
  return get(completionId);
}

function reopen(completionId) {
  const now = new Date().toISOString();
  db.prepare("UPDATE task_completions SET status='pending', requested_at=?, resolved_at=NULL, resolved_by=NULL WHERE id=?").run(now, completionId);
  return get(completionId);
}

function resolve(completionId, status, resolvedBy) {
  const now = new Date().toISOString();
  db.prepare("UPDATE task_completions SET status=?, resolved_at=?, resolved_by=? WHERE id=?").run(status, now, resolvedBy, completionId);
  return get(completionId);
}

function updateSubtasksDone(completionId, subtasksDone) {
  db.prepare("UPDATE task_completions SET subtasks_done=? WHERE id=?").run(JSON.stringify(subtasksDone), completionId);
  return get(completionId);
}

function listPendingByFamily(familyId) {
  return db.prepare(
    `SELECT tc.*, t.name as task_name, t.icon as task_icon, t.xp as task_xp, t.coins as task_coins
     FROM task_completions tc
     JOIN tasks t ON t.id = tc.task_id
     WHERE t.family_id = ? AND tc.status = 'pending'
     ORDER BY tc.requested_at`
  ).all(familyId);
}

function listByChildInRange(childId, fromDate, toDate) {
  return db.prepare(
    `SELECT tc.*, t.name as task_name, t.icon as task_icon, t.category_id, t.xp as task_xp, t.coins as task_coins
     FROM task_completions tc JOIN tasks t ON t.id = tc.task_id
     WHERE tc.child_id = ? AND tc.date >= ? AND tc.date <= ?
     ORDER BY tc.date DESC`
  ).all(childId, fromDate, toDate);
}

function countApprovedByChild(childId) {
  return db.prepare("SELECT COUNT(*) as n FROM task_completions WHERE child_id=? AND status='approved'").get(childId).n;
}

function countApprovedByChildAndCategory(childId, categoryId) {
  return db.prepare(
    `SELECT COUNT(*) as n FROM task_completions tc JOIN tasks t ON t.id = tc.task_id
     WHERE tc.child_id=? AND tc.status='approved' AND t.category_id=?`
  ).get(childId, categoryId).n;
}

module.exports = {
  findByTaskChildDate, get, create, reopen, resolve, updateSubtasksDone, listPendingByFamily, listByChildInRange,
  countApprovedByChild, countApprovedByChildAndCategory
};
