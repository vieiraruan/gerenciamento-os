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
  for (const l of linhas.slice(0, 15)) {
    const conv = valorApos(l, /qtd\.?\s*convidados/i); if (conv !== undefined && !/qtd/i.test(conv)) info.convidados = conv;
    const pad = valorApos(l, /casal de padrinho/i); if (pad !== undefined && !/qtd/i.test(pad)) info.padrinhos = pad;
    const cri = valorApos(l, /qtd\.?\s*de\s*crian/i); if (cri !== undefined) info.criancas = cri;
    const loc = valorApos(l, /local da cerim/i); if (loc !== undefined) info.local = loc;
    const hor = valorApos(l, /hor[aá]rio da cerim/i); if (hor !== undefined) info.horario = hor;
    const dat = valorApos(l, /^\s*data\s*:/i); if (dat !== undefined) info.data = dat;
  }
  return info;
}

/** Lê uma planilha .xlsx (abas FINANCEIRO e ASSESSORIA) no mesmo formato da cópia sincronizada. */
function lerPlanilhaXlsx(arquivo) {
  const fin = lerAba(arquivo, 'FINANCEIRO');
  if (!fin) throw new Error('A planilha do casal não tem a aba FINANCEIRO.');
  const cols = (l) => Object.keys(l.c);
  const cab = fin.linhas.find((l) => cols(l).some((k) => /^\s*fornecedor\s*$/i.test(l.c[k])));
  const fornecedores = [];
  if (cab) {
    const col = (re) => cols(cab).find((k) => re.test(cab.c[k]));
    const cN = col(/^\s*fornecedor\s*$/i); const cD = col(/descri/i); const cP = col(/^\s*pix\s*$/i);
    for (const l of fin.linhas) {
      if (l.n <= cab.n) continue;
      if (/^\s*total/i.test(l.c[cN] || '') || Object.values(l.c).some((v) => /^\s*total\s*:?\s*$/i.test(v))) break;
      fornecedores.push({ nome: l.c[cN] || '', descricao: (cD && l.c[cD]) || '', pix: (cP && l.c[cP]) || '' });
    }
  }
  const ass = lerAba(arquivo, 'ASSESSORIA');
  const letras = (l) => { const ks = Object.keys(l.c).sort((a, b) => a.length - b.length || a.localeCompare(b)); return ks.map((k) => l.c[k]); };
  const info = ass ? infoDeLinhas(ass.linhas.map(letras)) : {};
  // cronograma (CRONOGRAMA - CHECK LIST): ITENS / STATUS / OBSERVAÇÕES / FORNECEDOR
  const tarefas = [];
  if (ass) {
    const cabT = ass.linhas.find((l) => Object.values(l.c).some((v) => /^\s*itens\s*$/i.test(v)));
    if (cabT) {
      const col = (re) => Object.keys(cabT.c).find((k) => re.test(cabT.c[k]));
      const cI = col(/^\s*itens\s*$/i); const cS = col(/^\s*status\s*$/i); const cO = col(/observa/i); const cF = col(/fornecedor/i);
      for (const l of ass.linhas) {
        if (l.n <= cabT.n || !l.c[cI] || /^\s*\d+\s*m[eê]s(es)?\b/i.test(l.c[cI])) continue;
        tarefas.push({ item: l.c[cI], status: (cS && l.c[cS]) || '', obs: (cO && l.c[cO]) || '', fornecedor: (cF && l.c[cF]) || '' });
      }
    }
  }
  return {
    fonte: { tipo: 'xlsx', titulo: path.basename(arquivo), arquivo },
    lido_em: new Date(fs.statSync(arquivo).mtimeMs).toISOString(),
    info, fornecedores, tarefas,
  };
}

const arquivoCopia = (dirDados, contratoArquivo) => path.join(dirDados, 'planilhas', String(contratoArquivo).replace(/\.txt$/i, '.json'));

function lerCopiaSincronizada(dirDados, contratoArquivo) {
  const arq = arquivoCopia(dirDados, contratoArquivo);
  if (!fs.existsSync(arq)) return null;
  try { return JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, '')); } catch { return null; }
}

/** A fonte mais recente entre o .xlsx da pasta e a cópia sincronizada do Google. */
function fonteDoCasal(dirDados, contratoArquivo, xlsx) {
  const copia = lerCopiaSincronizada(dirDados, contratoArquivo);
  let doXlsx = null;
  if (xlsx) { try { doXlsx = lerPlanilhaXlsx(xlsx); } catch { doXlsx = null; } }
  if (copia && doXlsx) return new Date(copia.lido_em) >= new Date(doXlsx.lido_em) ? copia : doXlsx;
  return copia || doXlsx;
}

const assinatura = (dados) => (dados ? `${dados.fonte?.tipo}:${dados.fonte?.id || dados.fonte?.titulo}:${dados.lido_em}` : '');

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
  ehServicoGenerico, normalizarFornecedores, infoDeLinhas, lerPlanilhaXlsx, lerCopiaSincronizada, arquivoCopia, fonteDoCasal,
  assinatura, separarLocais, lerHorario, acharCelular, aDefinir,
};
