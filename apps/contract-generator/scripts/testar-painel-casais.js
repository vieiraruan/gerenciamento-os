#!/usr/bin/env node
/**
 * Teste do painel dos casais (/casais), do quadro e do burndown das atividades, dos alertas de atraso e dos
 * avisos no celular da Tayná (notificação ntfy e WhatsApp CallMeBot, com servidores falsos).
 *   node scripts/testar-painel-casais.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { assinar } = require('../src/auth');
const { montarChecklist } = require('../src/checklist');
const acomp = require('../src/acompanhamento');
const avisos = require('../src/avisos');

let n = 0; const ok = (m) => { n++; console.log(`  ✓ ${m}`); };
const pad = (x) => String(x).padStart(2, '0');
const br = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const isoD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const emMeses = (m) => new Date(hoje.getFullYear(), hoje.getMonth() + m, Math.min(hoje.getDate(), 28));

async function unidade() {
  // ---- burndown ----
  const contrato = { evento_nomes: 'Ana e Bia', evento_data: br(emMeses(6)), data_assinatura: br(emMeses(-6)), numero_os: 'AS-0999' };
  const vazio = montarChecklist(contrato, 'padrao', hoje, { tarefas: {} });
  const todas = [...vazio.secoes.flatMap((s) => s.itens), ...vazio.concluidas];
  const feitas = {};
  todas.slice(0, 10).forEach((t, i) => { feitas[t.chave] = { status: 'FINALIZADO', concluida_em: new Date(hoje - (i + 1) * 864e5 * 9).toISOString() }; });
  const ck = montarChecklist(contrato, 'padrao', hoje, { tarefas: feitas });
  const b = acomp.burndown(ck, null, isoD(hoje));
  assert.strictEqual(b.total, todas.length);
  assert.strictEqual(b.restantes, todas.length - ck.concluidas.length); assert.ok(ck.concluidas.length >= 10);
  assert.strictEqual(b.pontos[0].data, b.inicio); assert.strictEqual(b.pontos[b.pontos.length - 1].data, b.casamento);
  assert.strictEqual(b.pontos[b.pontos.length - 1].planejado, 0, 'planejado chega a zero no casamento');
  assert.ok(b.pontos.every((p, i, l) => !i || p.planejado <= l[i - 1].planejado), 'planejado nunca sobe');
  assert.ok(b.pontos.every((p) => (p.data > isoD(hoje) ? p.real === null : p.real !== null)), 'real só até hoje');
  const pHoje = b.pontos.find((p) => p.data === isoD(hoje));
  assert.strictEqual(pHoje.real, b.restantes);
  assert.ok(b.diferenca < 0, 'com só 10 feitas em 6 meses, está atrás do previsto');
  assert.ok(b.previsao, 'projeção pelo ritmo das últimas semanas');
  ok(`burndown: planejado ${b.esperado_hoje} × real ${b.restantes} hoje, zera no casamento, projeção ${b.previsao}`);

  // ---- alertas ----
  const ontem = isoD(new Date(hoje - 864e5)); const em3 = isoD(new Date(+hoje + 3 * 864e5));
  const al = acomp.alertas({ ck, dataEvento: isoD(emMeses(6)), recebimento: { status: 'Atrasado', atrasado: 1500 },
    resumoFin: { atrasados: [{ fornecedor: 'Buffet', numero: 2, valor: 3500, vencimento: ontem }], proximos: [{ fornecedor: 'Foto', numero: 1, valor: 800, vencimento: em3 }],
      entradas_pendentes: [], itens: [] } }, isoD(hoje));
  assert.strictEqual(al[0].nivel, 'critico');
  assert.ok(al.some((a) => a.tipo === 'atividade' && /atrasada/.test(a.titulo)), 'atividades atrasadas');
  assert.ok(al.some((a) => /Buffet: parcela 2 vencida/.test(a.titulo)), 'parcela vencida');
  assert.ok(al.some((a) => a.nivel === 'aviso' && /Foto: parcela 1 vence/.test(a.titulo)), 'parcela vencendo em 7 dias');
  assert.ok(al.some((a) => a.tipo === 'assessoria'), 'assessoria em atraso');
  ok('alertas: atividades atrasadas, parcela vencida, vencimento em 7 dias e assessoria (graves primeiro)');

  // ---- avisos (servidor falso no lugar do ntfy e do CallMeBot) ----
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-avisos-'));
  assert.throws(() => avisos.salvar(dir, { whatsapp: { ativo: true, telefone: '81 9999', apikey: '123' } }), /país e o DDD/);
  assert.throws(() => avisos.salvar(dir, { whatsapp: { ativo: true, telefone: '+55 81 99999-0000' } }), /chave/);
  let c = avisos.salvar(dir, { notificacao: { ativo: true }, whatsapp: { ativo: true, telefone: '+55 81 99999-0000', apikey: '1234567' } });
  assert.match(c.notificacao.topico, /^lotus-tayna-[0-9a-f]{24}$/); assert.strictEqual(c.whatsapp.telefone, '+5581999990000');
  assert.strictEqual(c.whatsapp.tem_chave, true); assert.ok(!JSON.stringify(c).includes('1234567'), 'a chave não volta para a tela');
  c = avisos.salvar(dir, { whatsapp: { ativo: true, telefone: '+55 81 99999-0000', apikey: '' } });
  assert.strictEqual(avisos.configuracao(dir).whatsapp.apikey, '1234567', 'salvar sem chave mantém a anterior');
  const chamadas = [];
  const fetchFn = async (url, o) => { chamadas.push({ url, o }); return { ok: true, status: 200, text: async () => 'Message queued. You will receive it in a few seconds.' }; };
  const r = await avisos.enviar(dir, { titulo: 'Novo pedido de orçamento', texto: 'Ana · casamento em 10/10/2027', link: 'https://lotus/pedidos?id=1' }, { fetchFn });
  assert.ok(r.notificacao.ok && r.whatsapp.ok, JSON.stringify(r));
  const ntfy = JSON.parse(chamadas[0].o.body);
  assert.strictEqual(ntfy.topic, c.notificacao.topico); assert.strictEqual(ntfy.click, 'https://lotus/pedidos?id=1');
  assert.match(chamadas[1].url, /^https:\/\/api\.callmebot\.com\/whatsapp\.php\?phone=%2B5581999990000&apikey=1234567&text=/);
  const ruim = await avisos.enviar(dir, { titulo: 't', texto: 'x' }, { fetchFn: async () => ({ ok: true, status: 200, text: async () => 'APIKey is invalid.' }) });
  assert.ok(ruim.whatsapp.erro && /invalid/i.test(ruim.whatsapp.erro));
  const fora = await avisos.enviar(dir, { titulo: 't', texto: 'x' }, { fetchFn: async () => { throw new Error('sem internet'); } });
  assert.ok(fora.notificacao.erro && fora.whatsapp.erro, 'sem internet não derruba nada');
  ok('avisos: valida telefone e chave, esconde a chave, envia ntfy + WhatsApp e registra erros sem quebrar');
}

// ---------------- servidor ----------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lotus-casais-'));
const dados = path.join(tmp, 'dados'); fs.mkdirSync(path.join(dados, 'clientes'), { recursive: true });
fs.writeFileSync(path.join(dados, 'ana-e-bia.txt'), `evento_nomes: Ana e Bia\nevento_data: ${br(emMeses(5))}\ndata_assinatura: ${br(emMeses(-5))}\nnumero_os: AS-0999\nvalor_total: 6000\nservicos: essencial\ncliente: ana-cliente.txt\n`);
fs.writeFileSync(path.join(dados, 'clientes', 'ana-cliente.txt'), 'nome: Ana Souza\nemail: ana@exemplo.com\ncpf_cnpj: 123.456.789-09\ntelefone: (81) 99999-1111\n');
fs.writeFileSync(path.join(dados, 'caio-e-davi.txt'), `evento_nomes: Caio e Davi\nevento_data: ${br(emMeses(2))}\nnumero_os: CE-0998\nvalor_total: 3000\n`);
fs.writeFileSync(path.join(dados, 'usuarios.json'), JSON.stringify({ usuarios: [
  { email: 'casal@exemplo.com', nome: 'Ana', papel: 'casal', casal: 'ana-e-bia.txt', versao: 1 },
  { email: 'equipe@exemplo.com', nome: 'Equipe', papel: 'equipe', versao: 1 },
] }));
const SEGREDO = 'y'.repeat(40); const PORTA = 3397;
const env = { ...process.env, LOTUS_LOGIN: '1', LOTUS_URL: `http://localhost:${PORTA}`, GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's',
  LOTUS_SESSAO_SEGREDO: SEGREDO, LOTUS_ADMINS: 'tayna@exemplo.com', CONTRATOS_DADOS: dados, CONTRATOS_SAIDA: path.join(tmp, 'saida'),
  SEM_ATUALIZAR: '1', PORTA: String(PORTA), HOST: '127.0.0.1' };
const sessao = (email) => `lotus_sessao=${encodeURIComponent(assinar(SEGREDO, { email, nome: 'T', foto: '', v: 1, exp: Math.floor(Date.now() / 1000) + 600 }))}`;
const ADMIN = sessao('tayna@exemplo.com'); const CASAL = sessao('casal@exemplo.com'); const EQUIPE = sessao('equipe@exemplo.com');
function pedir(metodo, caminho, { cookie, corpo, binario } = {}) {
  return new Promise((res, rej) => {
    const headers = { Cookie: cookie || '' }; let envio = '';
    if (binario) { envio = binario; headers['Content-Length'] = binario.length; }
    else if (corpo) { envio = JSON.stringify(corpo); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(envio); }
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: caminho, method: metodo, headers }, (x) => {
      let s = ''; x.on('data', (c) => { s += c; }); x.on('end', () => { try { res({ status: x.statusCode, j: JSON.parse(s) }); } catch { res({ status: x.statusCode, j: s }); } });
    });
    r.on('error', rej); r.end(envio);
  });
}

async function servidor() {
  const app = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servidor.js'), '--sem-navegador'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; app.stdout.on('data', (d) => { log += d; }); app.stderr.on('data', (d) => { log += d; });
  try {
    for (let i = 0; i < 60; i++) { try { await pedir('GET', '/saude'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    // fornecedor com parcela vencida
    const venc = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 5);
    const it = await pedir('POST', `/api/financeiro/enviar?arquivo=ana-e-bia.txt&op=item&dados=${encodeURIComponent(JSON.stringify({
      fornecedor: { nome: 'Buffet Sabores' },
      item: { nome: 'Buffet Sabores', valor_contratado: '9000', parcelas: { quantidade: '3', valor: '3000', primeiro_vencimento: isoD(venc) } },
    }))}`, { cookie: ADMIN, binario: Buffer.alloc(0) });
    assert.strictEqual(it.status, 200, JSON.stringify(it.j));

    let r = await pedir('GET', '/api/casais', { cookie: ADMIN });
    assert.strictEqual(r.status, 200, JSON.stringify(r.j));
    const ana = r.j.casais.find((c) => c.arquivo === 'ana-e-bia.txt'); const caio = r.j.casais.find((c) => c.arquivo === 'caio-e-davi.txt');
    assert.ok(ana && caio, 'lista os dois casais');
    assert.strictEqual(ana.linha, 'Assessoria'); assert.strictEqual(caio.linha, 'Cerimonial');
    assert.deepStrictEqual(ana.servicos, ['O Essencial']); assert.strictEqual(ana.acesso_casal, true); assert.strictEqual(caio.acesso_casal, false);
    assert.ok(ana.atividades.total > 0 && caio.atividades === null, 'cronograma só para assessoria');
    assert.ok(ana.alertas.criticos >= 2 && /atividade\(s\) atrasada/.test(ana.alertas.principal), JSON.stringify(ana.alertas));
    ok('lista de casais: linha, serviços, atividades, fornecedores, acesso do casal e alerta principal');

    r = await pedir('GET', '/api/casais/painel?arquivo=ana-e-bia.txt', { cookie: ADMIN });
    const p = r.j;
    assert.strictEqual(p.contrato.cliente, 'Ana Souza'); assert.strictEqual(p.contrato.email, 'ana@exemplo.com');
    assert.ok(p.burndown && p.burndown.pontos.length > 10, 'burndown no painel');
    assert.ok(p.recebimento && p.recebimento.total === 6000, 'recebimentos da assessoria');
    assert.ok(p.alertas.some((a) => a.nivel === 'critico' && /Buffet Sabores: parcela 1 vencida/.test(a.titulo)), 'alerta de parcela vencida');
    assert.ok(p.cronograma.secoes[0].itens[0].etapa && 'prazo' in p.cronograma.secoes[0].itens[0], 'cartões com etapa e prazo');
    ok('painel do casal: contrato, recebimentos, burndown, cartões com etapa/prazo');

    // mover no quadro (Tayná) e o casal vê
    const t = p.cronograma.secoes.flatMap((s) => s.itens).find((i) => !i.concluida);
    r = await pedir('POST', '/api/cronograma/tarefa', { cookie: ADMIN, corpo: { arquivo: 'ana-e-bia.txt', chave: t.chave, status: 'EM COTAÇÃO', status_atual: '' } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.j));
    let me = (await pedir('GET', '/api/meu-evento', { cookie: CASAL })).j;
    assert.strictEqual(me.cronograma.secoes.flatMap((s) => s.itens).find((i) => i.chave === t.chave).status, 'EM COTAÇÃO');
    assert.ok(me.burndown && Array.isArray(me.alertas), 'área do casal com burndown e alertas');
    assert.ok(!me.contrato && !me.recebimento, 'o casal não recebe os dados internos do contrato');
    r = await pedir('POST', '/api/meu-evento/tarefa', { cookie: CASAL, corpo: { chave: t.chave, status: 'FINALIZADO' } });
    me = r.j; assert.strictEqual(me.burndown.concluidas, p.burndown.concluidas + 1, 'concluir no quadro desce o burndown');
    ok('quadro: Tayná move para "Em cotação", o casal vê e conclui; o burndown desce');

    // permissões
    assert.strictEqual((await pedir('GET', '/api/casais', { cookie: CASAL })).status, 403);
    assert.strictEqual((await pedir('GET', '/api/casais/painel?arquivo=ana-e-bia.txt', { cookie: EQUIPE })).status, 403);
    assert.strictEqual((await pedir('GET', '/api/avisos', { cookie: CASAL })).status, 403);
    assert.strictEqual((await pedir('GET', '/acompanhamento.js')).status, 200, 'script do quadro é público (tela de entrar/área do casal)');
    r = await pedir('GET', '/casais', { cookie: ADMIN }); assert.match(r.j, /acompanhamento\.js\?v=\d+/);
    ok('painel dos casais e avisos só para admin; casal e equipe barrados');

    // avisos pela tela
    r = await pedir('POST', '/api/avisos/teste', { cookie: ADMIN, corpo: {} }); assert.strictEqual(r.status, 400); assert.match(r.j.erro, /Ative/);
    r = await pedir('POST', '/api/avisos', { cookie: ADMIN, corpo: { notificacao: { ativo: true } } });
    assert.ok(r.j.notificacao.ativo && r.j.notificacao.topico);
    ok('avisos: Tayná ativa a notificação pela tela e o Lotus gera o canal');
  } catch (e) { console.error(log.slice(-2000)); throw e; } finally { app.kill(); }
}

(async () => {
  await unidade();
  await servidor();
  console.log(`\n✓ painel dos casais: ${n} verificações passaram`);
})().catch((e) => { console.error(e); process.exit(1); });
