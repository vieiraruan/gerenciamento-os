#!/usr/bin/env node
/**
 * Teste da área do casal (/meu-evento) no Lotus online: o casal acompanha os fornecedores, marca as atividades
 * dos preparativos e envia pagamentos com comprovante — sem editar nem apagar, e só do próprio casamento.
 *   node scripts/testar-area-casal.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { assinar } = require('../src/auth');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-casal-'));
const dados = path.join(tmp, 'dados'); fs.mkdirSync(dados, { recursive: true });
const ano = new Date().getFullYear() + 1;
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), `evento_nomes: Ana e Bia\nevento_data: 10/10/${ano}\nnumero_os: AS-0999\nvalor_total: 5000\ncliente: ana-cliente.txt\n`);
fs.mkdirSync(path.join(dados, 'clientes'), { recursive: true });
fs.writeFileSync(path.join(dados, 'clientes', 'ana-cliente.txt'), 'nome: Ana Souza\nemail: Ana@Hotmail.com\ncpf_cnpj: 123.456.789-09\n');
fs.writeFileSync(path.join(dados, 'caio-e-davi.txt'), `evento_nomes: Caio e Davi\nevento_data: 12/12/${ano}\nnumero_os: AS-0998\nvalor_total: 5000\n`);
fs.writeFileSync(path.join(dados, 'usuarios.json'), JSON.stringify({ usuarios: [
  { email: 'casal@exemplo.com', nome: 'Ana', papel: 'casal', casal: 'ana-e-bia.txt', versao: 1 },
] }));
const SEGREDO = 'x'.repeat(40); const PORTA = 3396;
const env = { ...process.env, LOTUS_LOGIN: '1', LOTUS_URL: `http://localhost:${PORTA}`, GOOGLE_CLIENT_ID: 'cliente-teste', GOOGLE_CLIENT_SECRET: 'segredo-teste',
  LOTUS_SESSAO_SEGREDO: SEGREDO, LOTUS_ADMINS: 'tayna@exemplo.com', CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: path.join(tmp, 'saida'),
  SEM_ATUALIZAR: '1', PORTA: String(PORTA), HOST: '127.0.0.1' };
const app = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; app.stdout.on('data', (d) => { log += d; }); app.stderr.on('data', (d) => { log += d; });

const sessao = (email) => `lotus_sessao=${encodeURIComponent(assinar(SEGREDO, { email, nome: 'Teste', foto: '', v: 1, exp: Math.floor(Date.now() / 1000) + 600 }))}`;
const ADMIN = sessao('tayna@exemplo.com'); const CASAL = sessao('casal@exemplo.com');

function pedir(metodo, caminho, { cookie, corpo, binario, nome, form } = {}) {
  return new Promise((ok, erro) => {
    const headers = { Cookie: cookie || '' };
    let envio = '';
    if (form) { envio = new URLSearchParams(form).toString(); headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['Content-Length'] = Buffer.byteLength(envio); }
    else if (binario) { envio = binario; headers['X-Nome-Arquivo'] = encodeURIComponent(nome || ''); headers['Content-Length'] = binario.length; }
    else if (corpo) { envio = JSON.stringify(corpo); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(envio); }
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo, headers }, (res) => {
      let s = ''; res.on('data', (c) => { s += c; }); res.on('end', () => { const h = res.headers; try { ok({ status: res.statusCode, j: JSON.parse(s), h }); } catch { ok({ status: res.statusCode, j: s, h }); } });
    });
    r.on('error', erro); r.end(envio);
  });
}
const pagamento = (cookie, d, comArquivo = true, extra = '') => pedir('POST', `/api/meu-evento/pagamento?dados=${encodeURIComponent(JSON.stringify(d))}${extra}`,
  { cookie, binario: comArquivo ? Buffer.from('foto do comprovante') : Buffer.alloc(0), nome: 'comprovante.jpg' });

async function principal() {
  for (let i = 0; i < 60; i++) { try { await pedir('GET', '/saude'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  let n = 0; const ok = (m) => { n++; console.log(`  ✓ ${m}`); };

  // a Tayná cadastra um fornecedor do casal
  const it = await pedir('POST', `/api/financeiro/enviar?arquivo=ana-e-bia.txt&op=item&dados=${encodeURIComponent(JSON.stringify({
    fornecedor: { nome: 'Buffet Sabores', telefone: '+55 81 99999-0000', pagamento: { pix: 'buffet@pix.com' } },
    item: { nome: 'Buffet Sabores', descricao: 'Jantar para 180 pessoas', valor_contratado: '10000', entrada: { valor: '3000', data: '' }, parcelas: { quantidade: '2', valor: '3500' } },
  }))}`, { cookie: ADMIN, binario: Buffer.alloc(0) });
  assert.strictEqual(it.status, 200, JSON.stringify(it.j));
  const idItem = it.j.item_id;

  let me = (await pedir('GET', '/api/meu-evento?arquivo=caio-e-davi.txt', { cookie: CASAL })).j;
  assert.match(me.evento.nomes, /Ana e Bia/, 'casal vê só o próprio casamento (ignora ?arquivo=)');
  const f = me.fornecedores[0];
  assert.strictEqual(f.nome, 'Buffet Sabores'); assert.strictEqual(f.contratado, 10000); assert.strictEqual(f.saldo, 10000);
  assert.match(f.pagar_com, /buffet@pix\.com/); assert.match(f.contato.telefone, /99999-0000/);
  assert.ok(me.cronograma && me.cronograma.secoes.length, 'cronograma do casal AS');
  ok('casal vê fornecedores (valores, contato, dados para pagamento) e o cronograma');

  // atividades dos preparativos
  const tarefa = me.cronograma.secoes.flatMap((s) => s.itens).find((i) => !i.concluida);
  let r = await pedir('POST', '/api/meu-evento/tarefa', { cookie: CASAL, corpo: { chave: tarefa.chave, status: 'FINALIZADO', arquivo: 'caio-e-davi.txt' } });
  assert.strictEqual(r.status, 200, JSON.stringify(r.j));
  const feita = r.j.cronograma.concluidas.find((i) => i.chave === tarefa.chave);
  assert.ok(feita && feita.pelo_casal, 'atividade concluída e marcada como feita pelo casal');
  r = await pedir('POST', '/api/meu-evento/tarefa', { cookie: CASAL, corpo: { chave: tarefa.chave, obs: 'Fechamos com o buffet' } });
  assert.strictEqual(r.j.cronograma.concluidas.find((i) => i.chave === tarefa.chave).obs, 'Fechamos com o buffet');
  assert.strictEqual((await pedir('POST', '/api/meu-evento/tarefa', { cookie: CASAL, corpo: { chave: tarefa.chave, status: 'QUALQUER' } })).status, 400);
  const outro = (await pedir('GET', '/api/cronograma/casal?arquivo=caio-e-davi.txt', { cookie: ADMIN })).j;
  assert.ok(!outro.concluidas.some((i) => i.chave === tarefa.chave && i.editado_por === 'casal'), 'outro casal não foi alterado');
  const daTayna = (await pedir('GET', '/api/cronograma/casal?arquivo=ana-e-bia.txt', { cookie: ADMIN })).j;
  assert.ok(daTayna.concluidas.some((i) => i.chave === tarefa.chave && i.editado_por === 'casal'), 'Tayná vê que foi o casal');
  ok('casal atualiza a situação e a observação das atividades (só do próprio casamento; Tayná vê "casal")');

  // pagamentos
  assert.strictEqual((await pagamento(CASAL, { id: idItem, tipo: 'entrada', valor: '3000', data: '2026-11-20' }, false)).status, 400, 'sem comprovante');
  r = await pagamento(CASAL, { id: idItem, tipo: 'entrada', valor: '3.000,00', data: '2026-11-20', forma: 'PIX', sem_comprovante: true });
  assert.strictEqual(r.status, 200, JSON.stringify(r.j));
  const fp = r.j.fornecedores[0];
  assert.strictEqual(fp.pago, 3000); assert.strictEqual(fp.saldo, 7000);
  assert.ok(fp.pagamentos[0].pelo_casal && fp.pagamentos[0].comprovante, 'pagamento do casal com comprovante');
  assert.strictEqual((await pagamento(CASAL, { id: 'nao-existe', valor: '10', data: '2026-11-20' })).status, 400);
  ok('casal envia pagamento com comprovante (obrigatório) e o saldo atualiza');

  // sem editar nem apagar, e nada das telas da Tayná
  const pagId = (await pedir('GET', '/api/financeiro?arquivo=ana-e-bia.txt', { cookie: ADMIN })).j;
  const item = (pagId.itens || pagId.financeiro?.itens || []).find((i) => i.id === idItem) || {};
  const pg = (item.pagamentos || [])[0] || {};
  assert.ok(pg.lancado_por === 'casal@exemplo.com', 'Tayná vê quem lançou');
  for (const [m, p] of [['POST', `/api/financeiro/enviar?arquivo=ana-e-bia.txt&op=remover-pagamento&dados=${encodeURIComponent(JSON.stringify({ id: idItem, pagamento_id: pg.id }))}`],
    ['POST', `/api/financeiro/enviar?arquivo=ana-e-bia.txt&op=editar&dados=${encodeURIComponent(JSON.stringify({ id: idItem, valor_contratado: '1' }))}`],
    ['GET', '/api/financeiro?arquivo=ana-e-bia.txt'], ['POST', '/api/cronograma/tarefa'], ['GET', '/financeiro']]) {
    const x = m === 'GET' ? await pedir('GET', p, { cookie: CASAL }) : await pedir('POST', p, { cookie: CASAL, binario: Buffer.alloc(1) });
    assert.strictEqual(x.status, 403, `${m} ${p}`);
  }
  ok('casal não edita nem apaga pagamentos e não acessa o financeiro da Tayná');

  // ---- acesso do casal com e-mail do contrato + senha (1º acesso com o CPF) ----
  const ck = (r) => (r.h['set-cookie'] || []).map((c) => c.split(';')[0]).filter((c) => !/=$/.test(c)).join('; ');
  const loc = (r) => r.h.location || '';
  r = await pedir('GET', '/meu-evento');
  assert.match(loc(r), /^\/entrar\?voltar=/, 'sem sessão: vai para a tela de entrar (com a área do casal)');
  r = await pedir('GET', '/entrar'); assert.match(r.j, /Área do casal/); assert.match(r.j, /Entrar com Google/);
  r = await pedir('POST', '/auth/senha', { form: { email: 'ana@hotmail.com', senha: '00000000000' } });
  assert.match(loc(r), /^\/entrar\?erro=/, 'CPF errado');
  r = await pedir('POST', '/auth/senha', { form: { email: 'ANA@hotmail.com', senha: '12345678909' } });
  assert.strictEqual(loc(r), '/auth/nova-senha', 'primeiro acesso com o CPF (só números)');
  const nova = ck(r);
  assert.match((await pedir('GET', '/auth/nova-senha', { cookie: nova })).j, /Criem uma senha/);
  assert.match(loc(await pedir('POST', '/auth/nova-senha', { cookie: nova, form: { senha: 'curta', confirmar: 'curta' } })), /erro=/);
  assert.match(loc(await pedir('POST', '/auth/nova-senha', { cookie: nova, form: { senha: '12345678909', confirmar: '12345678909' } })), /erro=/, 'senha nova não pode ser o CPF');
  r = await pedir('POST', '/auth/nova-senha', { cookie: nova, form: { senha: 'nosso-casamento', confirmar: 'nosso-casamento' } });
  assert.strictEqual(loc(r), '/meu-evento');
  const sessaoAna = ck(r);
  me = (await pedir('GET', '/api/meu-evento', { cookie: sessaoAna })).j;
  assert.match(me.evento.nomes, /Ana e Bia/);
  ok('1º acesso: e-mail do contrato + CPF → cria senha própria (mín. 8, diferente do CPF) e entra na área do casal');

  assert.match(loc(await pedir('POST', '/auth/senha', { form: { email: 'ana@hotmail.com', senha: '123.456.789-09' } })), /erro=/, 'CPF deixa de valer');
  r = await pedir('POST', '/auth/senha', { form: { email: 'ana@hotmail.com', senha: 'nosso-casamento' } });
  assert.strictEqual(loc(r), '/meu-evento');
  assert.match(loc(await pedir('POST', '/auth/senha', { form: { email: 'tayna@exemplo.com', senha: 'qualquer-coisa' } })), /erro=/, 'equipe só com Google');
  const us = (await pedir('GET', '/api/usuarios', { cookie: ADMIN })).j.usuarios.find((u) => u.email === 'ana@hotmail.com');
  assert.ok(us && us.papel === 'casal' && us.casal === 'ana-e-bia.txt' && us.tem_senha, 'casal aparece nos Usuários com senha criada');
  ok('depois disso só a senha nova vale; equipe não entra por senha; casal aparece em Usuários');

  for (let i = 0; i < 5; i++) await pedir('POST', '/auth/senha', { form: { email: 'ana@hotmail.com', senha: `errada${i}` } });
  assert.match(decodeURIComponent(loc(await pedir('POST', '/auth/senha', { form: { email: 'ana@hotmail.com', senha: 'nosso-casamento' } }))), /Muitas tentativas/);
  ok('5 senhas erradas bloqueiam por 15 minutos');

  r = await pedir('POST', '/api/usuarios', { cookie: ADMIN, corpo: { acao: 'zerar-senha', email: 'ana@hotmail.com', motivo: 'Casal esqueceu a senha' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await pedir('GET', '/api/meu-evento', { cookie: sessaoAna })).status, 401, 'zerar a senha encerra a sessão');
  ok('Tayná zera a senha (o próximo acesso volta a ser com o CPF) e a sessão aberta cai');

  console.log(`\n✓ área do casal: ${n} verificações passaram`);
}

principal().catch((e) => { console.error('\n✗ falhou:', e.message, '\n', log.slice(-1500)); process.exitCode = 1; })
  .finally(() => { app.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });
