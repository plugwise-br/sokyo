"use strict";
const { createApp } = require("./src/app");

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log("Sokyo (Missão Arthur) rodando na porta " + PORT);
});
