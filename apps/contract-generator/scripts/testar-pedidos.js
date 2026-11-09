#!/usr/bin/env node
/**
 * Teste dos pedidos do site (sem internet): sobe o Lotus e um "Apps Script" falso (e-mail, horários e agenda) e
 * confere o fluxo: pedido → PDF por e-mail ao casal → alerta à Tayná → pedido de horário → confirmação na agenda.
 *   node scripts/testar-pedidos.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-pedidos-'));
const dados = path.join(tmp, 'dados');
fs.mkdirSync(path.join(dados, 'integracoes'), { recursive: true });
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), 'evento_nomes: Ana e Bia\nevento_data: 10/10/2027\nnumero_os: AS-0999\nvalor_total: 5000\n');
fs.writeFileSync(path.join(dados, 'empresa.json'), JSON.stringify({ nome_fantasia: 'Teste', email: 'tayna@exemplo.com', cnpj: '00.000.000/0001-00' }));
const PORTA = 3395; const PORTA_G = 3394;
fs.writeFileSync(path.join(dados, 'integracoes', 'google-planilhas.json'), JSON.stringify({ url: `http://127.0.0.1:${PORTA_G}/macros/s/t/exec`, chave: 'k' }));

const H1 = '2026-11-12T22:00:00.000Z'; const H2 = '2026-11-13T13:00:00.000Z';
const recebidos = []; let resposta = null;
const google = http.createServer((req, res) => {
  let corpo = ''; req.on('data', (c) => { corpo += c; });
  req.on('end', () => {
    if (req.method === 'POST') {
      const p = JSON.parse(corpo); recebidos.push(p);
      resposta = p.chave !== 'k' ? { erro: 'chave inválida' }
        : p.acao === 'horarios' ? { ok: true, horarios: [H1, H2] }
          : p.acao === 'agendar' ? { ok: true, evento: 'ev123' } : { ok: true };
      res.writeHead(302, { Location: `http://127.0.0.1:${PORTA_G}/r` }); return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(resposta));
  });
}).listen(PORTA_G);

const env = { ...process.env, CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: path.join(tmp, 'saida'), SEM_ATUALIZAR: '1', PORTA: String(PORTA),
  LOTUS_TESTE_GOOGLE_PLANILHAS: '1', LOTUS_URL: 'https://lotus.exemplo.com.br' };
delete env.LOTUS_LOGIN; delete env.HOST;
const app = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; app.stdout.on('data', (d) => { log += d; }); app.stderr.on('data', (d) => { log += d; });

function pedir(metodo, caminho, corpo) {
  return new Promise((ok, erro) => {
    const envio = corpo ? JSON.stringify(corpo) : '';
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(envio) } : {} }, (res) => {
      const partes = []; res.on('data', (c) => partes.push(c));
      res.on('end', () => { const b = Buffer.concat(partes); let j = null; try { j = JSON.parse(b); } catch { /* binário */ } ok({ status: res.statusCode, j, b, tipo: res.headers['content-type'] }); });
    });
    r.on('error', erro); r.end(envio);
  });
}
const esperar = async (cond, ms = 8000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 100)); } };
const FORM = { nome: 'Marina e Rafael', email: 'marina@exemplo.com', whatsapp: '(11) 98888-7777', data: '2027-10-10', convidados: '180',
  cidade: 'Porto de Galinhas', servico: 'so_vou_pra_casar', fora: true, mensagem: 'Pé na areia', consentimento: true };

async function principal() {
  for (let i = 0; i < 50; i++) { try { await pedir('GET', '/saude'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  let n = 0; const ok = (m) => { n++; console.log(`  ✓ ${m}`); };

  const sv = await pedir('GET', '/api/publico/servicos');
  assert.ok(sv.j.servicos.some((s) => s.id === 'nao_sei') && !JSON.stringify(sv.j).includes('preco'));
  ok('site lista os serviços, sem preços');

  const h = await pedir('GET', '/api/publico/horarios');
  assert.strictEqual(h.j.horarios.length, 2); assert.ok(h.j.horarios[0].rotulo.includes('19:00'));
  ok('horários livres da agenda da Tayná (fuso do Recife)');

  const ruim = await pedir('POST', '/api/publico/orcamento', { ...FORM, email: 'sem-arroba' });
  assert.strictEqual(ruim.status, 400); assert.match(ruim.j.erro, /e-mail/);
  const semOk = await pedir('POST', '/api/publico/orcamento', { ...FORM, consentimento: false });
  assert.strictEqual(semOk.status, 400);
  ok('formulário inválido ou sem autorização é recusado');

  const robo = await pedir('POST', '/api/publico/orcamento', { ...FORM, site: 'http://spam' });
  assert.strictEqual(robo.status, 200);
  assert.ok(!fs.existsSync(path.join(dados, 'pedidos')), 'robô não grava pedido');
  ok('robô (campo escondido) não grava nada');

  const p = await pedir('POST', '/api/publico/orcamento', FORM);
  assert.strictEqual(p.status, 200, JSON.stringify(p.j));
  assert.ok(p.j.id && p.j.token && p.j.whatsapp.startsWith('https://wa.me/5581997801345?text='));
  assert.ok(!/R\$|total|preco|14\.2/.test(JSON.stringify(p.j)), 'resposta ao site sem valores');
  ok('pedido recebido: resposta ao site sem valores, com link do WhatsApp da Tayná');

  await esperar(() => recebidos.filter((r) => r.acao === 'email').length >= 2);
  const casal = recebidos.find((r) => r.acao === 'email' && r.para === 'marina@exemplo.com');
  assert.ok(casal.anexos[0].nome.endsWith('.pdf') && Buffer.from(casal.anexos[0].base64, 'base64').subarray(0, 5).toString() === '%PDF-');
  assert.ok(!/14\.20|R\$/.test(casal.html), 'valores só no PDF');
  const alerta = recebidos.find((r) => r.acao === 'email' && r.para === 'tayna@exemplo.com');
  assert.match(alerta.assunto, /Novo pedido/); assert.ok(alerta.html.includes('https://lotus.exemplo.com.br/pedidos?id='));
  ok('e-mail ao casal com o PDF (valores só no PDF) e alerta à Tayná com link do Lotus');

  await esperar(() => { try { return (JSON.parse(fs.readFileSync(path.join(dados, 'pedidos', `${p.j.id}.json`))).emails.alerta || {}).ok; } catch { return false; } });
  const lista = await pedir('GET', '/api/pedidos');
  const ped = lista.j.pedidos.find((x) => x.id === p.j.id);
  assert.ok(ped.emails.casal.ok && ped.total === 14202.5 && ped.data_ocupada === true && lista.j.novos === 1);
  ok('Lotus: pedido com orçamento R$ 14.202,50, e-mail enviado e aviso de data com contrato');

  const pdf = await pedir('GET', `/api/pedidos/pdf?id=${p.j.id}`);
  assert.strictEqual(pdf.tipo, 'application/pdf'); assert.strictEqual(pdf.b.subarray(0, 5).toString(), '%PDF-');
  ok('PDF do orçamento abre no Lotus');

  assert.strictEqual((await pedir('POST', '/api/publico/agenda', { id: p.j.id, token: 'x'.repeat(36), inicio: H1 })).status, 400);
  assert.strictEqual((await pedir('POST', '/api/publico/agenda', { id: p.j.id, token: p.j.token, inicio: '2026-11-20T10:00:00.000Z' })).status, 400);
  const ag = await pedir('POST', '/api/publico/agenda', { id: p.j.id, token: p.j.token, inicio: H1 });
  assert.strictEqual(ag.status, 200, JSON.stringify(ag.j));
  ok('pedido de horário: chave errada e horário fora da lista recusados; horário livre aceito');

  await esperar(() => recebidos.some((r) => r.acao === 'email' && /Solicitação de agenda/.test(r.assunto || '')));
  ok('alerta de solicitação de agenda enviado à Tayná');

  const conf = await pedir('POST', '/api/pedidos/acao', { id: p.j.id, acao: 'confirmar' });
  assert.strictEqual(conf.status, 200, JSON.stringify(conf.j));
  const evento = recebidos.find((r) => r.acao === 'agendar');
  assert.strictEqual(evento.inicio, H1); assert.strictEqual(evento.convidado, 'marina@exemplo.com');
  const depois = (await pedir('GET', '/api/pedidos')).j.pedidos.find((x) => x.id === p.j.id);
  assert.strictEqual(depois.agenda.estado, 'confirmada'); assert.strictEqual(depois.estado, 'em_conversa');
  ok('Tayná confirma: evento no Google Agenda com convite ao casal');

  for (let i = 0; i < 5; i++) await pedir('POST', '/api/publico/orcamento', { ...FORM, email: `c${i}@exemplo.com` });
  const demais = await pedir('POST', '/api/publico/orcamento', { ...FORM, email: 'c9@exemplo.com' });
  assert.strictEqual(demais.status, 400); assert.match(demais.j.erro, /Muitos pedidos/);
  ok('limite de pedidos por endereço');

  console.log(`\n✓ pedidos do site: ${n} verificações passaram`);
}

principal().then(() => { app.kill(); google.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0); })
  .catch((e) => { console.error('✗', e.message); console.error(log.slice(-2000)); app.kill(); google.close(); process.exit(1); });
