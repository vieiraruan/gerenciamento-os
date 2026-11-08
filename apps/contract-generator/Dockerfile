# Lotus online — imagem do servidor (linux/arm64 na Oracle; também funciona em amd64)
FROM node:22-bookworm-slim

# LibreOffice (PDF dos contratos e do relatório do IR) e fontes parecidas com as do Word
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui libreoffice-calc-nogui \
      fonts-liberation fonts-dejavu-core fonts-crosextra-carlito fonts-crosextra-caladea \
      tzdata ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

ENV TZ=America/Recife \
    NODE_ENV=production \
    HOST=0.0.0.0 \
    PORTA=3210 \
    LOTUS_LOGIN=1 \
    CONTRATOS_DRIVE=/drive/CONTRATOS \
    HOME=/home/node

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .

USER node
EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3210/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/servidor.js", "--sem-navegador"]
