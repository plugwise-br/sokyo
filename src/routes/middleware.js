"use strict";
const parentsRepo = require("../repositories/parents");

// Toda acao administrativa (aprovar, criar/editar tarefas e recompensas,
// configurar mesada, trocar PIN) passa por aqui. A crianca nunca tem token
// de sessao de pais - so o frontend "modo pais" pede PIN e guarda o token.
function requireParent(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const session = token && parentsRepo.getSession(token);
  if (!session) return res.status(401).json({ error: "unauthorized" });
  parentsRepo.touchSession(token);
  req.parentId = session.parent_id;
  next();
}

function handleGameError(err, res) {
  if (err && err.code) {
    const statusByCode = {
      task_not_found: 404, reward_not_found: 404, not_found: 404, subtask_not_found: 404,
      wrong_endpoint: 400, bad_status: 400,
      insufficient_coins: 409, out_of_stock: 409, already_paid: 409, nothing_to_pay: 400
    };
    return res.status(statusByCode[err.code] || 400).json({ error: err.code, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "internal_error" });
}

module.exports = { requireParent, handleGameError };
