'use strict';

/**
 * Planilha de assessoria do casal → dados do dia do evento.
 *
 * Fontes (a mais recente vale):
 *  - .xlsx na pasta do casal (lido direto);
 *  - cópia sincronizada de uma planilha do Google Planilhas, gravada em
 *    _DADOS DO SISTEMA/planilhas/<contrato>.json  (formato abaixo). O app não acessa o Google;
 *    a cópia é feita pela sincronização (Claude + conector do Google) e o app só lê o arquivo.
 *
 *  { "fonte": { "tipo": "google", "id": "...", "titulo": "...", "url": "...", "modificada_em": "..." },
 *    "lido_em": "2026-10-28T23:00:00Z",
 *    "info": { "convidados": "100", "padrinhos": "10", "criancas": "03",
 *              "local": "Casa de Chá", "horario": "16h", "data": "31/10/2026" },
 *    "tarefas": [ { "item": "Contratar Buffet", "status": "FINALIZADO", "obs": "La Place", "fornecedor": "" } ],
 *    "fornecedores": [ { "nome": "La Place", "descricao": "Buffet\nDuração 07h", "pix": "..." } ] }
 *
 * O que vem da planilha só PREENCHE o que está vazio: o que já foi editado no app é mantido.
 */
const fs = require('fs');
const path = require('path');
const { lerAba } = require('./xlsxLeitor');

const chave = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
const limpa = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// "Fornecedor" que na verdade é o nome do serviço (ex.: "Vestido" | "Cassia Gonçalvez")
const SERVICO_GENERICO = new RegExp(`^(${[
  'foto', 'fotos', 'fotografia', 'foto e video', 'foto e filme', 'filme', 'video', 'vestido', 'vestido noiva', 'vestido da noiva',
  'banda', 'banda \\d+', 'banda cerimonia', 'dj', 'gerador', 'gerador de energia', 'bolo', 'bolo de rolo', 'doces', 'seguranca',
  'seg limpeza', 'limpeza', 'cervejas?', 'bebidas', 'drinks?', 'chopp', 'sandalias?', 'sapato( da)? noiva', 'terno( do)? noivo',
  'bem casados?', 'celebrante', 'decoracao', 'buffet', 'local', 'igreja', 'cadeiras', 'mobilia', 'id visual', 'musica( da)? cerimonia',
  'lembrancas( de padrinhos)?', 'maquiagem', 'make', 'cabelo', 'cabelo e make', 'som', 'iluminacao', 'orquestra', 'convites?',
].join('|')})$`);

// sem horário no dia (só contato): compras, trajes, papelaria...
const SO_CONTATO = /vestido|sapato|\bterno\b|\btraje|sand[aá]lia|alian[cç]a|caixas? (de )?padrinho|lembran[cç]as? de padrinho|forminha|acess[oó]rio|id visual|identidade visual|convite|papelaria|massag|booking|bon[eé]s|ecobag/i;

const IGNORAR = /tayn[aá]\s+alves|^outras?\s+desp|^degusta|^total\b|\{\{/i;

/** Celular brasileiro em um texto (DDD + 9 + 8 dígitos), formatado. */
function acharCelular(texto) {
  const m = /(?<!\d)(?:\+?55\s*)?\(?([1-9][1-9])\)?\s*(9\s?\d{4})[\s.-]?(\d{4})(?!\d)/.exec(String(texto || ''));
  if (!m) return '';
  return `(${m[1]}) ${m[2].replace(/\s/g, '')}-${m[3]}`;
}

/** Horário escrito de qualquer jeito na planilha ("16h", "15h30", "1530h", "16:00h") → "HH:MM". */
function lerHorario(t) {
  const s = String(t || '').trim();
  let m = /^(\d{1,2})(\d{2})\s*h?$/i.exec(s);
  if (!m) m = /(\d{1,2})\s*[h:]\s*(\d{2})?/i.exec(s);
  if (!m) return '';
  const h = Number(m[1]); const min = Number(m[2] || 0);
  if (h > 23 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const aDefinir = (s) => !limpa(s) || /^(a|à)\s*definir$/i.test(limpa(s));

/**
 * Linhas cruas do FINANCEIRO ({nome, descricao, pix}) → fornecedores para o checklist:
 * { nome, servico, observacao, telefone, telefone_pix, dia }
 */
function normalizarFornecedores(cruas) {
  const lista = [];
  for (const r of cruas || []) {
    let nome = limpa(r.nome);
    const linhasDesc = String(r.descricao || '').replace(/\r/g, '').split('\n').map(limpa).filter(Boolean);
    if (!nome || /^\d+$/.test(nome) || /^r\$/i.test(nome)) continue;
    if (/^total\b/i.test(nome)) break;
    if (IGNORAR.test(nome)) continue;

    let servico;
    let resto;
    const primeira = linhasDesc[0] || '';
    const palavrasServico = chave(nome).split(' ').filter((w) => w.length > 3);
    const pareceNome = primeira && primeira.length <= 30 && primeira.split(' ').length <= 4 && !/^\d/.test(primeira)
      && !/^(comprad[oa]|pago|alugad[oa]|ok|sim)$/i.test(primeira)
      && !palavrasServico.some((w) => chave(primeira).includes(w));
    if (SERVICO_GENERICO.test(chave(nome)) && pareceNome) {
      // coluna Fornecedor tem o serviço e a descrição tem o nome
      servico = nome;
      nome = /^(igreja|capela|par[oó]quia)$/i.test(chave(servico)) ? `${servico} ${primeira}` : primeira;
      resto = linhasDesc.slice(1);
    } else {
      const corte = primeira.split(/[.;]/)[0].trim();
      servico = corte || (SERVICO_GENERICO.test(chave(nome)) ? nome : '');
      resto = [primeira.slice(corte.length).replace(/^[.;\s]+/, ''), ...linhasDesc.slice(1)].filter(Boolean);
    }
    if (servico.length > 60) {
      // corta em "/" ou "," (ou no último espaço) antes de 60 caracteres; o resto vai para a observação
      const partes = servico.split(/(?<=[/,])\s*/);
      let curto = '';
      while (partes.length && (curto + partes[0]).length <= 60) curto += (curto && !/[/,]$/.test(curto) ? ' ' : (curto ? ' ' : '')) + partes.shift();
      if (!curto) { const i = servico.lastIndexOf(' ', 60); curto = servico.slice(0, i > 20 ? i : 60); partes.splice(0, partes.length, servico.slice(curto.length)); }
      resto.unshift(partes.join(' ').trim());
      servico = curto.replace(/[/,\s]+$/, '');
    }
    let observacao = resto.map((x) => x.replace(/^[-–•*\s]+/, '')).filter(Boolean).join(' · ');
    if (observacao.length > 220) observacao = `${observacao.slice(0, 217)}…`;

    let telefone = acharCelular(r.descricao);
    let telefonePix = false;
    if (!telefone && r.pix) { telefone = acharCelular(r.pix); telefonePix = !!telefone; }

    lista.push({
      nome, servico, observacao, telefone, telefone_pix: telefonePix,
      dia: SO_CONTATO.test(`${nome} ${servico}`) ? 'nao' : '',
    });
  }
  return lista;
}

/** Bloco INFORMAÇÕES da aba ASSESSORIA, a partir de linhas (arrays de células). */
function infoDeLinhas(linhas) {
  const info = {};
  const valorApos = (l, re) => {
    const i = l.findIndex((c) => re.test(c || ''));
    if (i < 0) return undefined;
    const dentro = String(l[i]).split(':').slice(1).join(':').trim();
    if (dentro) return dentro;
    const prox = l.slice(i + 1).find((c) => limpa(c));
    return prox ? limpa(prox) : '';
  };
  // .xlsx traz números crus: 80.0 → 80; horário como fração do dia (0.6458 → 15:30)
  const num = (v) => (v === undefined ? v : String(v).replace(/^(\d+)\.0+$/, '$1'));
  const hora = (v) => {
    const x = Number(v);
    if (v === undefined || !/^0?\.\d+$/.test(String(v).trim()) || !(x > 0 && x < 1)) return v;
    const min = Math.round(x * 1440);
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  };
  for (const l of linhas.slice(0, 15)) {
    const conv = num(valorApos(l, /qtd\.?\s*convidados/i)); if (conv !== undefined && !/qtd/i.test(conv)) info.convidados = conv;
    const pad = num(valorApos(l, /casal de padrinho/i)); if (pad !== undefined && !/qtd/i.test(pad)) info.padrinhos = pad;
    const cri = num(valorApos(l, /qtd\.?\s*de\s*crian/i)); if (cri !== undefined) info.criancas = cri;
    const loc = valorApos(l, /local da cerim/i); if (loc !== undefined) info.local = loc;
    const hor = hora(valorApos(l, /hor[aá]rio da cerim/i)); if (hor !== undefined) info.horario = hor;
    const dat = valorApos(l, /^\s*data\s*:/i); if (dat !== undefined) info.data = dat;
  }
  return info;
}

// ---------------------------------------------------------------------------
// Leitura a partir das linhas das abas (arrays de células, coluna A = índice 0). Serve para o .xlsx
// da pasta e para a cópia diária das planilhas do Google (formato 2, gravada pelo Apps Script).
// ---------------------------------------------------------------------------
const celula = (v) => String(v ?? '').trim();

/** "12 MESES", "6 MESES Antes do casamento", "1 ANO E 4 MESES" → meses; senão null. */
function mesesDaSecao(texto) {
  const t = chave(texto);
  const anos = /(\d+)\s*ano/.exec(t); const meses = /(\d+)\s*m[e]?s/.exec(t.replace(/\d+\s*ano[s]?/, ''));
  if (!anos && !meses) return null;
  return (anos ? Number(anos[1]) * 12 : 0) + (meses ? Number(meses[1]) : 0);
}
const ehSecao = (t) => mesesDaSecao(t) !== null && chave(t).split(' ').length <= 8
  || /^(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b.*\d{2,4}$/.test(chave(t));

function fornecedoresDeLinhas(linhas) {
  const lista = [];
  const iCab = linhas.findIndex((l) => l.some((c) => /^\s*fornecedor\s*$/i.test(c || '')));
  if (iCab < 0) return lista;
  const cab = linhas[iCab].map(celula);
  const col = (re) => cab.findIndex((c) => re.test(c));
  const cN = col(/^fornecedor$/i); const cD = col(/descri/i); const cP = col(/^pix$/i);
  for (const l of linhas.slice(iCab + 1)) {
    if (l.some((c) => /^\s*total\s*:?\s*$/i.test(c || ''))) break;
    lista.push({ nome: celula(l[cN]), descricao: cD >= 0 ? celula(l[cD]) : '', pix: cP >= 0 ? celula(l[cP]) : '' });
  }
  return lista;
}

function tarefasDeLinhas(linhas) {
  const tarefas = [];
  let cols = null;
  let meses;
  for (const l of linhas) {
    const cel = l.map(celula);
    const iItens = cel.findIndex((c) => /^itens$/i.test(c));
    if (iItens >= 0) { // cabeçalho (o modelo novo repete a cada etapa)
      const f = (re) => cel.findIndex((c) => re.test(c));
      cols = { i: iItens, s: f(/^status$/i), o: f(/observa/i), f: f(/^fornecedor/i) };
      continue;
    }
    // título de etapa ("12 MESES", "outubro 2025"): só texto nas primeiras colunas, sem status
    const preenchidas = cel.filter(Boolean);
    if (preenchidas.length === 1 && ehSecao(preenchidas[0]) && cel.indexOf(preenchidas[0]) <= (cols ? cols.i : 3)) {
      const m = mesesDaSecao(preenchidas[0]); meses = m === null ? undefined : m; continue;
    }
    if (!cols) continue;
    const pega = (i) => (i >= 0 ? cel[i] || '' : '');
    const texto = pega(cols.i);
    if (!texto || /^\d+$/.test(texto)) continue;
    tarefas.push({
      item: texto, status: pega(cols.s), obs: pega(cols.o), fornecedor: pega(cols.f), ...(meses !== undefined ? { meses } : {}),
    });
  }
  return tarefas;
}

/** Monta os dados do casal a partir das linhas das abas FINANCEIRO e ASSESSORIA. */
function extrairDeLinhas(financeiro, assessoria) {
  return {
    info: assessoria ? infoDeLinhas(assessoria.map((l) => l.map(celula).filter(Boolean))) : {},
    fornecedores: financeiro ? fornecedoresDeLinhas(financeiro) : [],
    tarefas: assessoria ? tarefasDeLinhas(assessoria) : [],
  };
}

/** Linhas de uma aba do .xlsx como arrays (coluna A = índice 0). */
function linhasDaAba(aba) {
  const idx = (letras) => [...letras].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return aba.linhas.map((l) => {
    const arr = [];
    for (const [k, v] of Object.entries(l.c)) arr[idx(k)] = v;
    return Array.from(arr, (v) => v ?? '');
  });
}

/** Lê uma planilha .xlsx (abas FINANCEIRO e ASSESSORIA) no mesmo formato da cópia sincronizada. */
function lerPlanilhaXlsx(arquivo) {
  const fin = lerAba(arquivo, 'FINANCEIRO');
  if (!fin) throw new Error('A planilha do casal não tem a aba FINANCEIRO.');
  const ass = lerAba(arquivo, 'ASSESSORIA');
  const mtime = new Date(fs.statSync(arquivo).mtimeMs).toISOString();
  return {
    fonte: { tipo: 'xlsx', titulo: path.basename(arquivo), arquivo, modificada_em: mtime },
    lido_em: mtime,
    ...extrairDeLinhas(linhasDaAba(fin), ass ? linhasDaAba(ass) : null),
  };
}

/** Cópia diária gravada pelo Apps Script (formato 2: abas cruas) → mesmo formato das outras fontes. */
function deCopiaGoogle(json) {
  if (!json || json.formato !== 2) return json;
  const abas = json.abas || {};
  return { fonte: json.fonte, lido_em: json.lido_em, ...extrairDeLinhas(abas.FINANCEIRO || null, abas.ASSESSORIA || null) };
}

const arquivoCopia = (dirDados, contratoArquivo) => path.join(dirDados, 'planilhas', String(contratoArquivo).replace(/\.txt$/i, '.json'));
const quando = (d) => new Date((d && (d.fonte?.modificada_em || d.lido_em)) || 0).getTime();

/**
 * Cópia da planilha do Google: a gravada pelo Apps Script (planilhas/<AS-0031>.json, todo dia) ou a feita à mão
 * pelo Claude (planilhas/<contrato>.json). Vale a mais recente.
 */
function lerCopiaSincronizada(dirDados, contratoArquivo, numeroOs) {
  const candidatos = [arquivoCopia(dirDados, contratoArquivo)];
  if (numeroOs) candidatos.push(path.join(dirDados, 'planilhas', `${String(numeroOs).trim()}.json`));
  let melhor = null;
  for (const arq of candidatos) {
    if (!fs.existsSync(arq)) continue;
    try {
      const d = deCopiaGoogle(JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, '')));
      if (!melhor || quando(d) > quando(melhor)) melhor = d;
    } catch { /* arquivo incompleto (Drive sincronizando): ignora */ }
  }
  return melhor;
}

/** A fonte mais recente entre o .xlsx da pasta e a cópia sincronizada do Google. */
function fonteDoCasal(dirDados, contratoArquivo, xlsx, numeroOs) {
  const copia = lerCopiaSincronizada(dirDados, contratoArquivo, numeroOs);
  let doXlsx = null;
  if (xlsx) { try { doXlsx = lerPlanilhaXlsx(xlsx); } catch { doXlsx = null; } }
  if (copia && doXlsx) return quando(copia) >= quando(doXlsx) ? copia : doXlsx;
  return copia || doXlsx;
}

/** Muda só quando a planilha muda (a cópia diária regrava o arquivo, mas a data de modificação é a da planilha). */
const assinatura = (dados) => (dados ? `${dados.fonte?.tipo}:${dados.fonte?.id || dados.fonte?.titulo}:${dados.fonte?.modificada_em || dados.lido_em}` : '');

/** Situação da cópia diária (arquivo _sincronizacao.json gravado pelo Apps Script). */
function situacaoSincronizacao(dirDados) {
  const arq = path.join(dirDados, 'planilhas', '_sincronizacao.json');
  if (!fs.existsSync(arq)) return { instalada: false };
  try {
    const j = JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
    return { instalada: true, executado_em: j.executado_em, casais: (j.itens || []).length,
      erros: (j.itens || []).filter((x) => x.erro).map((x) => `${x.pasta}: ${x.erro}`) };
  } catch { return { instalada: true, erro: 'arquivo de situação ilegível' }; }
}

/** Separa "Cerimônia - X, Festa - Y" quando a planilha traz os dois locais juntos. */
function separarLocais(texto) {
  const t = limpa(texto);
  const m = /cerim[oô]nia\s*[-:–]\s*(.+?)\s*[,;|/]\s*(?:festa|recep[cç][aã]o)\s*[-:–]\s*(.+)/i.exec(t);
  if (m) return { cerimonia: aDefinir(m[1]) ? '' : m[1], recepcao: aDefinir(m[2]) ? '' : m[2] };
  // "Igreja X e Espaço Y": cerimônia na igreja, recepção no outro local
  const ig = /^((?:igreja|par[oó]quia|capela|catedral|bas[ií]lica)\b.+?)\s+e\s+(.+)$/i.exec(t);
  if (ig) return { cerimonia: ig[1], recepcao: ig[2] };
  return aDefinir(t) ? { cerimonia: '', recepcao: '' } : { cerimonia: t, recepcao: t };
}

const ehServicoGenerico = (s) => SERVICO_GENERICO.test(chave(s));

module.exports = {
  extrairDeLinhas, deCopiaGoogle, situacaoSincronizacao, mesesDaSecao,
  ehServicoGenerico, normalizarFornecedores, infoDeLinhas, lerPlanilhaXlsx, lerCopiaSincronizada, arquivoCopia, fonteDoCasal,
  assinatura, separarLocais, lerHorario, acharCelular, aDefinir,
};
