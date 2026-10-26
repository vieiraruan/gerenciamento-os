'use strict';

/**
 * Numeração dos contratos / ordens de serviço.
 *
 * Formato: <LINHA>-<NNNN>  ->  AS-0042 (Assessoria) | CE-0107 (Cerimonial)
 * Cada linha tem sequência própria. O número é a chave do contrato no sistema.
 *
 * O próximo número de cada linha fica em config/sequencias.json. Ao gerar um
 * contrato sem "numero_os", o número é reservado e gravado no próprio .txt,
 * assim gerar de novo o mesmo contrato não consome outro número.
 */
const fs = require('fs');

const FORMATO = /^(AS|CE)-\d{4}$/;

function lerSequencias(arquivo) {
  if (!fs.existsSync(arquivo)) return { AS: 0, CE: 0 };
  return JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, ''));
}

function formatar(linha, n) {
  return `${linha}-${String(n).padStart(4, '0')}`;
}

/** Valida um número informado e confere se ele bate com a linha dos serviços. */
function validar(numero, linha) {
  const n = String(numero).trim().toUpperCase();
  if (!FORMATO.test(n)) throw new Error(`numero_os inválido: "${numero}" (formato AS-0001 ou CE-0001).`);
  if (!n.startsWith(`${linha}-`)) {
    throw new Error(`numero_os ${n} é da linha ${n.slice(0, 2)}, mas os serviços são da linha ${linha}.`);
  }
  return n;
}

/**
 * Retorna o número do contrato: usa o informado no .txt ou reserva o próximo
 * da sequência e acrescenta "numero_os: XX-NNNN" no final do .txt.
 */
function obterNumero({ informado, linha, arquivoSequencias, arquivoTxt }) {
  if (informado) return validar(informado, linha);

  const seq = lerSequencias(arquivoSequencias);
  seq[linha] = Number(seq[linha] || 0) + 1;
  const numero = formatar(linha, seq[linha]);
  fs.writeFileSync(arquivoSequencias, `${JSON.stringify(seq, null, 2)}\n`);

  const conteudo = fs.readFileSync(arquivoTxt, 'utf8');
  const quebra = conteudo.endsWith('\n') ? '' : '\n';
  fs.writeFileSync(arquivoTxt, `${conteudo}${quebra}\n# Reservado automaticamente pelo gerador\nnumero_os: ${numero}\n`);
  return numero;
}

module.exports = { obterNumero, formatar, validar };
