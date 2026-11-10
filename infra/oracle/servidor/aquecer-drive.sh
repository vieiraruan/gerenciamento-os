#!/bin/sh
# Carrega no servidor a árvore de pastas do Drive e os arquivos de dados do Lotus (roda ao montar o Drive).
# Cada pasta/arquivo ainda não lido é uma chamada ao Google (~1-2 s); depois ficam em memória/cache
# e só são buscados de novo quando mudam no Drive (o rclone acompanha as mudanças a cada 15 s).
RAIZ=/srv/drive/CONTRATOS
DADOS="$RAIZ/CONTRATOS GERADOS/_DADOS DO SISTEMA"
INICIO=$(date +%s)
find "$RAIZ" -maxdepth 4 -type d >/dev/null 2>&1   # casal/pasta do fornecedor/arquivos: o que o Lotus percorre
find "$DADOS" -type f -size -5M -exec cat {} + >/dev/null 2>&1
logger -t lotus-drive "Drive carregado em $(( $(date +%s) - INICIO ))s"
