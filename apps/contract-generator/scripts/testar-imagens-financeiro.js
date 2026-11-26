#!/usr/bin/env node
/**
 * Teste: (1) correção de pagamentos/recebimentos pelo admin, com a planilha do Google recebendo o mesmo
 * (Apps Script falso); (2) Financeiro como aba do Painel de gestão; (3) Imagens compartilhadas (equipe/admin).
 *   node scripts/testar-imagens-financeiro.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { assinar } = require('../src/auth');

let n = 0; const ok = (m) => { n++; console.log(`  ✓ ${m}`); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-imgfin-'));
const dados = path.join(tmp, 'dados'); const raizImg = path.join(tmp, 'IMAGENS COMPARTILHADAS');
fs.mkdirSync(path.join(dados, 'integracoes'), { recursive: true }); fs.mkdirSync(path.join(dados, 'planilhas'), { recursive: true });
fs.mkdirSync(path.join(raizImg, 'Casamentos 2026'), { recursive: true });
const ano = new Date().getFullYear() + 1;
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), `evento_nomes: Ana e Bia\nevento_data: 10/10/${ano}\nnumero_os: AS-0999\nvalor_total: 6000\n`);
fs.writeFileSync(path.join(dados, 'planilhas', 'AS-0999.json'), JSON.stringify({ numero: 'AS-0999', titulo: 'Planilha Ana e Bia' }));
fs.writeFileSync(path.join(dados, 'usuarios.json'), JSON.stringify({ usuarios: [
  { email: 'casal@exemplo.com', nome: 'Ana', papel: 'casal', casal: 'ana-e-bia.txt', versao: 1 },
  { email: 'equipe@exemplo.com', nome: 'Equipe', papel: 'equipe', versao: 1 },
] }));
const PORTA = 3398; const PORTA_G = 3399; const SEGREDO = 'z'.repeat(40);
fs.writeFileSync(path.join(dados, 'integracoes', 'google-planilhas.json'), JSON.stringify({ url: `http://127.0.0.1:${PORTA_G}/macros/s/teste/exec`, chave: 'k' }));
// "Apps Script" falso: guarda o que o Lotus escreveria na aba FINANCEIRO
const planilha = {};
const google = http.createServer((req, res) => {
  let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => {
    const j = JSON.parse(s);
    if (j.acao === 'financeiro') planilha[j.numero] = j.linhas;
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, linhas: (j.linhas || []).length }));
  });
}).listen(PORTA_G, '127.0.0.1');

const env = { ...process.env, LOTUS_LOGIN: '1', LOTUS_URL: `http://localhost:${PORTA}`, GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's',
  LOTUS_SESSAO_SEGREDO: SEGREDO, LOTUS_ADMINS: 'tayna@exemplo.com', CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: path.join(tmp, 'saida'),
  LOTUS_IMAGENS: raizImg, LOTUS_CACHE_MINIATURAS: path.join(tmp, 'cache'), LOTUS_TESTE_GOOGLE_PLANILHAS: '1',
  SEM_ATUALIZAR: '1', PORTA: String(PORTA), HOST: '127.0.0.1' };
const sessao = (email) => `lotus_sessao=${encodeURIComponent(assinar(SEGREDO, { email, nome: 'T', foto: '', v: 1, exp: Math.floor(Date.now() / 1000) + 600 }))}`;
const ADMIN = sessao('tayna@exemplo.com'); const CASAL = sessao('casal@exemplo.com'); const EQUIPE = sessao('equipe@exemplo.com');
function pedir(metodo, caminho, { cookie, corpo, binario, headers: extra } = {}) {
  return new Promise((res, rej) => {
    const headers = { Cookie: cookie || '', ...(extra || {}) }; let envio = '';
    if (binario) { envio = binario; headers['Content-Length'] = binario.length; }
    else if (corpo) { envio = JSON.stringify(corpo); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(envio); }
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo, headers }, (x) => {
      const partes = []; x.on('data', (c) => partes.push(c)); x.on('end', () => {
        const buf = Buffer.concat(partes); const s = buf.toString();
        let j; try { j = JSON.parse(s); } catch { j = s; }
        res({ status: x.statusCode, j, h: x.headers, buf });
      });
    });
    r.on('error', rej); r.end(envio);
  });
}
const fin = (op, d, cookie = ADMIN, arq = Buffer.alloc(0), nome = '') => pedir('POST', `/api/financeiro/enviar?arquivo=ana-e-bia.txt&op=${op}&dados=${encodeURIComponent(JSON.stringify(d))}`,
  { cookie, binario: arq, headers: nome ? { 'X-Nome-Arquivo': nome } : {} });
const linha = (nome) => (planilha['AS-0999'] || []).find((l) => l.Fornecedor === nome);

(async () => {
  const sharp = require('sharp');
  await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#a8705c' } }).jpeg().toFile(path.join(raizImg, 'capa.jpg'));
  fs.writeFileSync(path.join(raizImg, '.oculto.txt'), 'x');
  const app = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; app.stdout.on('data', (d) => { log += d; }); app.stderr.on('data', (d) => { log += d; });
  try {
    for (let i = 0; i < 60; i++) { try { await pedir('GET', '/saude'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }

    // ---------- financeiro: o casal lança errado, a Tayná corrige ----------
    let r = await fin('item', { fornecedor: { nome: 'Buffet Sabores' }, item: { nome: 'Buffet Sabores', valor_contratado: '9000', parcelas: { quantidade: '3', valor: '3000', primeiro_vencimento: `${ano}-01-10` } } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.j)); const buffet = r.j.item_id;
    r = await fin('item', { fornecedor: { nome: 'Foto Luz' }, item: { nome: 'Foto Luz', valor_contratado: '5000' } }); const foto = r.j.item_id;
    r = await pedir('POST', `/api/meu-evento/pagamento?dados=${encodeURIComponent(JSON.stringify({ id: buffet, tipo: 'parcela', valor: '30000', data: `${ano - 1}-11-20`, forma: 'PIX' }))}`,
      { cookie: CASAL, binario: Buffer.from('%PDF-1.4 comprovante'), headers: { 'X-Nome-Arquivo': 'comp.pdf' } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.j));
    assert.strictEqual(linha('Buffet Sabores')['Valor Pago'], 30000, 'a planilha recebeu o valor errado do casal');
    let F = (await pedir('GET', '/api/financeiro?arquivo=ana-e-bia.txt', { cookie: ADMIN })).j;
    const pg = F.itens.find((i) => i.id === buffet).pagamentos[0];
    assert.ok(pg.lancado_por);
    r = await fin('editar-pagamento', { id: buffet, pagamento_id: pg.id, valor: '3.000,00', data: `${ano - 1}-11-21`, tipo: 'parcela', numero: 1, forma: 'Transferência', obs: 'casal digitou 30000' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.j));
    assert.strictEqual(linha('Buffet Sabores')['Valor Pago'], 3000, 'planilha corrigida na hora');
    assert.strictEqual(linha('Buffet Sabores')['Data do Pagamento da Parcela'], `21/11/${ano - 1}`);
    F = (await pedir('GET', '/api/financeiro?arquivo=ana-e-bia.txt', { cookie: ADMIN })).j;
    const b = F.itens.find((i) => i.id === buffet);
    assert.strictEqual(b.pagamentos[0].valor, 3000); assert.strictEqual(b.pagamentos[0].forma, 'Transferência'); assert.ok(b.pagamentos[0].editado_em);
    assert.ok(b.pagamentos[0].lancado_por, 'continua marcado como enviado pelo casal');
    assert.ok(b.historico.some((h) => /Lançamento corrigido: de R\$\s?30\.000,00/.test(h)), b.historico.join(' | '));
    ok('Tayná corrige o valor que o casal enviou errado; Lotus e planilha ficam iguais (R$ 3.000)');

    r = await fin('editar-pagamento', { id: buffet, pagamento_id: pg.id, mover_para: foto });
    F = (await pedir('GET', '/api/financeiro?arquivo=ana-e-bia.txt', { cookie: ADMIN })).j;
    assert.strictEqual(F.itens.find((i) => i.id === buffet).pagamentos.length, 0);
    assert.strictEqual(F.itens.find((i) => i.id === foto).pagamentos[0].valor, 3000);
    assert.ok(!linha('Buffet Sabores')['Valor Pago'] && linha('Foto Luz')['Valor Pago'] === 3000, 'planilha: pagamento mudou de fornecedor');
    ok('pagamento lançado no fornecedor errado vai para o certo (e na planilha também)');

    r = await fin('editar-pagamento', { id: foto, pagamento_id: pg.id, valor: '0' });
    assert.strictEqual(r.status, 400); assert.match(r.j.erro, /valor/);
    assert.strictEqual((await fin('editar-pagamento', { id: foto, pagamento_id: pg.id, valor: '1' }, EQUIPE)).status, 403);
    assert.strictEqual((await fin('editar-pagamento', { id: foto, pagamento_id: pg.id, valor: '1' }, CASAL)).status, 403);
    ok('valor inválido recusado; equipe e casal não corrigem lançamentos');

    // recebimento da Tayná: registrar, corrigir e remover (pela aba Recebimentos do painel)
    r = await fin('recebimento', { tipo: 'entrada', valor: '2000', data: `${ano - 1}-10-01`, forma: 'PIX' });
    const tay = r.j.item_id;
    let rec = (await pedir('GET', '/api/gestao/recebimentos', { cookie: ADMIN })).j;
    let ri = rec.itens.find((i) => i.arquivo === 'ana-e-bia.txt');
    assert.strictEqual(ri.recebido, 2000); assert.strictEqual(ri.item_id, tay);
    await fin('editar-pagamento', { id: tay, pagamento_id: ri.pagamentos[0].id, valor: '1800', tipo: 'entrada' });
    rec = (await pedir('GET', '/api/gestao/recebimentos', { cookie: ADMIN })).j; ri = rec.itens.find((i) => i.arquivo === 'ana-e-bia.txt');
    assert.strictEqual(ri.recebido, 1800); assert.ok(ri.pagamentos[0].editado);
    await fin('remover-pagamento', { id: tay, pagamento_id: ri.pagamentos[0].id });
    rec = (await pedir('GET', '/api/gestao/recebimentos', { cookie: ADMIN })).j; ri = rec.itens.find((i) => i.arquivo === 'ana-e-bia.txt');
    assert.strictEqual(ri.recebido, 0);
    ok('recebimento da Tayná: corrigir (R$ 2.000 → 1.800) e remover');

    // ---------- Financeiro dentro do Painel de gestão ----------
    r = await pedir('GET', '/financeiro?casal=ana-e-bia.txt', { cookie: ADMIN });
    assert.strictEqual(r.status, 302); assert.strictEqual(r.h.location, '/gestao?casal=ana-e-bia.txt#financeiro');
    r = await pedir('GET', '/financeiro?embutido=1&casal=ana-e-bia.txt', { cookie: ADMIN }); assert.strictEqual(r.status, 200); assert.match(r.j, /embutido/);
    r = await pedir('GET', '/gestao', { cookie: ADMIN }); assert.match(r.j, /data-aba="financeiro"/); assert.match(r.j, /frameFin/);
    r = await pedir('GET', '/', { cookie: ADMIN }); assert.ok(!/link: '\/financeiro'/.test(r.j), 'sem card separado do Financeiro');
    ok('Financeiro é a aba "Financeiro dos casais" do Painel de gestão; /financeiro antigo redireciona');

    // ---------- Imagens compartilhadas ----------
    r = await pedir('GET', '/api/imagens', { cookie: EQUIPE });
    assert.strictEqual(r.status, 200); assert.ok(r.j.disponivel);
    assert.deepStrictEqual(r.j.pastas.map((p) => p.nome), ['Casamentos 2026']);
    assert.deepStrictEqual(r.j.arquivos.map((a) => a.nome), ['capa.jpg'], 'oculto não aparece'); assert.strictEqual(r.j.pode_apagar, false);
    r = await pedir('GET', `/api/imagens/arquivo?caminho=capa.jpg&tam=mini`, { cookie: EQUIPE });
    assert.strictEqual(r.h['content-type'], 'image/webp');
    const meta = await sharp(r.buf).metadata(); assert.ok(meta.width === 480 && meta.height === 320, `${meta.width}x${meta.height}`);
    r = await pedir('GET', `/api/imagens/arquivo?caminho=capa.jpg`, { cookie: EQUIPE, headers: { Range: 'bytes=0-99' } });
    assert.strictEqual(r.status, 206); assert.strictEqual(r.buf.length, 100);
    ok('equipe vê pastas e fotos (miniatura 480 px em webp; vídeo/arquivo por partes)');

    const foto2 = await sharp({ create: { width: 30, height: 30, channels: 3, background: '#fff' } }).png().toBuffer();
    r = await pedir('POST', `/api/imagens/enviar?pasta=${encodeURIComponent('Casamentos 2026')}`, { cookie: EQUIPE, binario: foto2, headers: { 'X-Nome-Arquivo': encodeURIComponent('mesa posta.png') } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.j)); assert.strictEqual(r.j.caminho, 'Casamentos 2026/mesa posta.png');
    r = await pedir('POST', `/api/imagens/enviar?pasta=${encodeURIComponent('Casamentos 2026')}`, { cookie: EQUIPE, binario: foto2, headers: { 'X-Nome-Arquivo': encodeURIComponent('mesa posta.png') } });
    assert.strictEqual(r.j.nome, 'mesa posta (2).png', 'não sobrescreve');
    assert.ok(fs.existsSync(path.join(raizImg, 'Casamentos 2026', 'mesa posta (2).png')));
    assert.ok(!fs.readdirSync(path.join(raizImg, 'Casamentos 2026')).some((f) => f.startsWith('.envio')), 'sem arquivo temporário');
    r = await pedir('POST', '/api/imagens/pasta', { cookie: EQUIPE, corpo: { pasta: '', nome: 'Decoração / Flores' } });
    assert.strictEqual(r.j.nome, 'Decoração Flores'); assert.ok(fs.existsSync(path.join(raizImg, 'Decoração Flores')));
    ok('equipe envia fotos (sem sobrescrever) e cria pastas com nome seguro');

    assert.strictEqual((await pedir('GET', '/api/imagens/arquivo?caminho=../dados/usuarios.json', { cookie: EQUIPE })).status, 400);
    assert.strictEqual((await pedir('GET', '/api/imagens/arquivo?caminho=.oculto.txt', { cookie: EQUIPE })).status, 400);
    assert.strictEqual((await pedir('POST', `/api/imagens/enviar?pasta=..`, { cookie: EQUIPE, binario: foto2, headers: { 'X-Nome-Arquivo': 'x.png' } })).status, 400);
    assert.strictEqual((await pedir('GET', '/api/imagens', { cookie: CASAL })).status, 403);
    assert.strictEqual((await pedir('GET', '/imagens', { cookie: CASAL })).status, 403);
    assert.strictEqual((await pedir('POST', '/api/imagens/excluir', { cookie: EQUIPE, corpo: { caminho: 'capa.jpg' } })).status, 403);
    r = await pedir('POST', '/api/imagens/excluir', { cookie: ADMIN, corpo: { caminho: 'capa.jpg' } }); assert.strictEqual(r.status, 200);
    assert.ok(!fs.existsSync(path.join(raizImg, 'capa.jpg')));
    assert.strictEqual((await pedir('POST', '/api/imagens/excluir', { cookie: ADMIN, corpo: { caminho: '' } })).status, 400);
    ok('nada fora da pasta nem oculto; casal sem acesso; só admin apaga (nunca a pasta principal)');
  } catch (e) { console.error(log.slice(-2500)); throw e; } finally { app.kill(); google.close(); }
  console.log(`\n✓ imagens e correções do financeiro: ${n} verificações passaram`);
})().catch((e) => { console.error(e); process.exit(1); });
