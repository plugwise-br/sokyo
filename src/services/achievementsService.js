"use strict";
const achievementsRepo = require("../repositories/achievements");
const completionsRepo = require("../repositories/completions");
const streaksRepo = require("../repositories/streaks");

// Conquistas sao sempre independentes de dinheiro (item 18 do briefing) -
// so avaliam streak e contagem de tarefas concluidas, nunca moedas.
function evaluateAndUnlock(familyId, childId) {
  const rules = achievementsRepo.listByFamily(familyId);
  const unlocked = [];
  const streak = streaksRepo.get(childId);
  const totalApproved = completionsRepo.countApprovedByChild(childId);

  rules.forEach((rule) => {
    if (achievementsRepo.isUnlocked(childId, rule.id)) return;
    let qualifies = false;
    if (rule.rule_type === "streak_at_least") {
      qualifies = streak.best >= rule.rule_value;
    } else if (rule.rule_type === "total_completions_at_least") {
      qualifies = totalApproved >= rule.rule_value;
    } else if (rule.rule_type === "completions_in_category_at_least") {
      const n = completionsRepo.countApprovedByChildAndCategory(childId, rule.rule_category_id);
      qualifies = n >= rule.rule_value;
    }
    if (qualifies) {
      const a = achievementsRepo.unlock(childId, rule.id);
      if (a) unlocked.push(a);
    }
  });
  return unlocked;
}

module.exports = { evaluateAndUnlock };
