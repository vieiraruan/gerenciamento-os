#!/usr/bin/env bash
# Prepara o servidor do Lotus (Ubuntu 24.04 da Oracle, depois do cloud-init). Rodar como ubuntu, com sudo.
# Antes: /etc/lotus/rclone.conf (credencial do Drive) e /opt/lotus/gerenciamento-os/infra/oracle/servidor/.env
set -euo pipefail
REPO=/opt/lotus/gerenciamento-os
AQUI=$REPO/infra/oracle/servidor

[ -d "$REPO/.git" ] || git clone https://github.com/vieiraruan/gerenciamento-os.git "$REPO"
git -C "$REPO" pull --ff-only

sudo apt-get update -qq
sudo apt-get install -y -qq rclone fuse3
grep -q '^user_allow_other' /etc/fuse.conf || echo user_allow_other | sudo tee -a /etc/fuse.conf >/dev/null

# Drive
sudo install -d -m 700 /etc/lotus
[ -f /etc/lotus/rclone.conf ] || { echo 'Falta /etc/lotus/rclone.conf (credencial do Google Drive).'; exit 1; }
sudo chmod 600 /etc/lotus/rclone.conf
sudo install -m 644 "$AQUI/lotus-drive.service" /etc/systemd/system/lotus-drive.service
sudo systemctl daemon-reload
sudo systemctl enable --now lotus-drive
for i in $(seq 1 30); do [ -d "/srv/drive/CONTRATOS/CONTRATOS GERADOS" ] && break; sleep 2; done
ls "/srv/drive/CONTRATOS/CONTRATOS GERADOS/_DADOS DO SISTEMA" >/dev/null

# Aplicativo
[ -f "$AQUI/.env" ] || { echo "Falta $AQUI/.env (modelo: .env.exemplo)."; exit 1; }
chmod 600 "$AQUI/.env"
cd "$AQUI"
docker compose build --pull
docker compose up -d
sleep 5
docker compose ps
