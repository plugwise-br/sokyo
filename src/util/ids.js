"use strict";
const crypto = require("crypto");

function id() {
  return crypto.randomUUID();
}

module.exports = { id };
