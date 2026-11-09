#!/usr/bin/env node
/**
 * Teste do aplicativo Cronograma (só casais de assessoria): lista, cronograma do casal e marcar tarefa.
 *   node scripts/testar-cronograma.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-crono-'));
const dados = path.join(tmp, 'dados'); fs.mkdirSync(dados, { recursive: true });
const d = new Date(); d.setMonth(d.getMonth() + 8);
const dataBr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), `evento_nomes: Ana e Bia\nevento_data: ${dataBr}\nnumero_os: AS-0999\ndestination: Sim\n`);
fs.writeFileSync(path.join(dados, 'caio-e-davi.txt'), `evento_nomes: Caio e Davi\nevento_data: ${dataBr}\nnumero_os: CE-0999\n`);
const PORTA = 3386;
const env = { ...process.env, CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: path.join(tmp, 'saida'), SEM_ATUALIZAR: '1', PORTA: String(PORTA) };
delete env.LOTUS_LOGIN; delete env.HOST;
const app = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; app.stdout.on('data', (x) => { log += x; }); app.stderr.on('data', (x) => { log += x; });
const pedir = (metodo, caminho, corpo) => new Promise((ok, erro) => {
  const envio = corpo ? JSON.stringify(corpo) : '';
  const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo, headers: corpo ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(envio) } : {} }, (res) => {
    let s = ''; res.on('data', (c) => { s += c; }); res.on('end', () => { let j = null; try { j = JSON.parse(s); } catch { /* html */ } ok({ status: res.statusCode, j, s }); });
  });
  r.on('error', erro); r.end(envio);
});

(async () => {
  for (let i = 0; i < 50; i++) { try { await pedir('GET', '/saude'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  let n = 0; const ok = (m) => { n++; console.log(`  ✓ ${m}`); };
  try {
    const l = await pedir('GET', '/api/cronograma');
    assert.strictEqual(l.j.casais.length, 1); assert.strictEqual(l.j.casais[0].numero_os, 'AS-0999');
    assert.ok(l.j.casais[0].ritmo.total > 50 && l.j.casais[0].agora && l.j.casais[0].dias > 200);
    ok('lista só os casais de assessoria, com ritmo e tarefas do período');

    const c = await pedir('GET', '/api/cronograma/casal?arquivo=ana-e-bia.txt');
    assert.ok(c.j.secoes.length >= 1 && c.j.ritmo.concluidas <= 1, JSON.stringify({ s: c.j.secoes.length, r: c.j.ritmo }));
    assert.strictEqual((await pedir('GET', '/api/cronograma/casal?arquivo=caio-e-davi.txt')).status, 400);
    ok('cronograma do casal AS; cerimonial (CE) recusado');

    const t = c.j.secoes[0].itens[0]; const base = c.j.ritmo.concluidas; // a data do contrato já conta como feita
    const m = await pedir('POST', '/api/cronograma/tarefa', { arquivo: 'ana-e-bia.txt', chave: t.chave, status: 'FINALIZADO' });
    assert.strictEqual(m.status, 200, m.s);
    assert.strictEqual(m.j.ritmo.concluidas, base + 1); assert.ok(m.j.concluidas.some((i) => i.chave === t.chave && i.concluida_em));
    const o = await pedir('POST', '/api/cronograma/tarefa', { arquivo: 'ana-e-bia.txt', chave: t.chave, obs: 'feito com a noiva' });
    assert.ok(o.j.concluidas.find((i) => i.chave === t.chave).obs === 'feito com a noiva');
    ok('marcar tarefa: sai do cronograma para "Já concluídas", com observação');

    const ev = JSON.parse(fs.readFileSync(fs.readdirSync(path.join(dados, 'eventos')).map((f) => path.join(dados, 'eventos', f))[0]));
    assert.strictEqual(ev.tarefas[t.chave].status, 'FINALIZADO');
    ok('fica guardado no evento do casal (o mesmo que o Checklist e o portal do casal usam)');

    assert.strictEqual((await pedir('GET', '/cronograma')).status, 200);
    ok('página /cronograma abre');
    console.log(`\n✓ cronograma: ${n} verificações passaram`);
  } catch (e) { console.error('✗', e.message, log.slice(-1500)); process.exitCode = 1; }
  finally { app.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }
})();
