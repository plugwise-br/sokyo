"use strict";
const express = require("express");
const gameService = require("../services/gameService");
const completionsRepo = require("../repositories/completions");
const { familyId } = require("../db");
const { requireParent, handleGameError } = require("./middleware");

const router = express.Router();

// Publico (a crianca nao tem login): marcar uma tarefa comum como feita.
router.post("/children/:childId/tasks/:taskId/complete", (req, res) => {
  try {
    res.json(gameService.completeTask(req.params.childId, req.params.taskId));
  } catch (err) { handleGameError(err, res); }
});

// Publico: alternar uma subtarefa de missao epica.
router.post("/children/:childId/tasks/:taskId/subtasks/:subtaskId/toggle", (req, res) => {
  try {
    res.json(gameService.toggleEpicSubtask(req.params.childId, req.params.taskId, req.params.subtaskId));
  } catch (err) { handleGameError(err, res); }
});

// Protegido: fila de aprovacao dos pais.
router.get("/completions/pending", requireParent, (req, res) => {
  res.json(completionsRepo.listPendingByFamily(familyId));
});

router.post("/completions/:id/resolve", requireParent, (req, res) => {
  try {
    res.json(gameService.resolveCompletion(req.params.id, req.body && req.body.status, req.parentId));
  } catch (err) { handleGameError(err, res); }
});

module.exports = router;
