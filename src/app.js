"use strict";
const express = require("express");
const path = require("path");
const { DATA_DIR } = require("./db");
const brandingRepo = require("./repositories/branding");

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
  app.use("/api/admin", require("./routes/admin"));

  // manifest.json dinamico: reflete o nome/icone que o super admin definiu,
  // sem precisar de redeploy. Precisa vir ANTES do express.static abaixo
  // (que tambem serviria um manifest.json estatico de public/).
  app.get("/manifest.json", (req, res) => {
    const b = brandingRepo.get();
    const icon = b && b.logo_url ? b.logo_url : "/icons/icon-192.png";
    const iconBig = b && b.logo_url ? b.logo_url : "/icons/icon-512.png";
    res.json({
      name: b ? b.app_name : "Sokyo",
      short_name: b ? b.app_name.split(" ")[0] : "Sokyo",
      description: b && b.tagline ? b.tagline : "Pequenas missões. Grandes conquistas.",
      start_url: "/", scope: "/", display: "standalone", orientation: "portrait-primary",
      background_color: "#FBF6EC",
      theme_color: b && b.primary_color ? b.primary_color : "#1F8A70",
      icons: [
        { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: iconBig, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    });
  });

  // Logo enviado pelo super admin: fica no volume persistente (data/uploads),
  // nao na imagem da aplicacao - sobrevive a rebuild/redeploy.
  app.use("/branding-uploads", express.static(path.join(DATA_DIR, "uploads")));

  app.use(express.static(path.join(__dirname, "..", "public")));

  return app;
}

module.exports = { createApp };
