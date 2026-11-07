'use strict';

/**
 * Escreve o financeiro do casal na aba FINANCEIRO de uma PLANILHA DE ASSESSORIA .xlsx (a planilha que o sistema
 * cria na pasta do casal e que a Tayná abre no Google Planilhas / Excel).
 *
 * Mesmas regras do Apps Script para as planilhas do Google: linha a linha pelo nome do fornecedor (ou na primeira
 * linha vazia antes do TOTAL), sem tocar em células com fórmula (saldo devedor, valor restante, total) e mantendo
 * a formatação de cada célula. O arquivo é gravado num temporário e trocado de uma vez.
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const desc = (s) => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');
const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textoRico = (xml) => desc([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

// nomes de coluna equivalentes entre o modelo antigo e o novo da planilha (iguais aos do Apps Script)
const SINONIMOS = {
  'numero de parcelas': ['numero de parcelas', 'total de parcelas'],
  'numero de parcelas pagas': ['numero de parcelas pagas', 'parcelas pagas'],
  'status do pagamento': ['status do pagamento', 'status de quitacao'],
};

const colNum = (letras) => letras.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const colLetras = (n) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

function caminhoAba(zip, nome) {
  const wb = zip.file('xl/workbook.xml').asText();
  const rels = zip.file('xl/_rels/workbook.xml.rels').asText();
  const abas = [...wb.matchAll(/<sheet\b[^>]*\bname="([^"]*)"[^>]*\br:id="([^"]*)"/g)].map((m) => ({ nome: desc(m[1]), id: m[2] }));
  const alvo = abas.find((a) => norm(a.nome) === norm(nome));
  if (!alvo) return null;
  const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${alvo.id}"[^>]*\\bTarget="([^"]*)"`).exec(rels)
    || new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]*)"[^>]*\\bId="${alvo.id}"`).exec(rels);
  if (!rel) return null;
  return rel[1].startsWith('/') ? rel[1].slice(1) : `xl/${rel[1].replace(/^\.\//, '')}`;
}

/** Linhas da aba: { n, abre, fecha, celulas: [{ col, xml, attrs, temFormula, valor }] } */
function lerLinhas(xml, compartilhadas) {
  const linhas = [];
  for (const m of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const n = Number((/\br="(\d+)"/.exec(m[1]) || [])[1]);
    const celulas = [];
    for (const c of (m[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(c[1]);
      if (!ref) continue;
      const tipo = (/\bt="([^"]*)"/.exec(c[1]) || [])[1];
      const corpo = c[2] || '';
      let valor = '';
      if (tipo === 'inlineStr') valor = textoRico(corpo);
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(corpo);
        if (v) valor = tipo === 's' ? (compartilhadas[Number(v[1])] || '') : desc(v[1]);
      }
      celulas.push({ col: ref[1], xml: c[0], attrs: c[1], temFormula: /<f[\s>/]/.test(corpo), valor: String(valor).trim() });
    }
    linhas.push({ n, inicio: m.index, fim: m.index + m[0].length, original: m[0], abertura: `<row${m[1]}>`, celulas });
  }
  return linhas;
}

/** XML de uma célula com o valor novo, mantendo o estilo (s="…") da célula que já existia. */
function celulaNova(ref, antiga, valor) {
  const estilo = antiga ? (/\bs="(\d+)"/.exec(antiga.attrs) || [])[1] : null;
  const s = estilo ? ` s="${estilo}"` : '';
  if (valor === null || valor === undefined || valor === '') return `<c r="${ref}"${s}/>`;
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escXml(valor)}</t></is></c>`;
}

/**
 * @param {string} arquivo caminho do .xlsx
 * @param {Array<Object>} linhasFin linhas no formato de financeiro.linhasParaGoogle (chave = nome da coluna)
 * @returns {{ linhas: number }} quantas linhas foram escritas
 */
function escreverFinanceiroXlsx(arquivo, linhasFin) {
  const zip = new PizZip(fs.readFileSync(arquivo));
  const caminho = caminhoAba(zip, 'FINANCEIRO');
  if (!caminho || !zip.file(caminho)) throw new Error('a planilha não tem a aba FINANCEIRO');
  const ssXml = zip.file('xl/sharedStrings.xml') ? zip.file('xl/sharedStrings.xml').asText() : '';
  const compartilhadas = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoRico(m[1]));
  let xml = zip.file(caminho).asText();
  const linhas = lerLinhas(xml, compartilhadas);

  const iCab = linhas.findIndex((l) => l.celulas.some((c) => norm(c.valor) === 'fornecedor'));
  if (iCab < 0) throw new Error('cabeçalho "Fornecedor" não encontrado na aba FINANCEIRO');
  const cab = {}; // nome normalizado -> coluna
  for (const c of linhas[iCab].celulas) if (c.valor) cab[norm(c.valor)] = c.col;
  const coluna = (nome) => {
    const alvos = SINONIMOS[norm(nome)] || [norm(nome)];
    for (const a of alvos) if (cab[a]) return cab[a];
    return null;
  };
  const cNome = coluna('Fornecedor');
  let iTotal = linhas.findIndex((l, i) => i > iCab && l.celulas.some((c) => /^total\s*:?$/i.test(c.valor)));
  if (iTotal < 0) iTotal = linhas.length;
  const nomeDa = (l) => (l.celulas.find((c) => c.col === cNome) || {}).valor || '';

  // monta as alterações por linha
  const mudancas = new Map(); // índice da linha -> { col: valor }
  const usadas = new Set();
  // primeiro os ativos (para não reaproveitarem a linha de um retirado com o mesmo nome), depois os retirados
  const ordemFin = [...linhasFin.filter((l) => !l._remover), ...linhasFin.filter((l) => l._remover)];
  for (const lf of ordemFin) {
    const nome = norm(lf['Fornecedor']);
    let i = -1;
    for (let k = iCab + 1; k < iTotal; k++) if (!usadas.has(k) && norm(nomeDa(linhas[k])) === nome) { i = k; break; }
    if (lf._remover) {
      // fornecedor retirado: limpa a linha dele (todas as colunas do cabeçalho que não têm fórmula)
      if (i < 0) continue;
      usadas.add(i);
      mudancas.set(i, Object.fromEntries(Object.values(cab).map((col) => [col, ''])));
      continue;
    }
    if (i < 0) for (let k = iCab + 1; k < iTotal; k++) if (!usadas.has(k) && !nomeDa(linhas[k])) { i = k; break; }
    if (i < 0) throw new Error(`sem linha livre na aba FINANCEIRO para "${lf['Fornecedor']}" (inclua linhas antes do TOTAL)`);
    usadas.add(i);
    const m = {};
    for (const [campo, valor] of Object.entries(lf)) {
      const col = coluna(campo);
      if (col) m[col] = valor;
    }
    mudancas.set(i, m);
  }

  // reescreve as linhas alteradas (de baixo para cima, para os índices continuarem valendo)
  const ordem = [...mudancas.keys()].sort((a, b) => b - a);
  for (const i of ordem) {
    const l = linhas[i];
    const m = mudancas.get(i);
    const celulas = l.celulas.map((c) => ({ col: c.col, xml: c.xml, c }));
    for (const [col, valor] of Object.entries(m)) {
      const ref = `${col}${l.n}`;
      const atual = celulas.find((x) => x.col === col);
      if (atual && atual.c.temFormula) continue; // não mexe em fórmula
      const nova = celulaNova(ref, atual && atual.c, valor);
      if (atual) atual.xml = nova;
      else celulas.push({ col, xml: nova });
    }
    celulas.sort((a, b) => colNum(a.col) - colNum(b.col));
    const novoRow = `${l.abertura.replace(/\/>$/, '>')}${celulas.map((x) => x.xml).join('')}</row>`;
    xml = xml.slice(0, l.inicio) + novoRow + xml.slice(l.fim);
  }
  zip.file(caminho, xml);

  // fórmulas (saldo, restante, total) recalculadas ao abrir
  let wb = zip.file('xl/workbook.xml').asText();
  if (/<calcPr\b/.test(wb)) {
    if (!/fullCalcOnLoad=/.test(wb)) wb = wb.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
  } else wb = wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
  zip.file('xl/workbook.xml', wb);

  const tmp = path.join(path.dirname(arquivo), `.~${path.basename(arquivo)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  try { fs.renameSync(tmp, arquivo); } catch (e) { try { fs.unlinkSync(tmp); } catch { /* */ } throw e; }
  return { linhas: mudancas.size };
}

module.exports = { escreverFinanceiroXlsx, colLetras };
