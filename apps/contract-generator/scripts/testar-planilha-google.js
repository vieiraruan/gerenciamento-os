#!/usr/bin/env node
/**
 * Teste da conexão direta com a planilha do Google (sem internet): sobe o Lotus e um "Apps Script" falso e confere
 * que um pagamento chega à planilha na hora, com as datas em dd/mm/aaaa, e que falhas não perdem o lançamento.
 *   node scripts/testar-planilha-google.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-gplan-'));
const dados = path.join(tmp, 'dados'); const saida = path.join(tmp, 'saida');
fs.mkdirSync(path.join(dados, 'planilhas'), { recursive: true });
fs.mkdirSync(path.join(dados, 'integracoes'), { recursive: true });
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), 'evento_nomes: Ana e Bia\nevento_data: 10/10/2027\nnumero_os: AS-0999\nvalor_total: 5000\n');
fs.writeFileSync(path.join(dados, 'planilhas', 'AS-0999.json'), JSON.stringify({ formato: 1, abas: {} })); // casal com planilha do Google
const PORTA = 3397; const PORTA_G = 3396;
const conf = (o) => fs.writeFileSync(path.join(dados, 'integracoes', 'google-planilhas.json'), JSON.stringify(o));
conf({ url: `http://127.0.0.1:${PORTA_G}/macros/s/teste/exec`, chave: 'chave-certa' });

// ---- Apps Script falso: POST → 302 para o resultado (como o Google faz) ----
const recebidos = []; let resultado = null;
const google = http.createServer((req, res) => {
  let corpo = ''; req.on('data', (c) => { corpo += c; });
  req.on('end', () => {
    if (req.method === 'POST') {
      const p = JSON.parse(corpo);
      recebidos.push(p);
      resultado = p.chave === 'chave-certa' ? { ok: true, linhas: p.linhas.length, planilha: 'PLANILHA - Ana e Bia', em: new Date().toISOString() } : { erro: 'chave inválida' };
      res.writeHead(302, { Location: `http://127.0.0.1:${PORTA_G}/echo` }); return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(resultado));
  });
}).listen(PORTA_G);

const env = { ...process.env, CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: saida, SEM_ATUALIZAR: '1', PORTA: String(PORTA),
  LOTUS_TESTE_GOOGLE_PLANILHAS: '1' };
delete env.LOTUS_LOGIN; delete env.HOST;
const app = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; app.stdout.on('data', (d) => { log += d; }); app.stderr.on('data', (d) => { log += d; });

function pedir(metodo, caminho, { corpo, binario, nome } = {}) {
  return new Promise((ok, erro) => {
    const headers = {};
    let envio = '';
    if (binario) { envio = binario; headers['X-Nome-Arquivo'] = encodeURIComponent(nome); headers['Content-Length'] = binario.length; }
    else if (corpo) { envio = JSON.stringify(corpo); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(envio); }
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo, headers }, (res) => {
      let s = ''; res.on('data', (c) => { s += c; }); res.on('end', () => { try { ok({ status: res.statusCode, j: JSON.parse(s) }); } catch { ok({ status: res.statusCode, j: s }); } });
    });
    r.on('error', erro); r.end(envio);
  });
}
const enviar = (op, d, arq) => pedir('POST', `/api/financeiro/enviar?arquivo=ana-e-bia.txt&op=${op}&dados=${encodeURIComponent(JSON.stringify(d))}`,
  arq ? { binario: Buffer.from('comprovante de teste'), nome: arq } : { binario: Buffer.alloc(0), nome: '' });

async function principal() {
  for (let i = 0; i < 50; i++) { try { await pedir('GET', '/saude'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  let n = 0; const ok = (m) => { n++; console.log(`  ✓ ${m}`); };

  const it = await enviar('item', { fornecedor: { nome: 'Buffet Teste' }, item: { nome: 'Buffet Teste', valor_contratado: '10000', entrada: { valor: '3000', data: '' }, parcelas: { quantidade: '2', valor: '3500' } } });
  assert.strictEqual(it.status, 200, JSON.stringify(it.j));
  ok('fornecedor cadastrado e enviado para a planilha');

  const pg = await enviar('pagamento', { id: it.j.item_id, tipo: 'entrada', valor: '3000', data: '2026-11-08', forma: 'PIX' }, 'comprovante.pdf');
  assert.strictEqual(pg.status, 200, JSON.stringify(pg.j));
  assert.ok(pg.j.planilha_google_escrita && pg.j.planilha_google_escrita.ok, 'resposta traz a planilha atualizada');
  ok('pagamento com comprovante: planilha do Google atualizada na hora');

  const ultimo = recebidos[recebidos.length - 1];
  assert.strictEqual(ultimo.numero, 'AS-0999');
  assert.ok(ultimo.gerado_em, 'manda o gerado_em (o gatilho de 10 min não repete)');
  const linha = ultimo.linhas.find((l) => l.Fornecedor === 'Buffet Teste');
  assert.strictEqual(linha['Data do Pagamento da Entrada'], '08/11/2026', 'data dd/mm/aaaa');
  assert.strictEqual(Number(linha['Valor da Entrada']), 3000);
  ok('linha enviada com o fornecedor, a entrada e a data 08/11/2026');

  const tela = await pedir('GET', '/api/financeiro?arquivo=ana-e-bia.txt');
  assert.ok(tela.j.planilha_google_escrita.ok && tela.j.google_direto && tela.j.planilha_google);
  ok('tela do financeiro mostra "Planilha do Google atualizada"');

  conf({ url: `http://127.0.0.1:${PORTA_G}/macros/s/teste/exec`, chave: 'chave-errada' });
  const pg2 = await enviar('pagamento', { id: it.j.item_id, tipo: 'parcela', numero: '1', valor: '3500', data: '2026-11-09' }, 'comp2.pdf');
  assert.strictEqual(pg2.status, 200);
  assert.strictEqual(pg2.j.planilha_google_escrita.erro, 'chave inválida');
  assert.strictEqual(pg2.j.totais.pago, 6500, 'lançamento salvo mesmo com a planilha recusando');
  ok('chave recusada pelo Google: lançamento salvo e erro mostrado');

  conf({ url: 'http://127.0.0.1:1/macros/s/teste/exec', chave: 'chave-certa' });
  const pg3 = await enviar('pagamento', { id: it.j.item_id, tipo: 'parcela', numero: '2', valor: '3500', data: '2026-11-09' }, 'comp3.pdf');
  assert.strictEqual(pg3.status, 200);
  assert.strictEqual(pg3.j.planilha_google_escrita.erro, 'sem conexão com o Google');
  assert.ok(fs.existsSync(path.join(dados, 'financeiro-google', 'AS-0999.json')), 'arquivo do gatilho de 10 min continua sendo gravado');
  ok('sem internet: lançamento salvo, gatilho de 10 min fica de reserva');

  conf({ url: `http://127.0.0.1:${PORTA_G}/macros/s/teste/exec`, chave: 'chave-certa' });
  const at = await pedir('POST', '/api/financeiro/escrever-planilha', { corpo: { arquivo: 'ana-e-bia.txt' } });
  assert.strictEqual(at.status, 200, JSON.stringify(at.j));
  assert.ok(at.j.ok && at.j.google);
  ok('"Atualizar a planilha" reenvia para o Google');

  fs.unlinkSync(path.join(dados, 'integracoes', 'google-planilhas.json'));
  const pg4 = await enviar('remover-pagamento', { id: it.j.item_id, pagamento_id: (await pedir('GET', '/api/financeiro?arquivo=ana-e-bia.txt')).j.itens[0].pagamentos.slice(-1)[0].id });
  assert.strictEqual(pg4.status, 200);
  assert.ok(pg4.j.planilha_google_escrita.pendente, 'sem conexão configurada: fica para o gatilho de 10 min');
  ok('sem conexão direta configurada: continua como antes (até 10 min)');

  console.log(`\n✓ planilha do Google: ${n} verificações passaram`);
}

principal().then(() => { app.kill(); google.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0); })
  .catch((e) => { console.error('✗', e.message); console.error(log.slice(-1500)); app.kill(); google.close(); process.exit(1); });
