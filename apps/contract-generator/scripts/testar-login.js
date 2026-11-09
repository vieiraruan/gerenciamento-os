#!/usr/bin/env node
/**
 * Teste do login do Lotus online (sem internet): sobe o Lotus com LOTUS_LOGIN=1 e um "Google" falso, e confere
 * o fluxo completo e as proteções (state, nonce, audiência, e-mail não liberado, perfis, origem, sessão revogada).
 *   node scripts/testar-login.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const B64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-login-'));
const dados = path.join(tmp, 'dados'); fs.mkdirSync(dados, { recursive: true });
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), 'evento_nomes: Ana e Bia\nevento_data: 10/10/2027\nnumero_os: AS-0999\nvalor_total: 5000\n');
const PORTA = 3399; const PORTA_G = 3398;

// ---- Google falso: devolve um id_token para o "code" recebido ----
let proximo = { email: 'tayna@exemplo.com', aud: 'cliente-teste', nonceErrado: false, verificado: true };
let ultimoNonce = '';
const google = http.createServer((req, res) => {
  let corpo = ''; req.on('data', (c) => { corpo += c; });
  req.on('end', () => {
    const q = new URLSearchParams(corpo);
    assert.ok(q.get('code_verifier'), 'PKCE: code_verifier enviado');
    const tok = [B64({ alg: 'RS256' }), B64({ iss: 'https://accounts.google.com', aud: proximo.aud, exp: Math.floor(Date.now() / 1000) + 300,
      nonce: proximo.nonceErrado ? 'outro' : ultimoNonce, email: proximo.email, email_verified: proximo.verificado, name: 'Teste' }), 'assinatura'].join('.');
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ id_token: tok }));
  });
}).listen(PORTA_G);

const env = { ...process.env, LOTUS_LOGIN: '1', LOTUS_URL: `http://localhost:${PORTA}`, GOOGLE_CLIENT_ID: 'cliente-teste', GOOGLE_CLIENT_SECRET: 'segredo-teste',
  LOTUS_SESSAO_SEGREDO: 'x'.repeat(40), LOTUS_ADMINS: 'tayna@exemplo.com', LOTUS_TESTE_TOKEN_URL: `http://localhost:${PORTA_G}/token`,
  CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: path.join(tmp, 'saida'), SEM_ATUALIZAR: '1', PORTA: String(PORTA), HOST: '127.0.0.1' };
const app = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; app.stdout.on('data', (d) => { log += d; }); app.stderr.on('data', (d) => { log += d; });

function pedir(metodo, caminho, { cookie = '', corpo, origem } = {}) {
  return new Promise((ok, erro) => {
    const dadosCorpo = corpo ? JSON.stringify(corpo) : '';
    const headers = { Cookie: cookie };
    if (corpo) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(dadosCorpo); }
    if (origem) headers.Origin = origem;
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo, headers }, (res) => {
      let s = ''; res.on('data', (c) => { s += c; }); res.on('end', () => ok({ status: res.statusCode, headers: res.headers, corpo: s }));
    });
    r.on('error', erro); r.end(dadosCorpo);
  });
}
const cookiesDe = (res) => (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).filter((c) => !/=$/.test(c)).join('; ');

async function entrar(email, opcoes = {}) {
  proximo = { email, aud: 'cliente-teste', nonceErrado: false, verificado: true, ...opcoes };
  const ini = await pedir('GET', '/auth/google');
  assert.strictEqual(ini.status, 302);
  const destino = new URL(ini.headers.location);
  assert.strictEqual(destino.host, 'accounts.google.com');
  assert.strictEqual(destino.searchParams.get('code_challenge_method'), 'S256');
  ultimoNonce = destino.searchParams.get('nonce');
  const state = opcoes.stateErrado ? 'xxx' : destino.searchParams.get('state');
  const ret = await pedir('GET', `/auth/google/retorno?code=abc&state=${state}`, { cookie: cookiesDe(ini) });
  return ret;
}

(async () => {
  await new Promise((r) => setTimeout(r, 900));
  let ok = 0; const t = async (nome, fn) => { await fn(); ok++; console.log(`  ✓ ${nome}`); };
  try {
    await t('sem sessão: página vai para o Google, API responde 401', async () => {
      assert.strictEqual((await pedir('GET', '/')).status, 302);
      assert.strictEqual((await pedir('GET', '/api/contratos')).status, 401);
      assert.strictEqual((await pedir('GET', '/entrar')).status, 200);
      assert.strictEqual((await pedir('GET', '/saude')).status, 200);
    });
    await t('state errado é recusado', async () => {
      const r = await entrar('tayna@exemplo.com', { stateErrado: true });
      assert.match(r.headers.location, /^\/entrar\?erro=/); assert.ok(!/lotus_sessao=[^;]+/.test(cookiesDe(r)));
    });
    await t('nonce errado e audiência errada são recusados', async () => {
      assert.match((await entrar('tayna@exemplo.com', { nonceErrado: true })).headers.location, /^\/entrar\?erro=/);
      assert.match((await entrar('tayna@exemplo.com', { aud: 'outro-app' })).headers.location, /^\/entrar\?erro=/);
      assert.match((await entrar('tayna@exemplo.com', { verificado: false })).headers.location, /^\/entrar\?erro=/);
    });
    await t('online: formulário do site aberto, pedidos só com login', async () => {
      assert.strictEqual((await pedir('GET', '/api/publico/servicos')).status, 200);
      assert.strictEqual((await pedir('GET', '/api/pedidos')).status, 401);
      assert.strictEqual((await pedir('GET', '/pedidos')).status, 302);
    });
    await t('e-mail não liberado não entra', async () => {
      const r = await entrar('estranho@exemplo.com');
      assert.match(decodeURIComponent(r.headers.location), /não tem acesso/);
    });
    const admin = cookiesDe(await entrar('tayna@exemplo.com'));
    await t('admin fixo entra e vê tudo', async () => {
      assert.match(admin, /lotus_sessao=/);
      const eu = JSON.parse((await pedir('GET', '/api/eu', { cookie: admin })).corpo);
      assert.strictEqual(eu.papel, 'admin'); assert.strictEqual(eu.login, true);
      assert.strictEqual((await pedir('GET', '/gestao', { cookie: admin })).status, 200);
      const lista = JSON.parse((await pedir('GET', '/api/contratos', { cookie: admin })).corpo);
      assert.strictEqual(lista[0].valor_total, '5000');
    });
    await t('rotas do computador (abrir pasta, encerrar) bloqueadas online', async () => {
      assert.strictEqual((await pedir('POST', '/api/encerrar', { cookie: admin, corpo: {} })).status, 403);
      assert.strictEqual((await pedir('POST', '/api/abrir', { cookie: admin, corpo: { caminho: 'C:\\' } })).status, 403);
    });
    await t('POST de outra origem é recusado', async () => {
      assert.strictEqual((await pedir('POST', '/api/usuarios', { cookie: admin, corpo: { email: 'x@y.com', papel: 'equipe' }, origem: 'https://site-malicioso.com' })).status, 403);
    });
    await t('admin libera equipe e casal', async () => {
      assert.strictEqual((await pedir('POST', '/api/usuarios', { cookie: admin, corpo: { email: 'Equipe@Exemplo.com', nome: 'Equipe', papel: 'equipe' }, origem: `http://localhost:${PORTA}` })).status, 200);
      assert.strictEqual((await pedir('POST', '/api/usuarios', { cookie: admin, corpo: { email: 'casal@exemplo.com', papel: 'casal', casal: 'ana-e-bia.txt' } })).status, 200);
    });
    const equipe = cookiesDe(await entrar('equipe@exemplo.com'));
    await t('equipe: checklist sim; financeiro, gestão, usuários e valores não', async () => {
      assert.strictEqual((await pedir('GET', '/checklist', { cookie: equipe })).status, 200);
      assert.strictEqual((await pedir('GET', '/cronograma', { cookie: equipe })).status, 200);
      assert.strictEqual((await pedir('GET', '/api/cronograma', { cookie: equipe })).status, 200);
      for (const p of ['/financeiro', '/gestao', '/contratos', '/usuarios', '/pedidos']) assert.strictEqual((await pedir('GET', p, { cookie: equipe })).status, 403, p);
      for (const p of ['/api/financeiro?arquivo=ana-e-bia.txt', '/api/gestao/painel', '/api/usuarios', '/api/config']) assert.strictEqual((await pedir('GET', p, { cookie: equipe })).status, 403, p);
      const lista = JSON.parse((await pedir('GET', '/api/contratos', { cookie: equipe })).corpo);
      assert.strictEqual(lista[0].valor_total, undefined);
    });
    const casal = cookiesDe(await entrar('casal@exemplo.com'));
    await t('casal: só o próprio evento', async () => {
      assert.strictEqual((await pedir('GET', '/', { cookie: casal })).headers.location, '/meu-evento');
      const me = JSON.parse((await pedir('GET', '/api/meu-evento?arquivo=outro.txt', { cookie: casal })).corpo);
      assert.match(me.evento.nomes, /Ana e Bia/); // ignora ?arquivo= e usa o casal do acesso
      for (const p of ['/api/contratos', '/api/evento?arquivo=ana-e-bia.txt', '/checklist']) assert.strictEqual((await pedir('GET', p, { cookie: casal })).status, 403, p);
    });
    await t('trocar o perfil derruba a sessão na hora', async () => {
      await pedir('POST', '/api/usuarios', { cookie: admin, corpo: { email: 'equipe@exemplo.com', papel: 'casal', casal: 'ana-e-bia.txt' } });
      assert.strictEqual((await pedir('GET', '/api/eu', { cookie: equipe })).status, 401);
    });
    await t('cookie adulterado não vale', async () => {
      const falso = admin.replace(/lotus_sessao=([^.]+)\./, (m, c) => `lotus_sessao=${c}A.`);
      assert.strictEqual((await pedir('GET', '/api/eu', { cookie: falso })).status, 401);
    });
    await t('sair apaga a sessão', async () => {
      const r = await pedir('GET', '/sair', { cookie: admin });
      assert.match(String(r.headers['set-cookie']), /lotus_sessao=;.*Max-Age=0/);
    });
    console.log(`\n✓ login: ${ok} verificações passaram`);
  } catch (e) {
    console.error('\n✗ falhou:', e.message, '\n', log.slice(-1500)); process.exitCode = 1;
  } finally { app.kill(); google.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
})();
