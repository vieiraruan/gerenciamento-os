#!/usr/bin/env node
'use strict';

/**
 * Gerador de contratos.
 *
 * Uso:
 *   node src/index.js <dados.txt> [--saida pasta] [--clientes pasta] [--sem-pdf]
 *
 * O campo "tipo_servico" do .txt define qual modelo (templates/modelos.json) será usado.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { parseTxt } = require('./parser');
const { enriquecer } = require('./calculos');
const { aplicarCliente } = require('./cadastros');

const RAIZ = path.resolve(__dirname, '..');
const DIR_TEMPLATES = path.join(RAIZ, 'templates');
const DIR_CLIENTES = process.env.CONTRATOS_CLIENTES || path.join(RAIZ, 'clientes');

function carregarJson(arquivo, padrao) {
  if (!fs.existsSync(arquivo)) return padrao;
  // remove BOM (o Bloco de Notas do Windows pode salvar com ele)
  return JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''));
}

function slug(texto) {
  return String(texto || 'contrato')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

function gerarContrato(
  arquivoTxt,
  { saida = path.join(RAIZ, 'saida'), pdf = true, clientes = DIR_CLIENTES } = {},
) {
  const modelos = carregarJson(path.join(DIR_TEMPLATES, 'modelos.json'), {});
  const empresa = carregarJson(path.join(RAIZ, 'config', 'empresa.json'), {});

  const brutos = aplicarCliente(parseTxt(fs.readFileSync(arquivoTxt, 'utf8')), clientes);
  const tipo = brutos.tipo_servico;
  const modelo = modelos[tipo];
  if (!modelo) {
    throw new Error(
      `tipo_servico "${tipo || ''}" não encontrado. Disponíveis: ${Object.keys(modelos).join(', ')}`,
    );
  }

  const faltando = (modelo.obrigatorios || []).filter((c) => !brutos[c]);
  if (faltando.length) {
    throw new Error(`Campos obrigatórios ausentes no .txt: ${faltando.join(', ')}`);
  }

  const dados = enriquecer(brutos, empresa);

  const zip = new PizZip(fs.readFileSync(path.join(DIR_TEMPLATES, modelo.arquivo)));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (parte) => `[[${parte.value} NÃO INFORMADO]]`,
  });
  doc.render(dados);

  fs.mkdirSync(saida, { recursive: true });
  const nome = `contrato-${slug(tipo)}-${slug(dados.contratante_nome)}-${slug(dados.evento_data)}`;
  const docx = path.join(saida, `${nome}.docx`);
  fs.writeFileSync(docx, doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }));

  const resultado = { docx, dados };
  if (pdf) resultado.pdf = converterPdf(docx, saida);
  return resultado;
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
  const arquivo = args.filter((a, i) => !a.startsWith('--') && !['--saida', '--clientes'].includes(args[i - 1]))[0];
  if (!arquivo) {
    console.error('Uso: node src/index.js <dados.txt> [--saida pasta] [--clientes pasta] [--sem-pdf]');
    process.exit(1);
  }
  const valor = (op) => (args.indexOf(op) > -1 ? args[args.indexOf(op) + 1] : undefined);
  try {
    const r = gerarContrato(arquivo, {
      saida: valor('--saida'),
      clientes: valor('--clientes'),
      pdf: !args.includes('--sem-pdf'),
    });
    console.log(`✔ DOCX: ${r.docx}`);
    if (r.pdf) console.log(`✔ PDF:  ${r.pdf}`);
  } catch (e) {
    const detalhes = e.properties?.errors?.map((x) => x.properties.explanation).join('\n  ');
    console.error(`✖ ${e.message}${detalhes ? `\n  ${detalhes}` : ''}`);
    process.exit(1);
  }
}

module.exports = { gerarContrato };
