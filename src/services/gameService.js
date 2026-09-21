"use strict";
const tasksRepo = require("../repositories/tasks");
const completionsRepo = require("../repositories/completions");
const transactionsRepo = require("../repositories/transactions");
const streaksRepo = require("../repositories/streaks");
const levelsRepo = require("../repositories/levels");
const achievementsService = require("./achievementsService");
const dates = require("../util/dates");
const { withTransaction } = require("../db");

class GameError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

// Aplica a recompensa de uma conclusao APROVADA: XP e moedas sempre viram
// transacao (nunca um incremento direto de saldo), streak e conquistas sao
// recalculados a partir do estado real. Idempotente-safe: so deve ser chamada
// uma unica vez por conclusao (controlado pelo status na tabela).
function applyApprovedReward(task, childId, completionId, date) {
  if (task.xp > 0) transactionsRepo.addXp(childId, task.xp, "task_completion", completionId);
  if (task.coins > 0) transactionsRepo.addCoins(childId, task.coins, "task_completion", completionId);
  const yesterday = dates.addDaysKey(date, -1);
  streaksRepo.registerActivity(childId, date, yesterday);
  return achievementsService.evaluateAndUnlock(task.family_id, childId);
}

// Marca uma tarefa comum (rotina/bonus) como concluida pela crianca.
// Idempotente: reenviar o mesmo dia nao duplica premio (regra critica #5 do item 37).
function completeTask(childId, taskId) {
  const task = tasksRepo.get(taskId);
  if (!task || !task.active) throw new GameError("task_not_found", "Missão não encontrada ou inativa.");
  if (task.type === "epica") throw new GameError("wrong_endpoint", "Use o fluxo de subtarefas para missões épicas.");

  const today = dates.todayKey();
  const key = task.frequency === "once" ? "0000-01-01" : today; // tarefa "once" usa uma data fixa como chave unica por crianca

  return withTransaction(() => {
    const existing = completionsRepo.findByTaskChildDate(taskId, childId, key);
    if (existing) {
      if (existing.status === "rejected") return completionsRepo.reopen(existing.id);
      return existing; // já pending ou approved: idempotente, não duplica
    }
    const autoApprove = !task.requires_approval;
    const completion = completionsRepo.create({
      taskId, childId, date: key, status: autoApprove ? "approved" : "pending"
    });
    let unlocked = [];
    if (autoApprove) unlocked = applyApprovedReward(task, childId, completion.id, today);
    return Object.assign({}, completion, { unlockedAchievements: unlocked });
  });
}

// Alterna uma subtarefa de missao epica. Quando todas as subtarefas estiverem
// marcadas, a missao inteira vira pending/approved e libera XP/moedas de uma vez.
function toggleEpicSubtask(childId, taskId, subtaskId) {
  const task = tasksRepo.get(taskId);
  if (!task || !task.active || task.type !== "epica") throw new GameError("task_not_found", "Missão épica não encontrada.");
  if (!task.subtasks.some((s) => s.id === subtaskId)) throw new GameError("subtask_not_found", "Subtarefa não encontrada.");

  const today = dates.todayKey();
  return withTransaction(() => {
    let completion = completionsRepo.findByTaskChildDate(taskId, childId, today);
    if (!completion) {
      completion = completionsRepo.create({ taskId, childId, date: today, status: "in_progress", subtasksDone: [] });
    }
    if (completion.status !== "in_progress") return Object.assign({}, completion, { unlockedAchievements: [] });

    const done = new Set(JSON.parse(completion.subtasks_done || "[]"));
    if (done.has(subtaskId)) done.delete(subtaskId); else done.add(subtaskId);
    const doneArr = Array.from(done);

    const allDone = task.subtasks.every((s) => doneArr.indexOf(s.id) >= 0);
    if (!allDone) return Object.assign({}, completionsRepo.updateSubtasksDone(completion.id, doneArr), { unlockedAchievements: [] });

    const autoApprove = !task.requires_approval;
    completionsRepo.updateSubtasksDone(completion.id, doneArr);
    const resolved = completionsRepo.resolve(completion.id, autoApprove ? "approved" : "pending", autoApprove ? "auto" : null);
    let unlocked = [];
    if (autoApprove) unlocked = applyApprovedReward(task, childId, completion.id, today);
    return Object.assign({}, resolved, { unlockedAchievements: unlocked });
  });
}

// Pais aprovam ou rejeitam uma conclusao pendente (tarefa comum ou missao epica).
function resolveCompletion(completionId, status, resolvedBy) {
  if (status !== "approved" && status !== "rejected") throw new GameError("bad_status", "Status inválido.");
  return withTransaction(() => {
    const completion = completionsRepo.get(completionId);
    if (!completion) throw new GameError("not_found", "Conclusão não encontrada.");
    if (completion.status !== "pending") return Object.assign({}, completion, { unlockedAchievements: [] });

    const task = tasksRepo.get(completion.task_id);
    const resolved = completionsRepo.resolve(completionId, status, resolvedBy);
    let unlocked = [];
    if (status === "approved") unlocked = applyApprovedReward(task, completion.child_id, completion.id, completion.date);
    return Object.assign({}, resolved, { unlockedAchievements: unlocked });
  });
}

function childSummary(childId) {
  const xp = transactionsRepo.totalXp(childId);
  const coins = transactionsRepo.coinBalance(childId);
  const streak = streaksRepo.get(childId);
  const level = levelsRepo.forXp(xp);
  return { childId, xp, coins, streak, level };
}

module.exports = { completeTask, toggleEpicSubtask, resolveCompletion, childSummary, GameError };
