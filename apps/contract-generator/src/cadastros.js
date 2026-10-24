'use strict';

const fs = require('fs');
const path = require('path');
const { parseTxt } = require('./parser');

const soDigitos = (s) => String(s || '').replace(/\D/g, '');

const normalizar = (s) =>
  String(s || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

/** Lê todos os clientes da pasta (ignora arquivos que começam com "_"). */
function listarClientes(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.txt') && !f.startsWith('_'))
    .map((arquivo) => ({
      arquivo,
      dados: parseTxt(fs.readFileSync(path.join(dir, arquivo), 'utf8')),
    }));
}

/**
 * Encontra o cliente pela referência usada no contrato:
 *   - CPF/CNPJ (com ou sem pontuação), ou
 *   - nome do arquivo sem ".txt" (ex.: "maria-souza")
 */
function buscarCliente(referencia, dir) {
  const clientes = listarClientes(dir);
  const digitos = soDigitos(referencia);
  const ref = normalizar(referencia);

  const encontrados = clientes.filter(({ arquivo, dados }) =>
    (digitos.length >= 11 && soDigitos(dados.cpf_cnpj || dados.cpf) === digitos) ||
    normalizar(arquivo.replace(/\.txt$/i, '')) === ref);

  if (encontrados.length === 0) {
    throw new Error(
      `Cliente "${referencia}" não encontrado em ${dir}.\n` +
      '  Crie o arquivo do cliente copiando clientes/_modelo.txt.',
    );
  }
  if (encontrados.length > 1) {
    throw new Error(
      `Mais de um cliente corresponde a "${referencia}": ` +
      encontrados.map((c) => c.arquivo).join(', '),
    );
  }
  return encontrados[0].dados;
}

/**
 * Se o .txt do contrato tiver "cliente: <cpf ou arquivo>", carrega o cadastro
 * e preenche os campos contratante_*. Campos contratante_* escritos no próprio
 * contrato têm prioridade (servem para ajustes pontuais).
 */
function aplicarCliente(dados, dir) {
  if (!dados.cliente) return dados;
  const cliente = buscarCliente(dados.cliente, dir);

  const doCadastro = {};
  for (const [k, v] of Object.entries(cliente)) {
    const chave = k === 'cpf_cnpj' ? 'cpf' : k;
    doCadastro[`contratante_${chave}`] = v;
  }
  return { ...doCadastro, ...dados };
}

module.exports = { aplicarCliente, buscarCliente, listarClientes };
