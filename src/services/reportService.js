"use strict";
const { db } = require("../db");
const dates = require("../util/dates");
const transactionsRepo = require("../repositories/transactions");
const streaksRepo = require("../repositories/streaks");
const categoriesRepo = require("../repositories/categories");

function weeklyReport(familyId, childId) {
  const weekStart = dates.startOfWeekKey();
  const weekStartISO = dates.keyToUTCDate(weekStart).toISOString();
  const nextWeekISO = dates.keyToUTCDate(dates.addDaysKey(weekStart, 7)).toISOString();

  const xpRow = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM xp_transactions WHERE child_id=? AND created_at>=? AND created_at<?"
  ).get(childId, weekStartISO, nextWeekISO);
  const coinsRow = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM coin_transactions WHERE child_id=? AND amount>0 AND source_type='task_completion' AND created_at>=? AND created_at<?"
  ).get(childId, weekStartISO, nextWeekISO);
  const completed = db.prepare(
    "SELECT COUNT(*) as n FROM task_completions WHERE child_id=? AND status='approved' AND date>=? AND date<?"
  ).get(childId, weekStart, dates.addDaysKey(weekStart, 7));

  const categories = categoriesRepo.listByFamily(familyId);
  const byCategory = categories.map((cat) => {
    const n = db.prepare(
      `SELECT COUNT(*) as n FROM task_completions tc JOIN tasks t ON t.id=tc.task_id
       WHERE tc.child_id=? AND tc.status='approved' AND t.category_id=? AND tc.date>=? AND tc.date<?`
    ).get(childId, cat.id, weekStart, dates.addDaysKey(weekStart, 7)).n;
    return { categoryId: cat.id, name: cat.name, icon: cat.icon, color: cat.color, completed: n };
  });
  const maxCompleted = Math.max(1, ...byCategory.map((c) => c.completed));

  return {
    weekStart,
    xp: xpRow.total,
    coins: coinsRow.total,
    completed: completed.n,
    streak: streaksRepo.get(childId),
    categories: byCategory.map((c) => Object.assign({}, c, { pct: Math.round((c.completed / maxCompleted) * 100) }))
  };
}

module.exports = { weeklyReport };
