'use strict';

/**
 * Checklist do EVENTO (uso no dia do casamento) — modelo do roteiro do casal Hanna & Ivan.
 *
 * Monta, a partir do contrato e dos dados do dia (src/evento.js: fornecedores com telefone e chegada,
 * atividades com horário), o documento templates/checklist_evento.docx. Só é gerado quando não há
 * pendências (tudo preenchido no aplicativo).
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { parseData } = require('./parser');
const { ROTULO_CATEGORIA, CATEGORIAS, linhaDoTempo, exibirHora, pendencias, itensPreenchidos } = require('./evento');

const RAIZ = path.resolve(__dirname, '..');
const MODELO = path.join(RAIZ, 'templates', 'checklist_evento.docx');

const dataBr = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ordemCategoria = Object.fromEntries(CATEGORIAS.map((c, i) => [c.id, i]));
const minutos = (h) => { const m = /^(\d{2}):(\d{2})$/.exec(h || ''); if (!m) return 9999; const t = Number(m[1]) * 60 + Number(m[2]); return t < 300 ? t + 1440 : t; };

function servicoTxt(f) {
  const cat = ROTULO_CATEGORIA[f.categoria] || '';
  return f.servico ? f.servico : cat;
}
function contatoTxt(f) {
  const partes = [f.responsavel && `resp.: ${f.responsavel}`, f.telefone].filter(Boolean);
  return partes.length ? `  ·  ${partes.join(' · ')}` : '';
}
function chegadaTxt(f) {
  if (f.dia === 'nao' || !f.chegada) return '—';
  const h = exibirHora(f.chegada);
  return f.dia === 'vespera' ? `Véspera ${h}` : f.dia === 'posterior' ? `Outro dia ${h}` : h;
}

/** Dados do checklist do evento (também usados no painel do dia e na prévia). */
function montarChecklistEvento(contrato, evento, { destination = true } = {}) {
  let data = null;
  try { data = contrato.evento_data ? parseData(contrato.evento_data) : null; } catch { data = null; }
  const i = evento.info || {};
  const nomes = String(contrato.evento_nomes || '').replace(/\s+/g, ' ').trim() || 'Noiva e Noivo';
  const tempo = linhaDoTempo(evento);
  const inicioRecepcao = tempo.find((t) => /in[ií]cio da recep/i.test(t.texto));
  const forn = (evento.fornecedores || []).slice()
    .sort((a, b) => (ordemCategoria[a.categoria] ?? 99) - (ordemCategoria[b.categoria] ?? 99) || minutos(a.chegada) - minutos(b.chegada));
  const lista = (dia) => forn.filter((f) => f.dia === dia && f.chegada)
    .sort((a, b) => minutos(a.chegada) - minutos(b.chegada))
    .map((f) => ({ chegada: exibirHora(f.chegada), servico_txt: servicoTxt(f), nome: f.nome, contato_txt: contatoTxt(f) }));
  const conv = [
    contrato.convidados && `${contrato.convidados} convidados`,
    (contrato.padrinhos || contrato.casais_padrinhos) && `${contrato.padrinhos || contrato.casais_padrinhos} casais de padrinhos`,
    contrato.criancas && `${contrato.criancas} crianças`,
  ].filter(Boolean).join(' · ');

  const montagemVespera = lista('vespera');
  const posterior = lista('posterior');
  return {
    destination,
    titulo_nomes: nomes,
    numero_os: contrato.numero_os || '—',
    data_extenso: data ? data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Data a definir',
    data_evento: data ? dataBr(data) : 'dia do evento',
    data_vespera: data ? dataBr(somarDias(data, -1)) : 'véspera',
    convidados_txt: conv || 'convidados a definir',
    cerimonia_txt: `${exibirHora(i.hora_cerimonia)} · ${i.local_cerimonia || ''}`,
    recepcao_txt: `${inicioRecepcao ? `${inicioRecepcao.hora ? exibirHora(inicioRecepcao.hora) : ''} · ` : ''}${i.local_recepcao || ''}`,
    responsavel_montagem: i.responsavel_montagem || 'Tayná Alves',
    telefone_assessoria: i.telefone_assessoria || '',
    contato_emergencia: i.contato_emergencia || '',
    inicio_montagem_vespera: i.inicio_montagem_vespera ? exibirHora(i.inicio_montagem_vespera) : '',
    inicio_montagem_dia: i.inicio_montagem_dia ? exibirHora(i.inicio_montagem_dia) : '',
    tem_vespera: montagemVespera.length > 0,
    montagem_vespera: montagemVespera,
    montagem_dia: lista('evento'),
    linha_tempo: tempo.map((t) => ({
      hora: exibirHora(t.hora),
      texto: t.texto,
      extra: [t.responsavel && `  ·  resp.: ${t.responsavel}`, t.tipo === 'chegada' && t.telefone ? `  ·  ${t.telefone}` : '',
        t.tipo !== 'chegada' && t.fornecedor ? `  ·  ${t.fornecedor}` : ''].filter(Boolean).join(''),
      detalhes: t.detalhes || [],
      tipo: t.tipo,
      telefone: t.telefone || '',
      responsavel: t.responsavel || '',
      fornecedor: t.fornecedor || '',
    })),
    fornecedores: forn.map((f) => ({
      servico_txt: servicoTxt(f), categoria: ROTULO_CATEGORIA[f.categoria] || 'Outros', nome: f.nome,
      responsavel: f.responsavel || '—', telefone: f.telefone || '—', chegada_txt: chegadaTxt(f), observacao: f.observacao || '',
    })),
    cerimonia_itens: itensPreenchidos('cerimonia', evento.cerimonia),
    festa_itens: itensPreenchidos('festa', evento.festa),
    atracoes: (evento.atracoes || []).slice().sort((a, b) => minutos(a.inicio) - minutos(b.inicio)).map((a) => ({
      nome: a.nome, inicio: exibirHora(a.inicio), fim: exibirHora(a.fim), obs_txt: a.obs ? `  ·  ${a.obs}` : '',
    })),
    tem_posterior: posterior.length > 0,
    posterior,
    observacoes: i.observacoes || '',
    gerado_em: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  };
}

function nomeArquivo(prefixo, nomes, ext, sufixo = '') {
  return `${prefixo} - ${String(nomes).replace(/[\\/:*?"<>|]/g, '').trim()}${sufixo}.${ext}`;
}
function carimbo() {
  const d = new Date(); const p = (x) => String(x).padStart(2, '0');
  return ` (${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}h${p(d.getMinutes())})`;
}

/**
 * Grava o checklist do evento (.docx) e o painel do dia (.html) na pasta do casal.
 * Recusa se houver pendências. Nunca sobrescreve: com novaVersao, grava cópias com data e hora.
 */
function gravarChecklistEvento(contrato, evento, pastaCasal, { novaVersao = false, destination = true } = {}) {
  const falta = pendencias(evento);
  if (falta.length) {
    const e = new Error(`Preencha antes de gerar: ${falta.slice(0, 8).join('; ')}${falta.length > 8 ? ` (+${falta.length - 8})` : ''}`);
    e.pendencias = falta;
    throw e;
  }
  const dados = montarChecklistEvento(contrato, evento, { destination });
  fs.mkdirSync(pastaCasal, { recursive: true });
  let docx = path.join(pastaCasal, nomeArquivo('CHECKLIST DO EVENTO', dados.titulo_nomes, 'docx'));
  let html = path.join(pastaCasal, nomeArquivo('PAINEL DO EVENTO', dados.titulo_nomes, 'html'));
  if (fs.existsSync(docx) || fs.existsSync(html)) {
    if (!novaVersao) return { existe: true, arquivo: fs.existsSync(docx) ? docx : html };
    const c = carimbo();
    docx = path.join(pastaCasal, nomeArquivo('CHECKLIST DO EVENTO', dados.titulo_nomes, 'docx', c));
    html = path.join(pastaCasal, nomeArquivo('PAINEL DO EVENTO', dados.titulo_nomes, 'html', c));
  }
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(MODELO)), { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  doc.render(dados);
  fs.writeFileSync(docx, doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const { gerarPainel } = require('./painel');
  fs.writeFileSync(html, gerarPainel(dados));
  return { existe: false, arquivo: docx, arquivos: [docx, html] };
}

module.exports = { montarChecklistEvento, gravarChecklistEvento };
