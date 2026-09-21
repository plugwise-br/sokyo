# Deploy do Sokyo na VPS

Este runbook foi feito pra ser seguido por você (ou por mim, se em algum momento eu ganhar acesso SSH à VPS) sem risco pros outros sistemas da Plugwise que já rodam nela. Nada aqui reinicia serviços existentes, sobrescreve configuração de outro site, ou assume que a VPS está vazia.

## 0. Pré-requisito: DNS

Crie um registro **A** para `sokyo.plugwise.com.br` apontando para o IP da VPS (`45.80.152.136`), no provedor de DNS onde o domínio `plugwise.com.br` está gerenciado. Isso é feito fora da VPS — eu não tenho acesso a isso.

## 1. Diagnóstico (rode primeiro, sempre)

Por SSH na VPS:

```bash
git clone https://github.com/plugwise-br/sokyo.git
cd sokyo
bash deploy/discover.sh
```

Isso só **lê** o estado da VPS (Docker instalado? Nginx ou Caddy? quais portas já estão em uso? quais containers já rodam?). Não muda nada. Se quiser, cole a saída de volta pra mim e eu reviso antes do próximo passo — ou já dá pra seguir direto se o resultado fizer sentido pra você.

## 2. Subir o Sokyo (isolado, porta própria)

```bash
bash deploy/deploy.sh
```

O script:
- Detecta sozinho uma porta local livre a partir de `3010` (não assume que ela está desocupada — se os outros sistemas da Plugwise já usam `3010`, ele pula pra `3011`, `3012`... e avisa qual porta escolheu).
- Sobe o container via Docker Compose, só acessível em `127.0.0.1` (nunca exposto direto na internet).
- Dados ficam em `sokyo/data/sokyo.db`, num volume próprio — não compartilha nada com outros containers.

Rodar de novo no futuro (`bash deploy/deploy.sh`) atualiza o código (`git pull`) e reconstrói o container — seguro rodar quantas vezes precisar.

## 3. Expor no subdomínio

Dependendo do que o `discover.sh` mostrou:

- **Se a VPS usa Nginx**: siga as instruções em `deploy/nginx-sokyo.conf.example` (copiar o arquivo, `nginx -t`, reload, depois `certbot --nginx -d sokyo.plugwise.com.br`).
- **Se usa Caddy**: adicione o bloco de `deploy/Caddyfile-sokyo.example` ao Caddyfile existente e recarregue.
- **Se não há nenhum dos dois ainda**: me avisa — aí decidimos juntos se instalamos Nginx só pra isso ou se existe preferência da Plugwise.

Em nenhum caso o arquivo de configuração de outro site é tocado — cada exemplo aqui é um vhost/bloco novo e isolado.

## 4. Verificação

```bash
curl -I https://sokyo.plugwise.com.br
```

Deve responder `200 OK`. Abra no navegador, confirme que a tela de seleção de perfil aparece, e teste "Adicionar à tela inicial" no celular pra confirmar que o PWA instala.

## 5. Depois do primeiro deploy

- **Troque o PIN padrão** (`1010`) pelo Modo pais → Mesada → Trocar PIN, assim que confirmar que está tudo funcionando.
- Backup do banco: `cp sokyo/data/sokyo.db sokyo/data/sokyo.backup-$(date +%F).db` de vez em quando (é um arquivo único, fácil de copiar).

## 6. Ativar a área de admin (marca do produto)

Existe uma tela separada em `/admin` (ex.: `https://sokyo.plugwise.com.br/admin.html`) onde dá pra trocar nome do app, tagline, cores e logo — aplicado pra todo mundo, sem precisar mexer em código. É protegida por um PIN **próprio**, diferente do PIN das famílias, e **fica desativada por padrão** até você definir esse PIN.

Pra ativar, defina `ADMIN_PIN` antes de subir o container:

```bash
echo "ADMIN_PIN=escolha_um_pin_forte_aqui" >> .env
bash deploy/deploy.sh
```

Escolha um PIN forte e diferente do `1010` das famílias — quem tiver esse PIN controla a identidade visual de todo o produto. O arquivo `.env` não vai pro Git (está no `.gitignore`), fica só na VPS.
