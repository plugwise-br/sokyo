#!/usr/bin/env bash
# Deploy isolado do Sokyo: escolhe sozinho uma porta local livre (nunca
# assume que 3010 esta desocupada - outros sistemas da Plugwise podem
# ja estar usando ela), sobe via Docker Compose e nao mexe em mais nada
# na VPS. Idempotente: pode rodar de novo a qualquer momento para
# atualizar (git pull + rebuild).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado. Instale o Docker antes de continuar (https://docs.docker.com/engine/install/)." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Plugin 'docker compose' nao encontrado. Instale docker-compose-plugin." >&2
  exit 1
fi

port_in_use() {
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":$1\$"
}

# A porta escolhida fica gravada aqui (fora do Git) para NUNCA mudar sozinha
# entre deploys - se o script re-escaneasse toda vez, ele veria o proprio
# container antigo do Sokyo ainda ocupando a porta (bem no instante antes de
# ser substituido) e pularia pra outra porta a toa, quebrando o Nginx que
# aponta pra porta antiga.
PORT_FILE="$(dirname "$0")/.port"

if [ -n "${SOKYO_PORT:-}" ]; then
  PORT="$SOKYO_PORT" # override explicito (variavel de ambiente ou .env) sempre vence
elif [ -f "$PORT_FILE" ]; then
  PORT="$(cat "$PORT_FILE")"
  echo "Reusando a porta do deploy anterior: $PORT"
else
  PORT=3010
  while port_in_use "$PORT"; do
    echo "Porta $PORT ja esta em uso, tentando a proxima..."
    PORT=$((PORT + 1))
  done
fi
echo "$PORT" > "$PORT_FILE"
export SOKYO_PORT="$PORT"

echo "Atualizando codigo (git pull)..."
git pull --ff-only

echo "Subindo o Sokyo na porta local 127.0.0.1:$PORT ..."
docker compose up -d --build

echo
echo "OK. Sokyo rodando em http://127.0.0.1:$PORT (so acessivel dentro da propria VPS)."
echo "Dados persistidos em: $(pwd)/data/sokyo.db"
echo
if [ "$PORT" != "3010" ]; then
  echo "=================================================================="
  echo "ATENCAO: a porta em uso e $PORT, nao a padrao 3010."
  echo "Confirme que o Nginx (/etc/nginx/sites-available/sokyo) aponta pra"
  echo "'proxy_pass http://127.0.0.1:$PORT;' - senao o site fica fora do ar"
  echo "com 502 Bad Gateway mesmo com o container saudavel."
  echo "=================================================================="
fi
echo "Proximo passo: configurar o Nginx com deploy/nginx-sokyo.conf.example para expor em sokyo.plugwise.com.br"
