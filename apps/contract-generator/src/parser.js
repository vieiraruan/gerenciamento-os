'use strict';

/**
 * Lê o arquivo .txt de dados do contrato.
 *
 * Formato:
 *   # linhas iniciadas com # são comentários
 *   chave: valor
 *
 * As chaves são livres (snake_case) e viram os campos {chave} do modelo .docx.
 */
function parseTxt(conteudo) {
  const dados = {};
  const linhas = conteudo.replace(/^﻿/, '').split(/\r?\n/);

  linhas.forEach((linha, i) => {
    const texto = linha.trim();
    if (!texto || texto.startsWith('#')) return;

    const pos = texto.indexOf(':');
    if (pos === -1) {
      throw new Error(`Linha ${i + 1} inválida (esperado "chave: valor"): ${texto}`);
    }
    const chave = texto.slice(0, pos).trim().toLowerCase().replace(/[\s.-]+/g, '_');
    const valor = texto.slice(pos + 1).trim();
    dados[chave] = valor;
  });

  return dados;
}

/** Converte "12.500,50", "12500.50" ou "R$ 12.500" em número. */
function parseValor(texto) {
  if (texto === undefined || texto === null || texto === '') return undefined;
  let s = String(texto).replace(/[R$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error(`Valor monetário inválido: ${texto}`);
  return Math.round(n * 100) / 100;
}

/** Aceita "15/03/2027" ou "2027-03-15". */
function parseData(texto) {
  if (!texto) return undefined;
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  throw new Error(`Data inválida (use DD/MM/AAAA): ${texto}`);
}

module.exports = { parseTxt, parseValor, parseData };
