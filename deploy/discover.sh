#!/usr/bin/env bash
# Somente leitura - nao muda nada na VPS. Rode isso PRIMEIRO, antes de
# qualquer deploy, para eu (ou voce) entender o que ja existe no servidor
# e evitar colidir com os outros sistemas da Plugwise.
set -uo pipefail

hr() { printf '\n===== %s =====\n' "$1"; }

hr "Sistema"
uname -a
cat /etc/os-release 2>/dev/null | grep -E '^(NAME|VERSION)='

hr "Docker"
if command -v docker >/dev/null 2>&1; then
  docker --version
  docker compose version 2>/dev/null || echo "docker compose (plugin) nao encontrado"
  echo "--- containers rodando ---"
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
else
  echo "docker nao instalado"
fi

hr "Node.js instalado no host (fora de containers)"
command -v node >/dev/null 2>&1 && node --version || echo "node nao instalado no host"

hr "Servidor web / reverse proxy"
for svc in nginx caddy apache2 httpd; do
  if command -v "$svc" >/dev/null 2>&1; then
    echo "$svc encontrado: $(command -v "$svc")"
    systemctl is-active "$svc" 2>/dev/null && echo "  (ativo via systemd)"
  fi
done

if [ -d /etc/nginx/sites-enabled ]; then
  echo "--- /etc/nginx/sites-enabled ---"
  ls -la /etc/nginx/sites-enabled
  echo "--- server_name configurados ---"
  grep -rh "server_name" /etc/nginx/sites-enabled 2>/dev/null
fi
if [ -f /etc/caddy/Caddyfile ]; then
  echo "--- /etc/caddy/Caddyfile ---"
  cat /etc/caddy/Caddyfile
fi

hr "PM2 (se usado para outros sistemas Node)"
command -v pm2 >/dev/null 2>&1 && pm2 list || echo "pm2 nao instalado"

hr "Portas em escuta (quem ja esta usando o que)"
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null

hr "Espaco em disco"
df -h /

hr "Certificados existentes (certbot)"
command -v certbot >/dev/null 2>&1 && certbot certificates 2>/dev/null || echo "certbot nao instalado"

hr "Fim do diagnostico"
echo "Cole a saida acima de volta na conversa, ou siga direto para deploy/deploy.sh se ja entendeu o ambiente."
