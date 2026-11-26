/**
 * Pedidos de orçamento vindos do site (taynaalvesassessoria.com.br).
 *
 * O casal preenche o formulário → o Lotus guarda o pedido em _DADOS DO SISTEMA/pedidos/<id>.json, calcula o
 * orçamento prévio pela tabela de serviços (templates/servicos.json), gera o PDF e manda por e-mail (o site não mostra
 * preços). O casal pode pedir um horário para conversar com a Tayná ou chamá-la no WhatsApp pelo site. A Tayná recebe
 * os alertas por e-mail e acompanha tudo na tela Pedidos do site.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const idiomas = require('./idiomas');

const RAIZ = path.resolve(__dirname, '..');
const BASE_CONVIDADOS = 150;
const POR_PROFISSIONAL = 50;
const VALOR_PROFISSIONAL = 350;
const DESTINATION = 0.15;
const VALIDADE_DIAS = 15;
const ESTADOS = ['novo', 'em_conversa', 'fechado', 'descartado'];
const NAO_SEI = 'nao_sei';

const dirPedidos = (dirDados) => path.join(dirDados, 'pedidos');
const arquivoPedido = (dirDados, id) => {
  if (!/^[0-9]{8}-[a-z0-9]{6}$/.test(String(id))) throw new Error('Pedido inválido.');
  return path.join(dirPedidos(dirDados), `${id}.json`);
};

function catalogo() {
  const s = JSON.parse(fs.readFileSync(path.join(RAIZ, 'templates', 'servicos.json'), 'utf8'));
  return Object.entries(s).filter(([k]) => !k.startsWith('_')).map(([id, v]) => ({ id, nome: v.nome, descricao: v.descricao, preco: v.preco, adicional: Boolean(v.adicional) }));
}

/** Serviços que o site oferece no formulário (sem preço). Os adicionais (Te Deixa Tranquila, Sai na Vassoura)
 * ficam de fora: são negociados na conversa com a Tayná. */
function servicosDoSite(idioma = 'pt') {
  return [...catalogo().filter((s) => !s.adicional).map(({ id, nome }) => ({ id, nome })), { id: NAO_SEI, nome: idiomas.t(idioma, 'site.nao_sei') }];
}

const r2 = (v) => Math.round(v * 100) / 100;

/** Orçamento prévio: pacote + profissionais adicionais (+50 convidados acima de 150) + 15% fora da Região Metropolitana. */
function calcular(servicoId, convidados, fora, idioma = 'pt') {
  const t = (k, p) => idiomas.t(idioma, k, p);
  const cat = catalogo().map((c) => ({ ...c, descricao: idiomas.descricaoServico(c.id, c.descricao, idioma) }));
  const sv = cat.find((s) => s.id === servicoId);
  if (!sv) return { referencia: cat.filter((c) => !c.adicional).map(({ nome, descricao, preco }) => ({ nome, descricao, preco })) };
  const n = Number(convidados) > BASE_CONVIDADOS ? Math.ceil((Number(convidados) - BASE_CONVIDADOS) / POR_PROFISSIONAL) : 0;
  const itens = [{ texto: t('orc.base', { nome: sv.nome, n: BASE_CONVIDADOS }), valor: sv.preco }];
  if (n) itens.push({ texto: t(n > 1 ? 'orc.profn' : 'orc.prof1', { n, c: convidados }), valor: n * VALOR_PROFISSIONAL });
  const subtotal = itens.reduce((s, i) => s + i.valor, 0);
  if (fora) itens.push({ texto: t('orc.dest'), valor: r2(subtotal * DESTINATION) });
  return { servico: { id: sv.id, nome: sv.nome, descricao: sv.descricao }, itens, total: r2(itens.reduce((s, i) => s + i.valor, 0)) };
}

const texto = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

/**
 * WhatsApp do casal no formato internacional "+<país><número>" (ex.: +5581996760320). Não bloqueia o pedido (o
 * orçamento vai por e-mail): sem "+" é Brasil; sem DDD (8–9 dígitos) assume 81 (Recife); curto demais vira vazio.
 */
function normalizarWhats(valor) {
  const t = String(valor || '').trim();
  let d = t.replace(/\D/g, '');
  if (!d) return '';
  if (t.startsWith('+') && !d.startsWith('55')) return d.length >= 8 && d.length <= 15 ? `+${d}` : '';
  d = d.replace(/^0+/, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 8 || d.length === 9) d = `81${d}`;
  return d.length === 10 || d.length === 11 ? `+55${d}` : '';
}

/** "+55 81 99676-0320" para mostrar (aceita também o formato antigo, só com DDD). */
function formatarTelefone(w) {
  w = String(w || '');
  let d = w.replace(/\D/g, '');
  if (!d) return '';
  if (!w.startsWith('+') || d.startsWith('55')) {
    if (w.startsWith('+')) d = d.slice(2);
    const dd = d.slice(0, 2); const r = d.slice(2); const corte = r.length === 8 ? 4 : 5;
    return `+55 ${dd} ${r.slice(0, corte)}-${r.slice(corte)}`;
  }
  return `+${d}`;
}

/** Confere e limpa o que veio do formulário. Lança Error com mensagem para o casal. */
function validar(d) {
  const idioma = idiomas.valido(d.idioma) || 'pt';
  const t = (k) => idiomas.t(idioma, k);
  const nome = texto(d.nome, 120);
  const email = texto(d.email, 160).toLowerCase();
  const whatsapp = normalizarWhats(d.whatsapp);
  const data = texto(d.data, 10);
  const convidados = Math.max(0, Math.min(5000, parseInt(d.convidados, 10) || 0));
  const cidade = texto(d.cidade, 120);
  const servico = texto(d.servico, 40) || NAO_SEI;
  const mensagem = texto(d.mensagem, 2000);
  if (nome.length < 3) throw new Error(t('site.nome'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error(t('site.email'));
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(t('site.data'));
  if (!servicosDoSite().some((s) => s.id === servico)) throw new Error(t('site.servico'));
  if (!d.consentimento) throw new Error(t('site.consentimento'));
  return { nome, email, whatsapp, data, convidados, cidade, servico, fora: Boolean(d.fora), mensagem, idioma };
}

function novoId() {
  const hoje = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${hoje.getFullYear()}${p(hoje.getMonth() + 1)}${p(hoje.getDate())}-${crypto.randomBytes(4).toString('hex').slice(0, 6)}`;
}

function salvar(dirDados, pedido) {
  fs.mkdirSync(dirPedidos(dirDados), { recursive: true });
  pedido.atualizado_em = new Date().toISOString();
  const arq = arquivoPedido(dirDados, pedido.id);
  fs.writeFileSync(`${arq}.tmp`, `${JSON.stringify(pedido, null, 2)}\n`);
  fs.renameSync(`${arq}.tmp`, arq);
  return pedido;
}

function carregar(dirDados, id) {
  try { return JSON.parse(fs.readFileSync(arquivoPedido(dirDados, id), 'utf8')); } catch { return null; }
}

function listar(dirDados) {
  let nomes = [];
  try { nomes = fs.readdirSync(dirPedidos(dirDados)).filter((n) => /^\d{8}-[a-z0-9]{6}\.json$/.test(n)); } catch { return []; }
  return nomes.map((n) => carregar(dirDados, n.replace(/\.json$/, ''))).filter(Boolean)
    .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
}

function criar(dirDados, dados, origem = {}) {
  const d = validar(dados);
  const pedido = {
    id: novoId(), token: crypto.randomBytes(18).toString('hex'), estado: 'novo', criado_em: new Date().toISOString(),
    ...d, orcamento: calcular(d.servico, d.convidados, d.fora, d.idioma), origem: { ip: origem.ip || '', navegador: texto(origem.navegador, 200) },
    emails: {}, agenda: null, historico: [],
  };
  return salvar(dirDados, pedido);
}

/** Só o que o site pode ver (nada de preço nem dados internos). */
function publico(p) {
  return { id: p.id, token: p.token, nome: p.nome, servico: p.orcamento.servico ? p.orcamento.servico.nome : idiomas.t(p.idioma, 'site.nao_sei'),
    agenda: p.agenda ? { inicio: p.agenda.inicio, estado: p.agenda.estado } : null };
}

// ---------------------------------------------------------------------------------------------------------------
// PDF do orçamento prévio
// ---------------------------------------------------------------------------------------------------------------
const TERRA = '#8B3F28';
const TINTA = '#3B2620';
const SUAVE = '#6B5A51';
const moeda = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dataBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };

function gerarPdf(pedido, empresa = {}) {
  const PDFDocument = require('pdfkit');
  const l = idiomas.valido(pedido.idioma) || 'pt';
  const t = (k, p) => idiomas.t(l, k, p);
  const moeda = (v) => idiomas.moeda(v, l);
  const dataBr = (iso) => idiomas.data(iso, l, l === 'pt' ? {} : { day: 'numeric', month: 'long', year: 'numeric' });
  return new Promise((ok, erro) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: `${t('pdf.titulo')} - ${pedido.nome}`, Author: empresa.nome_fantasia || 'Tayná Alves Assessoria' } });
    const partes = [];
    doc.on('data', (c) => partes.push(c));
    doc.on('end', () => ok(Buffer.concat(partes)));
    doc.on('error', erro);
    const L = doc.page.width;
    const largura = L - 112;

    // faixa da marca
    doc.rect(0, 0, L, 150).fill(TERRA);
    const logo = path.join(RAIZ, 'templates', 'marca', 'logo-branca.png');
    if (fs.existsSync(logo)) doc.image(logo, 56, 22, { height: 106 });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(t('pdf.titulo'), 56, 58, { width: largura, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor('#F3D3C2')
      .text(t('pdf.emitido', { d: dataBr(pedido.criado_em), n: VALIDADE_DIAS }), 56, 86, { width: largura, align: 'right' });

    doc.fillColor(TINTA).font('Helvetica-Bold').fontSize(16).text(pedido.nome, 56, 182);
    const linhas = [
      pedido.data ? [t('pdf.data'), dataBr(pedido.data)] : null,
      pedido.cidade ? [t('pdf.local'), pedido.cidade] : null,
      pedido.convidados ? [t('pdf.convidados'), String(pedido.convidados)] : null,
    ].filter(Boolean);
    let y = 210;
    doc.fontSize(10);
    linhas.forEach(([k, v]) => {
      doc.font('Helvetica').fillColor(SUAVE).text(k, 56, y, { width: 150 });
      doc.font('Helvetica').fillColor(TINTA).text(v, 206, y, { width: largura - 150 });
      y += 16;
    });
    y += 16;

    const o = pedido.orcamento;
    const tabela = (itens, titulo) => {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(TERRA).text(titulo.toUpperCase(), 56, y, { characterSpacing: 1 });
      y += 22;
      itens.forEach((it) => {
        doc.font('Helvetica').fontSize(11).fillColor(TINTA).text(it.texto, 56, y, { width: largura - 130 });
        const h = doc.heightOfString(it.texto, { width: largura - 130 });
        doc.text(moeda(it.valor), 56, y, { width: largura, align: 'right' });
        y += Math.max(h, 14) + 8;
        doc.moveTo(56, y - 4).lineTo(56 + largura, y - 4).lineWidth(0.5).strokeColor('#EADBCF').stroke();
      });
    };
    if (o.servico) {
      tabela(o.itens, t('pdf.servico'));
      y += 4;
      doc.font('Helvetica-Bold').fontSize(13).fillColor(TINTA).text(t('pdf.total'), 56, y);
      doc.fillColor(TERRA).text(moeda(o.total), 56, y, { width: largura, align: 'right' });
      y += 30;
      const incl = t('pdf.incluido', { d: o.servico.descricao });
      doc.font('Helvetica').fontSize(10).fillColor(SUAVE).text(incl, 56, y, { width: largura });
      y += doc.heightOfString(incl, { width: largura }) + 14;
    } else {
      tabela(o.referencia.map((r) => ({ texto: `${r.nome} — ${r.descricao}`, valor: r.preco })), t('pdf.referencia'));
      y += 10;
    }

    doc.rect(56, y, largura, 92).fill('#F3E6DC');
    doc.fillColor(TINTA).font('Helvetica-Bold').fontSize(10).text(t('pdf.seguimos'), 72, y + 12);
    doc.font('Helvetica').fontSize(10).fillColor(TINTA).text(t('pdf.seguimos_txt'), 72, y + 28, { width: largura - 32 });
    y += 112;

    doc.font('Helvetica').fontSize(9).fillColor(SUAVE).text(
      [empresa.razao_social || 'Tayná Alves Assessoria e Produção', empresa.cnpj ? `CNPJ ${empresa.cnpj}` : '',
        'WhatsApp (81) 99676-0320', empresa.email || 'contatotaynaassessoria@gmail.com', '@taynaalvesassessoria'].filter(Boolean).join('  ·  '),
      56, doc.page.height - 80, { width: largura, align: 'center' });
    doc.end();
  });
}

// ---------------------------------------------------------------------------------------------------------------
// E-mails
// ---------------------------------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WHATSAPP_TAYNA = '5581996760320';
const linkWhatsTayna = (pedido) => { const l = idiomas.valido(pedido.idioma) || 'pt';
  return `https://wa.me/${WHATSAPP_TAYNA}?text=${encodeURIComponent(idiomas.t(l, 'whats.tayna', { nome: pedido.nome, quando: pedido.data ? idiomas.t(l, 'whats.quando', { d: idiomas.data(pedido.data, l, l === 'pt' ? {} : undefined) }) : '' }))}`; };
const linkWhatsCasal = (pedido) => !pedido.whatsapp ? '' : `https://wa.me/${pedido.whatsapp.startsWith('+') ? pedido.whatsapp.slice(1) : `55${pedido.whatsapp}`}?text=${encodeURIComponent(`Olá, ${pedido.nome.split(/\s+(e|&)\s+/i)[0]}! Aqui é a Tayná, da Tayná Alves Assessoria. Recebi o seu pedido de orçamento pelo site.`)}`;
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Recife', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function moldura(conteudo, l = 'pt') {
  return `<div lang="${idiomas.LOCALE[l] || 'pt-BR'}" style="font-family:Arial,Helvetica,sans-serif;color:${TINTA};max-width:560px;margin:0 auto">
<div style="background:${TERRA};color:#fff;padding:22px 26px;font-size:20px;font-family:Georgia,serif">Tayná Alves Assessoria e Produção</div>
<div style="padding:24px 26px;line-height:1.6;font-size:15px;background:#FBF6F1">${conteudo}</div>
<div style="padding:12px 26px;font-size:12px;color:${SUAVE}">WhatsApp (81) 99676-0320 · @taynaalvesassessoria</div></div>`;
}

function emailCasal(pedido) {
  const l = idiomas.valido(pedido.idioma) || 'pt';
  const t = (k, p) => idiomas.t(l, k, p);
  const servico = pedido.orcamento.servico ? pedido.orcamento.servico.nome : t('mail.servicos');
  const quando = pedido.data ? t('mail.quando', { d: idiomas.data(pedido.data, l, l === 'pt' ? {} : undefined) }) : '';
  const html = moldura(`<p style="font-size:22px;font-family:Georgia,serif;color:${TERRA};margin:0 0 8px">${t('mail.ola', { nome: esc(pedido.nome) })}</p>
<p>${t('mail.alegria', { quando, onde: pedido.cidade ? `, ${esc(pedido.cidade)}` : '' })}</p>
<p>${t('mail.pdf', { s: esc(servico) })}</p>
<p style="margin:22px 0"><a href="${linkWhatsTayna(pedido)}" style="background:${TERRA};color:#fff;padding:12px 20px;border-radius:24px;text-decoration:none;font-weight:bold">${t('mail.botao')}</a></p>
<p>${t('mail.carinho')}</p>`, l);
  return { para: pedido.email, assunto: t('mail.assunto', { s: servico }), html, responder_para: '',
    texto: t('mail.texto', { nome: pedido.nome, s: servico, link: linkWhatsTayna(pedido) }) };
}

function emailAlerta(pedido, tipo, urlLotus) {
  const o = pedido.orcamento;
  const agenda = pedido.agenda && pedido.agenda.inicio ? quando(pedido.agenda.inicio) : '';
  const titulo = tipo === 'agenda' ? `Solicitação de agenda: ${pedido.nome} — ${agenda}` : `Novo pedido de orçamento: ${pedido.nome}`;
  const linha = (k, v) => (v ? `<tr><td style="color:${SUAVE};padding:3px 12px 3px 0;vertical-align:top">${k}</td><td>${v}</td></tr>` : '');
  const html = moldura(`<p style="display:inline-block;background:#FDEBD9;color:#8A3B12;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;margin:0">${tipo === 'agenda' ? 'Solicitação de agenda · fechamento' : 'Novo pedido pelo site'}</p>
<p style="font-size:18px;font-weight:bold;margin:10px 0">${esc(pedido.nome)}${tipo === 'agenda' ? ' querem conversar para fechar' : ''}</p>
<table style="font-size:14px;border-collapse:collapse">
${linha('Horário pedido', agenda ? `<b>${esc(agenda)}</b>` : '')}
${linha('Casamento', [dataBr(pedido.data), esc(pedido.cidade), pedido.convidados ? `${pedido.convidados} convidados` : ''].filter(Boolean).join(' · '))}
${linha('Serviço', esc(o.servico ? o.servico.nome : 'Ainda não sei'))}
${linha('Orçamento prévio', o.total ? moeda(o.total) : '')}
${linha('WhatsApp', pedido.whatsapp ? `<a href="${linkWhatsCasal(pedido)}">${esc(formatarTelefone(pedido.whatsapp))}</a>` : 'não informado')}
${linha('E-mail', esc(pedido.email))}
${linha('Idioma do casal', pedido.idioma && pedido.idioma !== 'pt' ? `<b>${esc(idiomas.NOMES[pedido.idioma] || pedido.idioma)}</b> (o orçamento foi enviado neste idioma)` : '')}
${linha('Mensagem', pedido.mensagem ? `"${esc(pedido.mensagem)}"` : '')}
</table>
<p style="margin:22px 0 0"><a href="${urlLotus}/pedidos?id=${pedido.id}" style="background:${TERRA};color:#fff;padding:12px 20px;border-radius:24px;text-decoration:none;font-weight:bold">${tipo === 'agenda' ? 'Confirmar no Lotus' : 'Abrir no Lotus'}</a></p>`);
  return { assunto: titulo, html, texto: `${titulo}. Abra no Lotus: ${urlLotus}/pedidos?id=${pedido.id}` };
}

/** Rótulo do horário para o site (fuso do Recife). */
const rotuloHorario = (iso, idioma = 'pt') => {
  const l = idiomas.valido(idioma) || 'pt';
  if (l === 'pt') return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Recife', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\.,?/g, '').replace(',', ' ·');
  const d = new Date(iso);
  const dia = d.toLocaleDateString(idiomas.LOCALE[l], { timeZone: 'America/Recife', weekday: 'short', day: 'numeric', month: 'short' });
  const hora = d.toLocaleTimeString(idiomas.LOCALE[l], { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora} (Recife)`.replace(/[\u202f\u00a0]/g, ' ');
};

module.exports = {
  ESTADOS, NAO_SEI, catalogo, servicosDoSite, calcular, validar, criar, carregar, salvar, listar, publico,
  gerarPdf, emailCasal, emailAlerta, linkWhatsTayna, linkWhatsCasal, normalizarWhats, formatarTelefone, rotuloHorario, dataBr, moeda,
};
