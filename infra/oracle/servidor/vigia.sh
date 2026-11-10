#!/usr/bin/env bash
# Vigia do Lotus (roda a cada 2 min pelo lotus-vigia.timer).
# Se a pasta do Drive (rclone) parar de responder, o Lotus trava junto: reinicia os dois.
# Se só o Lotus parar de responder, reinicia o Lotus.
AQUI=/opt/lotus/gerenciamento-os/infra/oracle/servidor
DADOS="/srv/drive/CONTRATOS/CONTRATOS GERADOS/_DADOS DO SISTEMA"
log() { logger -t lotus-vigia "$*"; echo "$*"; }

if ! timeout 25 ls "$DADOS" >/dev/null 2>&1; then
  log "Drive sem resposta: reiniciando lotus-drive e o Lotus"
  docker compose --project-directory "$AQUI" stop -t 10 lotus
  systemctl restart lotus-drive
  timeout 60 ls "$DADOS" >/dev/null 2>&1 || log "Drive continua sem resposta"
  docker compose --project-directory "$AQUI" up -d lotus
  exit 0
fi

if ! docker compose --project-directory "$AQUI" exec -T lotus node -e \
  "fetch('http://127.0.0.1:3210/saude',{signal:AbortSignal.timeout(15000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" >/dev/null 2>&1; then
  sleep 30  # pode estar só iniciando
  if ! curl -fsS -m 15 -o /dev/null --resolve "$(grep '^LOTUS_DOMINIO=' "$AQUI/.env" | cut -d= -f2):443:127.0.0.1" "https://$(grep '^LOTUS_DOMINIO=' "$AQUI/.env" | cut -d= -f2)/saude"; then
    log "Lotus sem resposta: reiniciando"
    docker compose --project-directory "$AQUI" restart -t 10 lotus
  fi
fi
