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
  return Object.entries(s).filter(([k]) => !k.startsWith('_')).map(([id, v]) => ({ id, nome: v.nome, descricao: v.descricao, preco: v.preco }));
}

/** Serviços que o site oferece no formulário (sem preço). */
function servicosDoSite() {
  return [...catalogo().map(({ id, nome }) => ({ id, nome })), { id: NAO_SEI, nome: 'Ainda não sei' }];
}

const r2 = (v) => Math.round(v * 100) / 100;

/** Orçamento prévio: pacote + profissionais adicionais (+50 convidados acima de 150) + 15% fora da Região Metropolitana. */
function calcular(servicoId, convidados, fora) {
  const cat = catalogo();
  const sv = cat.find((s) => s.id === servicoId);
  if (!sv) return { referencia: cat.map(({ nome, descricao, preco }) => ({ nome, descricao, preco })) };
  const n = Number(convidados) > BASE_CONVIDADOS ? Math.ceil((Number(convidados) - BASE_CONVIDADOS) / POR_PROFISSIONAL) : 0;
  const itens = [{ texto: `${sv.nome} (até ${BASE_CONVIDADOS} convidados)`, valor: sv.preco }];
  if (n) itens.push({ texto: `${n} profissional${n > 1 ? 'is' : ''} adiciona${n > 1 ? 'is' : 'l'} (${convidados} convidados)`, valor: n * VALOR_PROFISSIONAL });
  const subtotal = itens.reduce((s, i) => s + i.valor, 0);
  if (fora) itens.push({ texto: 'Destination — fora da Região Metropolitana do Recife (+15%)', valor: r2(subtotal * DESTINATION) });
  return { servico: { id: sv.id, nome: sv.nome, descricao: sv.descricao }, itens, total: r2(itens.reduce((s, i) => s + i.valor, 0)) };
}

const texto = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

/** Confere e limpa o que veio do formulário. Lança Error com mensagem para o casal. */
function validar(d) {
  const nome = texto(d.nome, 120);
  const email = texto(d.email, 160).toLowerCase();
  const whatsapp = String(d.whatsapp || '').replace(/\D/g, '').slice(0, 13);
  const data = texto(d.data, 10);
  const convidados = Math.max(0, Math.min(5000, parseInt(d.convidados, 10) || 0));
  const cidade = texto(d.cidade, 120);
  const servico = texto(d.servico, 40) || NAO_SEI;
  const mensagem = texto(d.mensagem, 2000);
  if (nome.length < 3) throw new Error('Informe o nome do casal.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (whatsapp.length < 10) throw new Error('Informe o WhatsApp com DDD.');
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data do casamento inválida.');
  if (!servicosDoSite().some((s) => s.id === servico)) throw new Error('Escolha um serviço da lista.');
  if (!d.consentimento) throw new Error('Para enviar o orçamento por e-mail, marque a autorização.');
  return { nome, email, whatsapp, data, convidados, cidade, servico, fora: Boolean(d.fora), mensagem };
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
    ...d, orcamento: calcular(d.servico, d.convidados, d.fora), origem: { ip: origem.ip || '', navegador: texto(origem.navegador, 200) },
    emails: {}, agenda: null, historico: [],
  };
  return salvar(dirDados, pedido);
}

/** Só o que o site pode ver (nada de preço nem dados internos). */
function publico(p) {
  return { id: p.id, token: p.token, nome: p.nome, servico: p.orcamento.servico ? p.orcamento.servico.nome : 'Ainda não sei',
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
  return new Promise((ok, erro) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: `Orçamento prévio - ${pedido.nome}`, Author: empresa.nome_fantasia || 'Tayná Alves Assessoria' } });
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
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('Orçamento prévio', 56, 58, { width: largura, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor('#F3D3C2')
      .text(`Emitido em ${dataBr(pedido.criado_em)} · válido por ${VALIDADE_DIAS} dias`, 56, 86, { width: largura, align: 'right' });

    doc.fillColor(TINTA).font('Helvetica-Bold').fontSize(16).text(pedido.nome, 56, 182);
    const linhas = [
      pedido.data ? ['Data do casamento', dataBr(pedido.data)] : null,
      pedido.cidade ? ['Local', pedido.cidade] : null,
      pedido.convidados ? ['Convidados (aprox.)', String(pedido.convidados)] : null,
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
      tabela(o.itens, 'Serviço escolhido');
      y += 4;
      doc.font('Helvetica-Bold').fontSize(13).fillColor(TINTA).text('Total estimado', 56, y);
      doc.fillColor(TERRA).text(moeda(o.total), 56, y, { width: largura, align: 'right' });
      y += 30;
      doc.font('Helvetica').fontSize(10).fillColor(SUAVE).text(`O que está incluído: ${o.servico.descricao}.`, 56, y, { width: largura });
      y += doc.heightOfString(`O que está incluído: ${o.servico.descricao}.`, { width: largura }) + 14;
    } else {
      tabela(o.referencia.map((r) => ({ texto: `${r.nome} — ${r.descricao}`, valor: r.preco })), 'Serviços e valores de referência');
      y += 10;
    }

    doc.rect(56, y, largura, 92).fill('#F3E6DC');
    doc.fillColor(TINTA).font('Helvetica-Bold').fontSize(10).text('Como seguimos', 72, y + 12);
    doc.font('Helvetica').fontSize(10).fillColor(TINTA).text(
      'Este é um orçamento prévio, com valores de referência (equipe de 2 profissionais, até 150 convidados). '
      + 'A proposta final é fechada na conversa com a Tayná. A data fica reservada com o contrato assinado e 30% de entrada; '
      + 'o restante é combinado diretamente com vocês.', 72, y + 28, { width: largura - 32 });
    y += 112;

    doc.font('Helvetica').fontSize(9).fillColor(SUAVE).text(
      [empresa.razao_social || 'Tayná Alves Assessoria e Produção', empresa.cnpj ? `CNPJ ${empresa.cnpj}` : '',
        'WhatsApp (81) 99780-1345', empresa.email || 'contatotaynaassessoria@gmail.com', '@taynaalvesassessoria'].filter(Boolean).join('  ·  '),
      56, doc.page.height - 80, { width: largura, align: 'center' });
    doc.end();
  });
}

// ---------------------------------------------------------------------------------------------------------------
// E-mails
// ---------------------------------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WHATSAPP_TAYNA = '5581997801345';
const linkWhatsTayna = (pedido) => `https://wa.me/${WHATSAPP_TAYNA}?text=${encodeURIComponent(`Olá, Tayná! Sou ${pedido.nome}, pedi um orçamento pelo site${pedido.data ? ` (casamento em ${dataBr(pedido.data)})` : ''} e gostaria de conversar.`)}`;
const linkWhatsCasal = (pedido) => `https://wa.me/${pedido.whatsapp.length <= 11 ? `55${pedido.whatsapp}` : pedido.whatsapp}?text=${encodeURIComponent(`Olá, ${pedido.nome.split(/\s+(e|&)\s+/i)[0]}! Aqui é a Tayná, da Tayná Alves Assessoria. Recebi o seu pedido de orçamento pelo site.`)}`;
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Recife', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function moldura(conteudo) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:${TINTA};max-width:560px;margin:0 auto">
<div style="background:${TERRA};color:#fff;padding:22px 26px;font-size:20px;font-family:Georgia,serif">Tayná Alves Assessoria e Produção</div>
<div style="padding:24px 26px;line-height:1.6;font-size:15px;background:#FBF6F1">${conteudo}</div>
<div style="padding:12px 26px;font-size:12px;color:${SUAVE}">WhatsApp (81) 99780-1345 · @taynaalvesassessoria</div></div>`;
}

function emailCasal(pedido) {
  const servico = pedido.orcamento.servico ? pedido.orcamento.servico.nome : 'os serviços da assessoria';
  const html = moldura(`<p style="font-size:22px;font-family:Georgia,serif;color:${TERRA};margin:0 0 8px">Olá, ${esc(pedido.nome)}!</p>
<p>Que alegria receber o pedido de vocês${pedido.data ? ` para o casamento em <b>${dataBr(pedido.data)}</b>` : ''}${pedido.cidade ? `, ${esc(pedido.cidade)}` : ''}.</p>
<p>O <b>orçamento prévio</b> de ${esc(servico)} está no PDF anexo. A proposta final e a reserva da data a Tayná fecha com vocês numa conversa.</p>
<p style="margin:22px 0"><a href="${linkWhatsTayna(pedido)}" style="background:${TERRA};color:#fff;padding:12px 20px;border-radius:24px;text-decoration:none;font-weight:bold">Conversar com a Tayná no WhatsApp</a></p>
<p>Com carinho,<br>Tay</p>`);
  return { para: pedido.email, assunto: `Seu orçamento prévio — ${servico}`, html, responder_para: '',
    texto: `Olá, ${pedido.nome}! O orçamento prévio de ${servico} está no PDF anexo. Para conversar com a Tayná: ${linkWhatsTayna(pedido)}` };
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
${linha('WhatsApp', `<a href="${linkWhatsCasal(pedido)}">${esc(pedido.whatsapp)}</a>`)}
${linha('E-mail', esc(pedido.email))}
${linha('Mensagem', pedido.mensagem ? `"${esc(pedido.mensagem)}"` : '')}
</table>
<p style="margin:22px 0 0"><a href="${urlLotus}/pedidos?id=${pedido.id}" style="background:${TERRA};color:#fff;padding:12px 20px;border-radius:24px;text-decoration:none;font-weight:bold">${tipo === 'agenda' ? 'Confirmar no Lotus' : 'Abrir no Lotus'}</a></p>`);
  return { assunto: titulo, html, texto: `${titulo}. Abra no Lotus: ${urlLotus}/pedidos?id=${pedido.id}` };
}

/** Rótulo do horário para o site (fuso do Recife). */
const rotuloHorario = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Recife', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  .replace(/\.,?/g, '').replace(',', ' ·');

module.exports = {
  ESTADOS, NAO_SEI, catalogo, servicosDoSite, calcular, validar, criar, carregar, salvar, listar, publico,
  gerarPdf, emailCasal, emailAlerta, linkWhatsTayna, linkWhatsCasal, rotuloHorario, dataBr, moeda,
};
