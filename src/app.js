"use strict";
const express = require("express");
const path = require("path");

function createApp() {
  const app = express();
  app.use(express.json());

  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/children", require("./routes/children"));
  app.use("/api/tasks", require("./routes/tasks"));
  app.use("/api", require("./routes/completions"));
  app.use("/api", require("./routes/rewards"));
  app.use("/api", require("./routes/goals"));
  app.use("/api", require("./routes/misc"));

  app.use(express.static(path.join(__dirname, "..", "public")));

  return app;
}

module.exports = { createApp };
