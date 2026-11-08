#!/usr/bin/env bash
# Atualiza o Lotus online para a última versão do GitHub.
set -euo pipefail
cd /opt/lotus/gerenciamento-os
git pull --ff-only
cd infra/oracle/servidor
docker compose build --pull lotus
docker compose up -d
docker image prune -f >/dev/null
docker compose ps
