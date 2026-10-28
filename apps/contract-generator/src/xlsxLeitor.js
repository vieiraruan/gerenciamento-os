'use strict';

/**
 * Leitura simples de uma aba de planilha .xlsx (sem dependências além do pizzip).
 * Devolve as linhas como objetos { B: 'valor', C: 'valor', ... } com o texto/número de cada célula
 * (fórmulas: o último valor calculado salvo no arquivo).
 */
const fs = require('fs');
const PizZip = require('pizzip');

const desc = (s) => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');

function textoRico(xml) {
  return desc([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));
}

/**
 * @param {string} arquivo caminho do .xlsx
 * @param {string|RegExp} aba nome da aba (comparação sem maiúsculas/acentos) ou expressão regular
 * @returns {{ nome: string, linhas: Array<{n:number, c:Object}> } | null}
 */
function lerAba(arquivo, aba) {
  const zip = new PizZip(fs.readFileSync(arquivo));
  const norm = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();
  const wb = zip.file('xl/workbook.xml').asText();
  const rels = zip.file('xl/_rels/workbook.xml.rels').asText();
  const abas = [...wb.matchAll(/<sheet\b[^>]*\bname="([^"]*)"[^>]*\br:id="([^"]*)"/g)].map((m) => ({ nome: desc(m[1]), id: m[2] }));
  const alvo = abas.find((a) => (aba instanceof RegExp ? aba.test(a.nome) : norm(a.nome) === norm(aba)));
  if (!alvo) return null;
  const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${alvo.id}"[^>]*\\bTarget="([^"]*)"`).exec(rels)
    || new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]*)"[^>]*\\bId="${alvo.id}"`).exec(rels);
  if (!rel) return null;
  const caminho = rel[1].startsWith('/') ? rel[1].slice(1) : `xl/${rel[1].replace(/^\.\//, '')}`;
  const sheet = zip.file(caminho);
  if (!sheet) return null;

  const ssXml = zip.file('xl/sharedStrings.xml') ? zip.file('xl/sharedStrings.xml').asText() : '';
  const compartilhadas = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoRico(m[1]));

  const linhas = [];
  for (const row of sheet.asText().matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const c = {};
    for (const cel of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cel[1];
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!ref || !cel[2]) continue;
      const tipo = (/\bt="([^"]*)"/.exec(attrs) || [])[1];
      let v;
      if (tipo === 'inlineStr') v = textoRico(cel[2]);
      else {
        const m = /<v>([\s\S]*?)<\/v>/.exec(cel[2]);
        if (!m) continue;
        v = tipo === 's' ? compartilhadas[Number(m[1])] : desc(m[1]);
      }
      if (v !== undefined && String(v).trim() !== '') c[ref[1]] = String(v).trim();
    }
    if (Object.keys(c).length) linhas.push({ n: Number(row[1]), c });
  }
  return { nome: alvo.nome, linhas };
}

module.exports = { lerAba };
