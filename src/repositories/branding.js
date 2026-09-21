"use strict";
const { db } = require("../db");

function get() {
  return db.prepare("SELECT * FROM branding WHERE id='default'").get();
}

function update(body) {
  const current = get();
  const next = {
    app_name: body.appName !== undefined && body.appName.trim() ? body.appName.trim() : current.app_name,
    tagline: body.tagline !== undefined ? body.tagline : current.tagline,
    primary_color: body.primaryColor !== undefined ? body.primaryColor : current.primary_color,
    secondary_color: body.secondaryColor !== undefined ? body.secondaryColor : current.secondary_color,
    gold_color: body.goldColor !== undefined ? body.goldColor : current.gold_color,
    accent_color: body.accentColor !== undefined ? body.accentColor : current.accent_color,
    logo_url: body.logoUrl !== undefined ? body.logoUrl : current.logo_url
  };
  db.prepare(
    `UPDATE branding SET app_name=?, tagline=?, primary_color=?, secondary_color=?, gold_color=?, accent_color=?, logo_url=? WHERE id='default'`
  ).run(next.app_name, next.tagline, next.primary_color, next.secondary_color, next.gold_color, next.accent_color, next.logo_url);
  return get();
}

module.exports = { get, update };
