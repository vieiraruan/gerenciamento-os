#!/usr/bin/env node
/**
 * Teste dos idiomas da parte que o casal vê (pt, en, es, fr, de): tela de entrar, área do casal (atividades,
 * etapas e alertas), orçamento do site (validação, itens, e-mail, PDF e horários) e o site estático.
 *   node scripts/testar-idiomas.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { assinar } = require('../src/auth');
const idiomas = require('../src/idiomas');
const pedidos = require('../src/pedidos');

let n = 0; const ok = (m) => { n++; console.log(`  ✓ ${m}`); };
const RAIZ = path.join(__dirname, '..');

function unidade() {
  // traduções das atividades cobrem os dois modelos de cronograma
  const trad = JSON.parse(fs.readFileSync(path.join(RAIZ, 'templates', 'traducoes', 'cronograma.json'), 'utf8'));
  for (const f of ['padrao', 'destination']) {
    const m = JSON.parse(fs.readFileSync(path.join(RAIZ, 'templates', 'checklists', `${f}.json`), 'utf8'));
    for (const s of m.secoes) for (const it of s.itens) {
      const t = trad[it.texto.trim()];
      assert.ok(t && ['en', 'es', 'fr', 'de'].every((l) => t[l] && t[l].trim()), `sem tradução: ${it.texto}`);
    }
  }
  assert.strictEqual(idiomas.tarefa('Contratar DJ', 'de'), 'DJ buchen');
  assert.strictEqual(idiomas.tarefa('  contratar   dj ', 'en'), 'Book the DJ', 'acha mesmo com espaços/maiúsculas diferentes');
  assert.strictEqual(idiomas.tarefa('Atividade criada pela Tayná', 'fr'), 'Atividade criada pela Tayná', 'sem tradução: fica em português');
  ok('as 125 atividades dos modelos têm tradução nos 4 idiomas; texto próprio fica em português');

  // dicionários do servidor: todas as chaves do português existem nos outros idiomas
  const src = fs.readFileSync(path.join(RAIZ, 'src', 'idiomas.js'), 'utf8');
  for (const l of ['en', 'es', 'fr', 'de']) {
    const faltam = [...src.matchAll(/'([a-z]+\.[a-z_]+)':/g)].map((m) => m[1]).filter((k, i, a) => a.indexOf(k) === i && idiomas.t(l, k) === idiomas.t('pt', k) && !/^(pdf\.local|entrar\.botao|entrar\.titulo|idioma|orc\.dest)$/.test(k));
    assert.ok(faltam.length < 4, `${l}: textos iguais ao português: ${faltam.join(', ')}`);
  }
  // dicionários da área do casal (navegador)
  const cli = fs.readFileSync(path.join(RAIZ, 'app', 'idioma.js'), 'utf8');
  const D = new Function(`return (${cli.match(/var D = (\{[\s\S]*?\n  \});/)[1]});`)();
  for (const l of ['en', 'es', 'fr', 'de']) {
    const faltam = Object.keys(D.pt).filter((k) => D[l][k] === undefined);
    assert.deepStrictEqual(faltam, [], `área do casal (${l}) sem: ${faltam.join(', ')}`);
  }
  ok('dicionários completos: servidor (entrar, e-mail, PDF) e área do casal (todas as chaves nos 5 idiomas)');

  // site estático: todas as marcações data-i18n têm texto nos 4 idiomas
  const site = path.join(RAIZ, '..', '..', 'site');
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
  const chaves = new Set([...html.matchAll(/data-i18n(?:-html|-ph|-alt|-aria)?="([^"]+)"/g)].map((m) => m[1]));
  const js = fs.readFileSync(path.join(site, 'idioma.js'), 'utf8');
  const S = new Function(`return (${js.match(/var D = (\{[\s\S]*?\n  \});/)[1]});`)();
  for (const l of ['en', 'es', 'fr', 'de']) {
    const faltam = [...chaves].filter((k) => S[l][k] === undefined);
    assert.deepStrictEqual(faltam, [], `site (${l}) sem: ${faltam.join(', ')}`);
  }
  assert.ok(chaves.size > 100);
  ok(`site: ${chaves.size} textos marcados, todos traduzidos em en/es/fr/de`);

  // idioma pelo país onde a pessoa está (fuso horário do aparelho)
  const sitelocal = fs.readFileSync(path.join(RAIZ, '..', '..', 'site', 'local.js'), 'utf8');
  assert.strictEqual(sitelocal, fs.readFileSync(path.join(RAIZ, 'app', 'local.js'), 'utf8'), 'site/local.js igual a app/local.js');
  const L = require('../app/local.js'); const SUP = idiomas.IDIOMAS;
  const casos = [
    ['America/Recife', ['en-US'], 'pt'], ['America/Sao_Paulo', ['de-DE'], 'pt'], ['Brazil/East', [], 'pt'],
    ['Europe/Berlin', ['en-GB'], 'de'], ['Europe/Vienna', ['pt-BR'], 'de'], ['Europe/Paris', ['de'], 'fr'], ['Europe/Madrid', ['en'], 'es'],
    ['Europe/Lisbon', ['en'], 'pt'], ['America/Argentina/Buenos_Aires', ['en'], 'es'], ['America/Buenos_Aires', ['en'], 'es'], ['America/Mexico_City', ['en-US'], 'es'],
    ['Europe/Zurich', ['fr-CH'], 'fr'], ['Europe/Zurich', ['it-CH'], 'de'], ['America/Toronto', ['fr-CA'], 'fr'], ['America/Toronto', ['es'], 'en'],
    ['America/New_York', ['es-US'], 'es'], ['America/New_York', ['de'], 'en'], ['Europe/London', ['fr'], 'fr'], ['Europe/Rome', ['it-IT'], 'en'],
    ['Asia/Tokyo', ['ja'], 'en'], ['UTC', ['de-DE'], 'de'], ['', ['it'], 'pt'], ['', [], 'pt'],
  ];
  for (const [tz, nav, esperado] of casos) assert.strictEqual(L.escolher(tz, nav, SUP).idioma, esperado, `${tz} + ${nav}`);
  ok(`idioma pelo país (fuso do aparelho): ${casos.length} casos — Brasil em português mesmo com navegador em inglês, Alemanha em alemão, Suíça/Canadá pelo navegador, outros países em inglês`);

  // orçamento do site em alemão
  assert.throws(() => pedidos.validar({ nome: 'Anna und Peter', email: 'x', servico: 'essencial', consentimento: true, idioma: 'de' }), /gültige E-Mail/);
  const v = pedidos.validar({ nome: 'Anna und Peter', email: 'a@b.de', servico: 'essencial', convidados: 220, fora: true, consentimento: true, idioma: 'de', data: '2027-09-18' });
  assert.strictEqual(v.idioma, 'de');
  const o = pedidos.calcular(v.servico, v.convidados, v.fora, 'de');
  assert.match(o.itens[0].texto, /O Essencial \(bis 150 Gäste\)/); assert.match(o.itens[1].texto, /2 zusätzliche Fachkräfte/); assert.match(o.itens[2].texto, /Metropolregion/);
  assert.match(o.servico.descricao, /komplette Hochzeitsplanung/);
  const p = { ...v, id: '20270101-abcdef', criado_em: new Date().toISOString(), orcamento: o };
  const e = pedidos.emailCasal(p);
  assert.match(e.assunto, /^Euer vorläufiges Angebot — O Essencial$/); assert.match(e.html, /Hallo Anna und Peter!/); assert.match(e.html, /18\. September 2027/);
  assert.match(decodeURIComponent(e.html), /Hallo Tayná! Ich bin Anna und Peter/);
  assert.match(pedidos.emailAlerta(p, 'novo', 'https://x').html, /Idioma do casal.*Deutsch/, 'Tayná sabe o idioma do casal');
  assert.match(pedidos.rotuloHorario('2027-01-05T13:00:00.000Z', 'en'), /Tue.*5 Jan.*10:00 \(Recife\)/);
  assert.strictEqual(pedidos.servicosDoSite('es').slice(-1)[0].nome, 'Todavía no lo sé');
  return pedidos.gerarPdf(p, {}).then((pdf) => {
    assert.ok(pdf.length > 3000 && pdf.slice(0, 4).toString() === '%PDF');
    ok('orçamento em alemão: validação, itens, descrição, e-mail, link do WhatsApp, PDF e horários; alerta da Tayná diz o idioma');
  });
}

// ---------------- servidor ----------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-idiomas-'));
const dados = path.join(tmp, 'dados'); fs.mkdirSync(path.join(dados, 'clientes'), { recursive: true });
const pad = (x) => String(x).padStart(2, '0');
const hoje = new Date(); const em = (m) => new Date(hoje.getFullYear(), hoje.getMonth() + m, 10);
const br = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), `evento_nomes: Ana e Bia\nevento_data: ${br(em(6))}\ndata_assinatura: ${br(em(-8))}\nnumero_os: AS-0999\nvalor_total: 6000\ncliente: ana.txt\n`);
fs.writeFileSync(path.join(dados, 'clientes', 'ana.txt'), 'nome: Ana\nemail: ana@exemplo.com\ncpf_cnpj: 123.456.789-09\n');
fs.writeFileSync(path.join(dados, 'usuarios.json'), JSON.stringify({ usuarios: [{ email: 'ana@exemplo.com', nome: 'Ana', papel: 'casal', casal: 'ana-e-bia.txt', versao: 1 }] }));
const SEGREDO = 'w'.repeat(40); const PORTA = 3401;
const env = { ...process.env, LOTUS_LOGIN: '1', LOTUS_URL: `http://localhost:${PORTA}`, GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's',
  LOTUS_SESSAO_SEGREDO: SEGREDO, LOTUS_ADMINS: 'tayna@exemplo.com', CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: path.join(tmp, 'saida'),
  SEM_ATUALIZAR: '1', PORTA: String(PORTA), HOST: '127.0.0.1' };
const CASAL = `lotus_sessao=${encodeURIComponent(assinar(SEGREDO, { email: 'ana@exemplo.com', nome: 'Ana', foto: '', v: 1, exp: Math.floor(Date.now() / 1000) + 600 }))}`;
function pedir(metodo, caminho, { cookie, headers: extra, form } = {}) {
  return new Promise((res, rej) => {
    const headers = { Cookie: cookie || '', ...(extra || {}) }; let envio = '';
    if (form) { envio = new URLSearchParams(form).toString(); headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['Content-Length'] = Buffer.byteLength(envio); }
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo, headers }, (x) => {
      let s = ''; x.on('data', (c) => { s += c; }); x.on('end', () => { let j; try { j = JSON.parse(s); } catch { j = s; } res({ status: x.statusCode, j, h: x.headers }); });
    });
    r.on('error', rej); r.end(envio);
  });
}

async function servidor() {
  const app = spawn(process.execPath, [path.join(RAIZ, 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; app.stdout.on('data', (d) => { log += d; }); app.stderr.on('data', (d) => { log += d; });
  try {
    for (let i = 0; i < 60; i++) { try { await pedir('GET', '/saude'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    let r = await pedir('GET', '/entrar?idioma=de');
    assert.match(r.j, /Bereich für das Brautpaar/); assert.match(r.j, /lang="de-DE"/); assert.match(String(r.h['set-cookie']), /lotus_idioma=de/);
    r = await pedir('GET', '/entrar', { headers: { 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5' } }); assert.match(r.j, /Espace des mariés/);
    r = await pedir('GET', '/entrar', { headers: { Cookie: 'lotus_idioma=es', 'Accept-Language': 'fr' } }); assert.match(r.j, /Área de la pareja/, 'o cookie vale mais que o navegador');
    r = await pedir('GET', '/entrar', { headers: { Cookie: 'lotus_local=de', 'Accept-Language': 'en' } }); assert.match(r.j, /Bereich für das Brautpaar/, 'o país (lotus_local) vale mais que o navegador');
    r = await pedir('GET', '/entrar', { headers: { Cookie: 'lotus_local=de; lotus_idioma=fr' } }); assert.match(r.j, /Espace des mariés/, 'a escolha da pessoa vale mais que o país');
    assert.match(r.j, /<script src="\/local\.js\?v=\d+"><\/script>/); assert.match(r.j, /IdiomaLocal\.detectar/);
    r = await pedir('GET', '/local.js'); assert.match(r.j, /IdiomaLocal/); assert.match(String(r.h['content-type']), /javascript/);
    r = await pedir('GET', '/entrar?erro=tentativas', { headers: { Cookie: 'lotus_idioma=en' } }); assert.match(r.j, /Too many attempts/);
    r = await pedir('GET', '/entrar?erro=<script>x</script>'); assert.ok(!/<script>x/.test(r.j), 'mensagem de erro sempre escapada');
    r = await pedir('POST', '/auth/senha', { form: { email: 'ana@exemplo.com', senha: '000' } }); assert.match(r.h.location, /erro=credenciais/);
    ok('tela de entrar do casal: ?idioma, cookie, país (lotus_local) e idioma do navegador; erros por código e traduzidos');

    r = await pedir('GET', '/api/meu-evento?idioma=en', { cookie: CASAL });
    assert.strictEqual(r.j.idioma, 'en');
    const todas = [...r.j.cronograma.secoes.flatMap((s) => s.itens), ...r.j.cronograma.concluidas];
    assert.ok(todas.some((i) => i.texto === 'Set the wedding date'), 'atividade em inglês');
    assert.ok(todas.every((i) => Number.isInteger(i.etapa_meses)), 'etapa em número (o navegador escreve "N months before")');
    assert.ok(r.j.cronograma.secoes.every((s) => Number.isInteger(s.meses)));
    const al = r.j.alertas.find((a) => a.codigo === 'atrasadas');
    assert.ok(al && /[A-Za-z]/.test(al.p.lista) && !/Definição/.test(al.p.lista), 'lista de atrasadas no idioma');
    const chave = todas.find((i) => !i.concluida).chave;
    r = await pedir('POST', '/api/meu-evento/tarefa', { cookie: CASAL, headers: { 'Content-Type': 'application/json' } });
    r = await new Promise((res) => { const corpo = JSON.stringify({ chave, status: 'EM ANDAMENTO', idioma: 'fr' }); const q = http.request({ host: '127.0.0.1', port: PORTA, path: '/api/meu-evento/tarefa', method: 'POST', headers: { Cookie: CASAL, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corpo) } }, (x) => { let s = ''; x.on('data', (c) => { s += c; }); x.on('end', () => res(JSON.parse(s))); }); q.end(corpo); });
    assert.strictEqual(r.idioma, 'fr'); assert.ok(r.cronograma.secoes.flatMap((s) => s.itens).some((i) => /mariage|prestataire|invités/i.test(i.texto)));
    r = await pedir('GET', '/api/meu-evento', { cookie: CASAL });
    assert.ok([...r.j.cronograma.secoes.flatMap((s) => s.itens), ...r.j.cronograma.concluidas].some((i) => i.texto === 'Definição da data do casamento'), 'sem idioma: português');
    assert.strictEqual((await pedir('GET', '/idioma.js')).status, 200);
    r = await pedir('GET', '/meu-evento', { cookie: CASAL }); assert.match(r.j, /\/idioma\.js\?v=\d+/);
    ok('área do casal: atividades, etapas e alertas no idioma pedido (en, fr); sem idioma continua em português');
  } catch (e) { console.error(log.slice(-2000)); throw e; } finally { app.kill(); }
}

(async () => {
  await unidade();
  await servidor();
  console.log(`\n✓ idiomas: ${n} verificações passaram`);
})().catch((e) => { console.error(e); process.exit(1); });
