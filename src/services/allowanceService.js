"use strict";
const allowanceRepo = require("../repositories/allowance");
const transactionsRepo = require("../repositories/transactions");
const dates = require("../util/dates");
const { withTransaction } = require("../db");
const { GameError } = require("./gameService");

// MODELO A (fixed): paga sempre o valor base, independente do desempenho.
// MODELO B (performance): paga base + (moedas ganhas na semana * valor por moeda).
function payWeek(familyId, childId) {
  return withTransaction(() => {
    const settings = allowanceRepo.getSettings(familyId);
    const weekStart = dates.startOfWeekKey();
    const already = allowanceRepo.findPayout(childId, weekStart);
    if (already) throw new GameError("already_paid", "A mesada dessa semana já foi paga.");

    const weekStartISO = dates.keyToUTCDate(weekStart).toISOString();
    const nextWeekISO = dates.keyToUTCDate(dates.addDaysKey(weekStart, 7)).toISOString();
    const coinsEarned = transactionsRepo.coinsEarnedInRange(childId, weekStartISO, nextWeekISO);

    let value;
    if (settings.model === "fixed") {
      value = settings.base_value;
    } else {
      value = settings.base_value + coinsEarned * settings.coin_value;
    }
    if (value <= 0) throw new GameError("nothing_to_pay", "Nada a pagar essa semana.");

    return allowanceRepo.createPayout(childId, weekStart, coinsEarned, Math.round(value * 100) / 100);
  });
}

module.exports = { payWeek };
