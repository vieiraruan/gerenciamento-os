'use strict';

/**
 * Onde o gerador lê e grava os arquivos.
 *
 * Com o Google Drive para computador instalado, tudo fica no Drive:
 *
 *   CONTRATOS/
 *   ├── ASSESSORIA/                        ← casais da linha AS
 *   │   └── (AS-0043) ASSESSORIA NOIVA & NOIVO/
 *   ├── CERIMONIAL/                        ← casais da linha CE
 *   │   └── (CE-0067) CERIMONIAL NOIVA & NOIVO/
 *   └── CONTRATOS GERADOS/
 *       └── _DADOS DO SISTEMA/             ← compartilhado entre as máquinas
 *           ├── *.txt                      dados de cada contrato
 *           ├── clientes/*.txt             cadastro de clientes
 *           ├── empresa.json               dados da contratada
 *           └── sequencias.json            numeração AS/CE
 *
 * Ordem de prioridade:
 *   1. Variáveis de ambiente CONTRATOS_DADOS / CONTRATOS_SAIDA (ou parâmetros)
 *   2. Pasta CONTRATOS do Google Drive (CONTRATOS_DRIVE ou detecção automática)
 *   3. Pasta local "contratos" ao lado do repositório (sem Drive)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const NOME_SAIDA = 'CONTRATOS GERADOS';
const NOME_DADOS = '_DADOS DO SISTEMA';

/** Procura a pasta CONTRATOS do Google Drive para computador. */
function encontrarDrive() {
  if (process.env.CONTRATOS_DRIVE) {
    return fs.existsSync(process.env.CONTRATOS_DRIVE) ? path.resolve(process.env.CONTRATOS_DRIVE) : null;
  }
  const nomes = ['Meu Drive', 'My Drive'];
  const candidatos = [];
  if (process.platform === 'win32') {
    // modo "streaming": unidade virtual (normalmente G:)
    for (const letra of 'GHIJKLMNOPQRSTUVWXYZDEF') {
      for (const n of nomes) candidatos.push(`${letra}:\\${n}\\CONTRATOS`);
    }
  }
  // modo "espelho" e macOS
  const home = os.homedir();
  for (const n of nomes) {
    candidatos.push(path.join(home, n, 'CONTRATOS'));
    candidatos.push(path.join(home, 'Google Drive', n, 'CONTRATOS'));
  }
  const cloud = path.join(home, 'Library', 'CloudStorage');
  if (fs.existsSync(cloud)) {
    for (const conta of fs.readdirSync(cloud).filter((d) => d.startsWith('GoogleDrive'))) {
      for (const n of nomes) candidatos.push(path.join(cloud, conta, n, 'CONTRATOS'));
    }
  }
  return candidatos.find((c) => {
    try { return fs.statSync(c).isDirectory(); } catch { return false; }
  }) || null;
}

/**
 * Resolve todas as pastas/arquivos usados.
 * `saida` é a pasta-base: o gerador cria a pasta do casal em `saida/ASSESSORIA` ou `saida/CERIMONIAL`.
 * @param {{dados?: string, saida?: string}} opcoes caminhos explícitos (opcional)
 */
function resolverPastas(opcoes = {}) {
  const dadosExplicito = opcoes.dados || process.env.CONTRATOS_DADOS;
  const saidaExplicita = opcoes.saida || process.env.CONTRATOS_SAIDA;
  let modo;
  let dados;
  let saida;
  let drive = null;

  if (dadosExplicito) {
    modo = 'manual';
    dados = path.resolve(dadosExplicito);
    saida = path.resolve(saidaExplicita || path.join(dados, 'gerados'));
  } else if ((drive = encontrarDrive())) {
    modo = 'drive';
    saida = path.resolve(saidaExplicita || drive);
    dados = path.join(path.join(drive, NOME_SAIDA), NOME_DADOS);
  } else {
    modo = 'local';
    dados = path.resolve(RAIZ, '..', '..', '..', 'contratos');
    saida = path.resolve(saidaExplicita || path.join(dados, 'gerados'));
  }

  const clientes = path.join(dados, 'clientes');
  const noDados = (arq) => path.join(dados, arq);
  const noRepo = (arq) => path.join(RAIZ, 'config', arq);

  // empresa.json e sequencias.json: no Drive (compartilhados) quando houver;
  // senão, na pasta config/ do repositório desta máquina.
  const empresa = fs.existsSync(noDados('empresa.json')) ? noDados('empresa.json') : noRepo('empresa.json');
  const sequencias = process.env.CONTRATOS_SEQUENCIAS
    || (modo === 'drive' || fs.existsSync(noDados('sequencias.json')) ? noDados('sequencias.json') : noRepo('sequencias.json'));

  return { modo, drive, dados, saida, clientes, empresa, sequencias };
}

/** Cria as pastas e, no primeiro uso do Drive, copia a numeração local. */
function prepararPastas(p) {
  fs.mkdirSync(p.clientes, { recursive: true });
  fs.mkdirSync(p.saida, { recursive: true });
  if (!fs.existsSync(p.sequencias)) {
    const local = path.join(RAIZ, 'config', 'sequencias.json');
    fs.writeFileSync(p.sequencias, fs.existsSync(local) ? fs.readFileSync(local) : '{\n  "AS": 0,\n  "CE": 0\n}\n');
  }
  return p;
}

module.exports = { resolverPastas, prepararPastas, encontrarDrive, NOME_SAIDA, NOME_DADOS };
