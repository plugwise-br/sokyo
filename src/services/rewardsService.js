"use strict";
const rewardsRepo = require("../repositories/rewards");
const redemptionsRepo = require("../repositories/redemptions");
const transactionsRepo = require("../repositories/transactions");
const { withTransaction } = require("../db");
const { GameError } = require("./gameService");

// A crianca NUNCA manipula o proprio saldo diretamente - resgatar so cria um
// pedido; a moeda so sai de fato quando o pedido e aprovado (ou na hora, se
// a recompensa nao exigir aprovacao).
function redeem(childId, rewardId) {
  return withTransaction(() => {
    const reward = rewardsRepo.get(rewardId);
    if (!reward || !reward.active) throw new GameError("reward_not_found", "Recompensa não encontrada ou indisponível.");
    if (reward.stock != null && reward.stock <= 0) throw new GameError("out_of_stock", "Essa recompensa acabou.");
    const balance = transactionsRepo.coinBalance(childId);
    if (balance < reward.cost_coins) throw new GameError("insufficient_coins", "Moedas insuficientes para essa recompensa.");

    const autoApprove = !reward.requires_approval;
    const redemption = redemptionsRepo.create({
      rewardId, childId, costCoins: reward.cost_coins, status: autoApprove ? "approved" : "pending"
    });
    if (autoApprove) {
      transactionsRepo.addCoins(childId, -reward.cost_coins, "reward_redemption", redemption.id);
      rewardsRepo.decrementStock(rewardId);
    }
    return redemption;
  });
}

function resolveRedemption(redemptionId, status, resolvedBy) {
  if (status !== "approved" && status !== "rejected") throw new GameError("bad_status", "Status inválido.");
  return withTransaction(() => {
    const redemption = redemptionsRepo.get(redemptionId);
    if (!redemption) throw new GameError("not_found", "Solicitação não encontrada.");
    if (redemption.status !== "pending") return redemption;

    if (status === "approved") {
      const balance = transactionsRepo.coinBalance(redemption.child_id);
      if (balance < redemption.cost_coins) throw new GameError("insufficient_coins", "A criança não tem mais moedas suficientes.");
      transactionsRepo.addCoins(redemption.child_id, -redemption.cost_coins, "reward_redemption", redemption.id);
      rewardsRepo.decrementStock(redemption.reward_id);
    }
    return redemptionsRepo.resolve(redemptionId, status, resolvedBy);
  });
}

module.exports = { redeem, resolveRedemption };
