"use strict";
const express = require("express");
const achievementsRepo = require("../repositories/achievements");
const completionsRepo = require("../repositories/completions");
const reportService = require("../services/reportService");
const allowanceRepo = require("../repositories/allowance");
const allowanceService = require("../services/allowanceService");
const gameService = require("../services/gameService");
const dates = require("../util/dates");
const { familyId } = require("../db");
const { requireParent, handleGameError } = require("./middleware");

const router = express.Router();

router.get("/children/:childId/achievements", (req, res) => {
  res.json({
    unlocked: achievementsRepo.listUnlockedByChild(req.params.childId),
    all: achievementsRepo.listByFamily(familyId)
  });
});

router.get("/achievements", requireParent, (req, res) => {
  res.json(achievementsRepo.listByFamily(familyId));
});

router.post("/achievements", requireParent, (req, res) => {
  const name = String((req.body && req.body.name) || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  res.json(achievementsRepo.create(familyId, req.body));
});

router.put("/achievements/:id", requireParent, (req, res) => {
  const a = achievementsRepo.update(req.params.id, req.body || {});
  if (!a) return res.status(404).json({ error: "not_found" });
  res.json(a);
});

router.delete("/achievements/:id", requireParent, (req, res) => {
  const ok = achievementsRepo.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

// Diario: historico de conclusoes de uma janela de dias (padrao 14).
router.get("/children/:childId/diary", (req, res) => {
  const days = Math.min(60, parseInt(req.query.days, 10) || 14);
  const to = dates.todayKey();
  const from = dates.addDaysKey(to, -days);
  res.json(completionsRepo.listByChildInRange(req.params.childId, from, to));
});

router.get("/children/:childId/report/weekly", (req, res) => {
  res.json(reportService.weeklyReport(familyId, req.params.childId));
});

router.get("/allowance/settings", requireParent, (req, res) => {
  res.json(allowanceRepo.getSettings(familyId));
});

router.put("/allowance/settings", requireParent, (req, res) => {
  res.json(allowanceRepo.updateSettings(familyId, req.body || {}));
});

router.post("/children/:childId/allowance/pay-week", requireParent, (req, res) => {
  try {
    res.json(allowanceService.payWeek(familyId, req.params.childId));
  } catch (err) { handleGameError(err, res); }
});

router.get("/children/:childId/allowance/history", requireParent, (req, res) => {
  res.json(allowanceRepo.listPayouts(req.params.childId));
});

// Painel dos pais: visao geral (item 20 do briefing).
router.get("/dashboard", requireParent, (req, res) => {
  const childrenRepo = require("../repositories/children");
  const children = childrenRepo.listByFamily(familyId).map((c) => Object.assign({}, c, gameService.childSummary(c.id)));
  res.json({
    children,
    pendingCompletions: require("../repositories/completions").listPendingByFamily(familyId).length,
    pendingRedemptions: require("../repositories/redemptions").listPendingByFamily(familyId).length
  });
});

module.exports = router;
