#!/usr/bin/env node
'use strict';

/**
 * Gerador de contratos e ordens de serviço.
 *
 * Uso:
 *   node src/index.js <dados.txt> [--saida pasta] [--clientes pasta] [--sem-pdf] [--sem-os]
 *
 * Gera, numa pasta "<numero_os> - <nomes>":
 *   contrato.docx/.pdf       contrato modular com as seções dos serviços contratados
 *   ordem-servico.docx/.pdf  ordem de serviço do evento
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { parseTxt } = require('./parser');
const { enriquecer } = require('./calculos');
const { aplicarCliente } = require('./cadastros');
const { montarContrato } = require('./contrato');
const { obterNumero } = require('./numeracao');

const { resolverPastas, prepararPastas } = require('./pastas');
const { criarPlanilha } = require('./planilha');

const RAIZ = path.resolve(__dirname, '..');
const DIR_TEMPLATES = path.join(RAIZ, 'templates');

// Campos opcionais: se ficarem vazios no documento, não aparecem como "NÃO INFORMADO".
const OPCIONAIS = new Set(['observacoes', 'desconto_fmt', 'alerta_horas']);

function carregarJson(arquivo, padrao) {
  if (!fs.existsSync(arquivo)) return padrao;
  // remove BOM (o Bloco de Notas do Windows pode salvar com ele)
  return JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''));
}

function slug(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9&]+/g, ' ').replace(/\s*&\s*/g, ' & ').trim().toUpperCase();
}

function renderizar(modelo, dados, destino) {
  const zip = new PizZip(fs.readFileSync(path.join(DIR_TEMPLATES, modelo)));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (parte) => {
      if (parte.module) return '';
      return OPCIONAIS.has(parte.value) ? '' : `[[${parte.value} NÃO INFORMADO]]`;
    },
  });
  doc.render(dados);
  fs.writeFileSync(destino, doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  return destino;
}

async function gerarContrato(arquivoTxt, opcoes = {}) {
  // Pastas padrão: Google Drive (CONTRATOS GERADOS) quando disponível; ver src/pastas.js
  const p = resolverPastas();
  const {
    saida = p.saida, pdf = true, os: comOs = true,
    clientes = process.env.CONTRATOS_CLIENTES || p.clientes,
    sequencias = p.sequencias, empresa: arqEmpresa = p.empresa,
  } = Object.fromEntries(Object.entries(opcoes).filter(([, v]) => v !== undefined));
  const modelos = carregarJson(path.join(DIR_TEMPLATES, 'modelos.json'), {});
  const catalogo = carregarJson(path.join(DIR_TEMPLATES, 'servicos.json'), {});
  const empresa = carregarJson(arqEmpresa, {});
  if (!empresa.razao_social) throw new Error(`Dados da empresa não encontrados (${arqEmpresa}).`);
  fs.mkdirSync(path.dirname(sequencias), { recursive: true });

  const brutos = aplicarCliente(parseTxt(fs.readFileSync(arquivoTxt, 'utf8')), clientes);
  const nomeModelo = brutos.modelo || 'casamento';
  const modelo = modelos[nomeModelo];
  if (!modelo) {
    throw new Error(`modelo "${nomeModelo}" não encontrado. Disponíveis: ${Object.keys(modelos).join(', ')}`);
  }

  const faltando = (modelo.obrigatorios || []).filter((c) => !brutos[c]);
  if (faltando.length) {
    throw new Error(`Campos obrigatórios ausentes no .txt: ${faltando.join(', ')}`);
  }

  // Valida tudo antes de reservar número, para não "queimar" numeração com erro.
  const contrato = montarContrato(brutos, catalogo);
  enriquecer({ ...brutos, ...contrato }, empresa);

  const numero = obterNumero({
    informado: brutos.numero_os,
    linha: contrato.linha,
    arquivoSequencias: sequencias,
    arquivoTxt,
  });
  const dados = enriquecer({ ...brutos, ...contrato, numero_os: numero }, empresa);

  // Pasta do casal no padrão do Drive:
  //   (AS-0042) ASSESSORIA DIDIER E MANUELA/
  //   ├── 001. Tayná Alves Assessoria/   contrato + ordem de serviço
  //   └── PLANILHA DE ASSESSORIA Didier & Manuela.xlsx
  const linhaNome = contrato.linha === 'AS' ? 'ASSESSORIA' : 'CERIMONIAL';
  const pastaCasal = path.join(saida, `(${numero}) ${linhaNome} ${slug(brutos.evento_nomes)}`);
  const nomeEmpresa = String(empresa.nome_fantasia || empresa.razao_social).replace(/[\\/:*?"<>|]/g, '');
  const pasta = path.join(pastaCasal, `001. ${nomeEmpresa}`);
  fs.mkdirSync(pasta, { recursive: true });

  const arquivos = [renderizar(modelo.arquivo, dados, path.join(pasta, 'contrato.docx'))];
  if (comOs) arquivos.push(renderizar('ordem_servico.docx', dados, path.join(pasta, 'ordem-servico.docx')));
  const pdfs = pdf ? arquivos.map((a) => converterPdf(a, pasta)).filter(Boolean) : [];

  const planilha = await criarPlanilha(pastaCasal, { brutos, dados, empresa });

  return {
    numero, pasta, pastaCasal, planilha,
    arquivos: [...arquivos, ...pdfs, ...(planilha.criada ? [planilha.arquivo] : [])],
    dados,
  };
}

/**
 * Converte para PDF tentando, nesta ordem:
 *   1. LibreOffice (soffice) no PATH ou na pasta padrão do Windows
 *   2. Microsoft Word (somente Windows, via automação COM)
 */
function converterPdf(docx, saida) {
  const pdf = path.join(saida, path.basename(docx).replace(/\.docx$/, '.pdf'));

  const soffices = ['soffice'];
  if (process.platform === 'win32') {
    soffices.push(
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    );
  }
  for (const bin of soffices) {
    try {
      execFileSync(bin, ['--headless', '--convert-to', 'pdf', '--outdir', saida, docx], {
        stdio: 'ignore',
      });
      if (fs.existsSync(pdf)) return pdf;
    } catch {
      /* tenta o próximo */
    }
  }

  if (process.platform === 'win32') {
    const script = [
      '$ErrorActionPreference = "Stop"',
      '$w = New-Object -ComObject Word.Application',
      '$w.Visible = $false',
      'try {',
      '  $d = $w.Documents.Open($env:DOCX_ORIGEM, $false, $true)',
      '  $d.ExportAsFixedFormat($env:PDF_DESTINO, 17)',
      '  $d.Close($false)',
      '} finally { $w.Quit() }',
    ].join('; ');
    try {
      execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { stdio: 'ignore', env: { ...process.env, DOCX_ORIGEM: path.resolve(docx), PDF_DESTINO: path.resolve(pdf) } },
      );
      if (fs.existsSync(pdf)) return pdf;
    } catch {
      /* Word não disponível */
    }
  }

  console.warn('Aviso: nem LibreOffice nem Microsoft Word encontrados, PDF não gerado.');
  return undefined;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const comValor = ['--saida', '--clientes'];
  const arquivo = args.filter((a, i) => !a.startsWith('--') && !comValor.includes(args[i - 1]))[0];
  if (!arquivo) {
    console.error('Uso: node src/index.js <dados.txt> [--saida pasta] [--clientes pasta] [--sem-pdf] [--sem-os]');
    process.exit(1);
  }
  const valor = (op) => (args.indexOf(op) > -1 ? args[args.indexOf(op) + 1] : undefined);
  (async () => {
    const r = await gerarContrato(arquivo, {
      saida: valor('--saida'),
      clientes: valor('--clientes'),
      pdf: !args.includes('--sem-pdf'),
      os: !args.includes('--sem-os'),
    });
    console.log(`✔ Contrato ${r.numero}  →  ${r.pastaCasal}`);
    r.arquivos.forEach((a) => console.log(`  ${path.relative(r.pastaCasal, a)}`));
    if (!r.planilha.criada) console.log(`  (planilha financeira já existia — mantida: ${path.basename(r.planilha.arquivo)})`);
  })().catch((e) => {
    const detalhes = e.properties?.errors?.map((x) => x.properties.explanation).join('\n  ');
    console.error(`✖ ${e.message}${detalhes ? `\n  ${detalhes}` : ''}`);
    process.exit(1);
  });
}

module.exports = { gerarContrato, prepararPastas };
