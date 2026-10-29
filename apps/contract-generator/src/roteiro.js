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
const MODELO_PADRAO = path.join(RAIZ, 'templates', 'checklist_evento_padrao.docx');
const { linhasServicos } = require('./eventoPadrao');

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
  const vertente = destination ? 'destination' : 'padrao';
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
  const qConv = i.convidados || contrato.convidados;
  const qPad = i.padrinhos || contrato.padrinhos || contrato.casais_padrinhos;
  const qCri = i.criancas || contrato.criancas;
  const conv = [
    qConv && `${qConv} convidados`,
    qPad && `${qPad} casais de padrinhos`,
    qCri && `${qCri} crianças`,
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
    cerimonia_itens: itensPreenchidos('cerimonia', evento.cerimonia, vertente),
    festa_itens: itensPreenchidos('festa', evento.festa, vertente),
    ...(destination ? {} : dadosPadrao(contrato, evento, tempo, data)),
    atracoes: (evento.atracoes || []).slice().sort((a, b) => minutos(a.inicio) - minutos(b.inicio)).map((a) => ({
      nome: a.nome, inicio: exibirHora(a.inicio), fim: exibirHora(a.fim), obs_txt: a.obs ? `  ·  ${a.obs}` : '',
    })),
    tem_posterior: posterior.length > 0,
    posterior,
    observacoes: i.observacoes || '',
    gerado_em: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  };
}

const sn = (v) => String(v || '').trim();
const achatar = (prefixo, obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${prefixo}_${k}`, v]));

/** Dados extras do modelo sem destination (CHECK LIST Mariana & Marco). */
function dadosPadrao(contrato, evento, tempo, data) {
  const i = evento.info || {};
  const c = evento.casal || {};
  const fam = evento.familia || {};
  const pessoa = (x = {}) => ({ nome: sn(x.nome), pais: sn(x.pais), telefone: sn(x.telefone), email: sn(x.email) });
  const familia = (x = {}) => ({ pais_separados: sn(x.pais_separados), irmaos: sn(x.irmaos), avos: sn(x.avos), obs: sn(x.obs) });
  const qConv = i.convidados || contrato.convidados;
  return {
    padrao: true,
    data_curta: data ? dataBr(data) : 'a definir',
    horario_convite: exibirHora(i.hora_cerimonia),
    previsao_atraso: sn(i.previsao_atraso),
    chegada_padrinhos: exibirHora(i.chegada_padrinhos) || sn(i.chegada_padrinhos),
    quantidade_convidados: sn(qConv),
    ...achatar('noiva', pessoa(c.noiva)), ...achatar('noivo', pessoa(c.noivo)),
    ...achatar('familia_noiva', familia(fam.noiva)), ...achatar('familia_noivo', familia(fam.noivo)),
    tem_atracoes: (evento.atracoes || []).length > 0,
    tem_padrinhos: (evento.padrinhos_lista || []).some((x) => x.tipo !== 'madrinha'),
    tem_madrinhas: (evento.padrinhos_lista || []).some((x) => x.tipo === 'madrinha'),
    tem_montagem_dia: (evento.fornecedores || []).some((f) => f.dia === 'evento' && f.chegada),
    local_cerimonia: sn(i.local_cerimonia), local_recepcao: sn(i.local_recepcao),
    cerimonia_responsavel: sn(i.cerimonia_responsavel), cerimonia_contato: sn(i.cerimonia_contato),
    recepcao_responsavel: sn(i.recepcao_responsavel), recepcao_contato: sn(i.recepcao_contato),
    tipo_cerimonia: sn((evento.cerimonia || {}).tipo), fe: sn((evento.cerimonia || {}).fe),
    servicos: linhasServicos(evento).filter((l) => sn(l.fornecedor) || sn(l.detalhes)).map((l) => ({
      servico: l.servico, fornecedor: sn(l.fornecedor), responsavel: sn(l.responsavel), detalhes: sn(l.detalhes),
      contato: sn(l.contato),
    })),
    cortejo: (evento.cortejo || []).map((x, n) => ({ n: n + 1, entrada: sn(x.entrada), musica: sn(x.musica), quem: sn(x.quem) })),
    criancas_cortejo: (evento.criancas_cortejo || []).map((x) => ({
      nome: sn(x.nome), funcao: sn(x.funcao), idade: sn(x.idade), responsavel: sn(x.responsavel),
    })),
    tem_criancas: (evento.criancas_cortejo || []).length > 0,
    padrinhos: (evento.padrinhos_lista || []).filter((x) => x.tipo !== 'madrinha').map((x) => ({ nome: sn(x.nome), contato: sn(x.contato), obs: sn(x.obs) })),
    madrinhas: (evento.padrinhos_lista || []).filter((x) => x.tipo === 'madrinha').map((x) => ({ nome: sn(x.nome), contato: sn(x.contato), obs: sn(x.obs) })),
    notas_cerimonial: sn(i.notas_cerimonial),
    // cronograma Horário | Serviço | Duração | Objetos (sem as chegadas dos fornecedores, que vão na montagem)
    cronograma: tempo.filter((t) => t.tipo !== 'chegada').map((t) => ({
      hora: exibirHora(t.hora), servico: t.tipo === 'atracao' ? t.nome : t.texto, duracao: sn(t.duracao),
      objetos: [...(t.detalhes || []), t.responsavel && `Resp.: ${t.responsavel}`].filter(Boolean).join('\n'),
    })),
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
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(destination ? MODELO : MODELO_PADRAO)), { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  doc.render(dados);
  fs.writeFileSync(docx, doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const { gerarPainel } = require('./painel');
  fs.writeFileSync(html, gerarPainel(dados));
  return { existe: false, arquivo: docx, arquivos: [docx, html] };
}

module.exports = { montarChecklistEvento, gravarChecklistEvento };
