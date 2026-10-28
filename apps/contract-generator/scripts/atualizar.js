#!/usr/bin/env node
'use strict';

/**
 * Atualização automática ao abrir o aplicativo (chamado pelo abrir-aplicativo.cmd).
 *
 * - Busca a versão mais nova no GitHub (git pull --ff-only), sem pedir senha:
 *   se não houver internet ou login, segue com a versão atual.
 * - Não mexe em cópias com arquivos alterados localmente.
 * - Se as dependências mudaram (package-lock.json), roda "npm ci".
 *
 * Desligar: variável de ambiente SEM_ATUALIZAR=1.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };

function rodar(cmd, args, timeout = 30000) {
  const r = spawnSync(cmd, args, { cwd: APP, env: ENV, encoding: 'utf8', timeout, shell: cmd === npm });
  return { ok: r.status === 0, saida: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

function main() {
  if (process.env.SEM_ATUALIZAR === '1') return;
  if (!rodar('git', ['rev-parse', '--is-inside-work-tree']).ok) return; // sem git ou fora do repositório

  if (rodar('git', ['status', '--porcelain', '--untracked-files=no']).saida) {
    console.log('  Atualização pulada: há arquivos alterados nesta cópia.');
    return;
  }
  const antes = rodar('git', ['rev-parse', 'HEAD']).saida;
  const lockAntes = rodar('git', ['rev-parse', 'HEAD:apps/contract-generator/package-lock.json']).saida;

  const pull = rodar('git', ['pull', '--ff-only', '-q'], 20000);
  if (!pull.ok) {
    console.log('  Sem atualização agora (sem internet ou sem acesso ao GitHub). Usando a versão atual.');
    return;
  }
  const depois = rodar('git', ['rev-parse', 'HEAD']).saida;
  if (antes === depois) return;

  console.log(`  Sistema atualizado: ${rodar('git', ['log', '--oneline', '-1']).saida}`);
  const lockDepois = rodar('git', ['rev-parse', 'HEAD:apps/contract-generator/package-lock.json']).saida;
  if (lockAntes !== lockDepois || !fs.existsSync(path.join(APP, 'node_modules', 'docxtemplater'))) {
    console.log('  Atualizando dependências...');
    const ci = rodar(npm, ['ci', '--no-audit', '--no-fund', '--loglevel=error'], 180000);
    if (!ci.ok) console.log(`  Falha ao atualizar dependências. Rode o instalar-sistema.cmd.\n${ci.saida}`);
  }
}

try { main(); } catch (e) { console.log(`  Atualização ignorada: ${e.message}`); }
