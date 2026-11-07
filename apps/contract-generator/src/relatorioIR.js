'use strict';

/**
 * Relatório de receitas da Tayná no ano (para o Imposto de Renda / contador): o que cada cliente pagou à empresa,
 * com data, cliente, CPF/CNPJ, contrato, forma e valor; totais por mês e por cliente; pendências (recebimentos
 * sem data e contratos sem nenhum recebimento lançado). Sai em Excel (.xlsx) e PDF.
 *
 * Fonte: a linha "Tayna Alves Assessoria" do financeiro de cada casal (lançada no Painel de gestão / Financeiro
 * ou importada da planilha).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const fin = require('./financeiro');
const { ehTayna } = require('./gestao');
const { criarXlsx } = require('./xlsx');

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TIPO = { entrada: 'Entrada', parcela: 'Parcela', avulso: 'Saldo / avulso' };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const moeda = (n) => `R$ ${r2(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * @param {Array<{arquivo, campos}>} contratos
 * @param {(arquivo) => object|null} carregarFin financeiro do casal
 * @param {(campos) => object} clienteDe dados do contratante (nome, cpf_cnpj)
 * @param {number|string} ano
 */
function dadosRelatorio(contratos, carregarFin, clienteDe, ano) {
  ano = String(ano);
  const linhas = []; const semData = []; const semLancamento = [];
  for (const { arquivo, campos } of contratos.filter((c) => c.campos.numero_os)) {
    const cli = clienteDe(campos) || {};
    const base = {
      arquivo, numero_os: campos.numero_os, casal: String(campos.evento_nomes || '').replace(/\s+/g, ' ').trim(),
      cliente: cli.nome || campos.evento_nomes || '', documento: cli.cpf_cnpj || cli.cpf || '',
    };
    const f = carregarFin(arquivo);
    const item = (f?.itens || []).find((i) => !i.removido && ehTayna(i));
    const pags = item ? (item.pagamentos || []) : [];
    if (!pags.length) {
      const valor = fin.valorDe(campos.valor_total);
      if (valor) semLancamento.push({ ...base, valor, situacao: campos.situacao_financeira || '' });
      continue;
    }
    for (const p of pags) {
      const l = { ...base, data: p.data || '', tipo: TIPO[p.tipo] || p.tipo, forma: p.forma || '', valor: r2(p.valor),
        comprovante: Boolean(p.comprovante), origem: p.importado ? 'planilha' : 'sistema' };
      if (!l.data) semData.push(l);
      else if (l.data.startsWith(ano)) linhas.push(l);
    }
  }
  linhas.sort((a, b) => a.data.localeCompare(b.data) || a.cliente.localeCompare(b.cliente));
  const porMes = MESES.map((nome, i) => {
    const doMes = linhas.filter((l) => Number(l.data.slice(5, 7)) === i + 1);
    return { mes: nome, quantidade: doMes.length, total: r2(doMes.reduce((s, l) => s + l.valor, 0)) };
  });
  const clientes = {};
  for (const l of linhas) {
    const k = `${l.documento || l.cliente}|${l.numero_os}`;
    clientes[k] = clientes[k] || { cliente: l.cliente, documento: l.documento, numero_os: l.numero_os, casal: l.casal, quantidade: 0, total: 0 };
    clientes[k].quantidade += 1;
    clientes[k].total = r2(clientes[k].total + l.valor);
  }
  return {
    ano, linhas, porMes, porCliente: Object.values(clientes).sort((a, b) => b.total - a.total),
    total: r2(linhas.reduce((s, l) => s + l.valor, 0)),
    semData, semLancamento,
  };
}

const dBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const dataJs = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };

const MARCA = '97492D';
const ESTILOS = {
  titulo: { negrito: true, tamanho: 14, cor: MARCA },
  sub: { cor: '555555' },
  cab: { negrito: true, cor: 'FFFFFF', fundo: MARCA, borda: 'thin', corBorda: MARCA, alinhar: 'center', quebrar: true },
  txt: { borda: 'thin', quebrar: true, vertical: 'top' },
  data: { borda: 'thin', formato: 'dd/mm/yyyy', alinhar: 'center', vertical: 'top' },
  moeda: { borda: 'thin', formato: '"R$" #,##0.00', vertical: 'top' },
  num: { borda: 'thin', alinhar: 'center', vertical: 'top' },
  total: { negrito: true, borda: 'thin', fundo: 'F3E6DF' },
  totalMoeda: { negrito: true, borda: 'thin', fundo: 'F3E6DF', formato: '"R$" #,##0.00' },
  nota: { italico: true, cor: '777777' },
  aviso: { negrito: true, cor: 'B3261E' },
};

function cabecalho(L, empresa, titulo, ano) {
  L.push({ n: 1, celulas: { A: { v: titulo, s: 'titulo' } }, altura: 22 });
  L.push({ n: 2, celulas: { A: { v: `${empresa.razao_social || empresa.nome_fantasia || 'Tayná Alves Assessoria'}${empresa.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}`, s: 'sub' } } });
  L.push({ n: 3, celulas: { A: { v: `Ano-calendário ${ano} (01/01/${ano} a 31/12/${ano}) · gerado em ${dBr(new Date().toISOString().slice(0, 10))}`, s: 'sub' } } });
}

function planilha(d, empresa) {
  // aba 1: recebimentos
  const L = [];
  cabecalho(L, empresa, `RECEITAS ${d.ano} — RECEBIMENTOS DE CLIENTES`, d.ano);
  const cols = ['Data', 'Cliente (contratante)', 'CPF / CNPJ', 'Contrato', 'Casal / evento', 'Referente a', 'Forma', 'Valor (R$)', 'Comprovante'];
  L.push({ n: 5, altura: 30, celulas: Object.fromEntries('ABCDEFGHI'.split('').map((c, i) => [c, { v: cols[i], s: 'cab' }])) });
  let n = 6;
  for (const l of d.linhas) {
    L.push({ n: n++, celulas: {
      A: { v: dataJs(l.data), s: 'data' }, B: { v: l.cliente, s: 'txt' }, C: { v: l.documento, s: 'txt' }, D: { v: l.numero_os, s: 'num' },
      E: { v: l.casal, s: 'txt' }, F: { v: l.tipo, s: 'txt' }, G: { v: l.forma, s: 'txt' }, H: { v: l.valor, s: 'moeda' },
      I: { v: l.comprovante ? 'sim' : 'não', s: 'num' },
    } });
  }
  const ultima = n - 1;
  L.push({ n, celulas: { A: { s: 'total' }, B: { v: `TOTAL (${d.linhas.length} recebimento(s))`, s: 'total' }, C: { s: 'total' }, D: { s: 'total' }, E: { s: 'total' }, F: { s: 'total' }, G: { s: 'total' },
    H: d.linhas.length ? { f: `SUM(H6:H${ultima})`, s: 'totalMoeda' } : { v: 0, s: 'totalMoeda' }, I: { s: 'total' } } });
  if (d.semData.length || d.semLancamento.length) {
    L.push({ n: n + 2, celulas: { A: { v: 'Atenção: há recebimentos sem data e/ou contratos sem recebimentos lançados — veja a aba PENDÊNCIAS. Eles não entram no total.', s: 'aviso' } } });
  }
  // aba 2: por mês
  const M = [];
  cabecalho(M, empresa, `RECEITAS ${d.ano} — TOTAL POR MÊS`, d.ano);
  M.push({ n: 5, celulas: { A: { v: 'Mês', s: 'cab' }, B: { v: 'Recebimentos', s: 'cab' }, C: { v: 'Total (R$)', s: 'cab' } } });
  d.porMes.forEach((m, i) => M.push({ n: 6 + i, celulas: { A: { v: m.mes, s: 'txt' }, B: { v: m.quantidade, s: 'num' }, C: { v: m.total, s: 'moeda' } } }));
  M.push({ n: 18, celulas: { A: { v: 'TOTAL DO ANO', s: 'total' }, B: { f: 'SUM(B6:B17)', s: 'total' }, C: { f: 'SUM(C6:C17)', s: 'totalMoeda' } } });
  // aba 3: por cliente
  const C = [];
  cabecalho(C, empresa, `RECEITAS ${d.ano} — TOTAL POR CLIENTE`, d.ano);
  C.push({ n: 5, celulas: { A: { v: 'Cliente (contratante)', s: 'cab' }, B: { v: 'CPF / CNPJ', s: 'cab' }, C: { v: 'Contrato', s: 'cab' }, D: { v: 'Casal / evento', s: 'cab' }, E: { v: 'Recebimentos', s: 'cab' }, F: { v: 'Total (R$)', s: 'cab' } } });
  d.porCliente.forEach((c, i) => C.push({ n: 6 + i, celulas: { A: { v: c.cliente, s: 'txt' }, B: { v: c.documento, s: 'txt' }, C: { v: c.numero_os, s: 'num' }, D: { v: c.casal, s: 'txt' }, E: { v: c.quantidade, s: 'num' }, F: { v: c.total, s: 'moeda' } } }));
  const fimC = 5 + d.porCliente.length;
  C.push({ n: fimC + 1, celulas: { A: { v: 'TOTAL', s: 'total' }, B: { s: 'total' }, C: { s: 'total' }, D: { s: 'total' }, E: { f: d.porCliente.length ? `SUM(E6:E${fimC})` : undefined, v: d.porCliente.length ? undefined : 0, s: 'total' }, F: d.porCliente.length ? { f: `SUM(F6:F${fimC})`, s: 'totalMoeda' } : { v: 0, s: 'totalMoeda' } } });
  // aba 4: pendências
  const P = [];
  cabecalho(P, empresa, 'PENDÊNCIAS (fora do total)', d.ano);
  let p = 5;
  P.push({ n: p++, celulas: { A: { v: 'Recebimentos sem data — informe a data no Financeiro do casal', s: 'aviso' } } });
  P.push({ n: p++, celulas: { A: { v: 'Cliente', s: 'cab' }, B: { v: 'Contrato', s: 'cab' }, C: { v: 'Casal / evento', s: 'cab' }, D: { v: 'Referente a', s: 'cab' }, E: { v: 'Valor (R$)', s: 'cab' } } });
  for (const l of d.semData) P.push({ n: p++, celulas: { A: { v: l.cliente, s: 'txt' }, B: { v: l.numero_os, s: 'num' }, C: { v: l.casal, s: 'txt' }, D: { v: l.tipo, s: 'txt' }, E: { v: l.valor, s: 'moeda' } } });
  if (!d.semData.length) P.push({ n: p++, celulas: { A: { v: 'Nenhum.', s: 'nota' } } });
  p++;
  P.push({ n: p++, celulas: { A: { v: 'Contratos sem nenhum recebimento lançado — registre no Painel de gestão › Recebimentos', s: 'aviso' } } });
  P.push({ n: p++, celulas: { A: { v: 'Cliente', s: 'cab' }, B: { v: 'Contrato', s: 'cab' }, C: { v: 'Casal / evento', s: 'cab' }, D: { v: 'Situação no contrato', s: 'cab' }, E: { v: 'Valor do contrato (R$)', s: 'cab' } } });
  for (const l of d.semLancamento) P.push({ n: p++, celulas: { A: { v: l.cliente, s: 'txt' }, B: { v: l.numero_os, s: 'num' }, C: { v: l.casal, s: 'txt' }, D: { v: l.situacao, s: 'txt' }, E: { v: l.valor, s: 'moeda' } } });
  if (!d.semLancamento.length) P.push({ n: p++, celulas: { A: { v: 'Nenhum.', s: 'nota' } } });

  return criarXlsx({
    estilos: ESTILOS,
    abas: [
      { nome: `RECEITAS ${d.ano}`, colunas: { A: 12, B: 34, C: 18, D: 10, E: 28, F: 15, G: 14, H: 15, I: 12 }, linhas: L, congelar: 6, impressao: { orientacao: 'landscape' } },
      { nome: 'POR MÊS', colunas: { A: 18, B: 14, C: 18 }, linhas: M, impressao: { orientacao: 'portrait' } },
      { nome: 'POR CLIENTE', colunas: { A: 34, B: 18, C: 10, D: 28, E: 14, F: 16 }, linhas: C, impressao: { orientacao: 'landscape' } },
      { nome: 'PENDÊNCIAS', colunas: { A: 34, B: 10, C: 28, D: 22, E: 20 }, linhas: P, impressao: { orientacao: 'landscape' } },
    ],
  });
}

function html(d, empresa) {
  const tab = (cab, linhas, total) => `<table><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody>${total || ''}</table>`;
  const nome = empresa.razao_social || empresa.nome_fantasia || 'Tayná Alves Assessoria';
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receitas ${d.ano}</title><style>
    @page { size: A4 landscape; margin: 14mm 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #222; }
    h1 { font-size: 15pt; color: #${MARCA}; margin: 0 0 2px; } h2 { font-size: 11.5pt; color: #${MARCA}; margin: 18px 0 6px; }
    .sub { color: #555; margin: 0; } .aviso { color: #b3261e; font-weight: bold; }
    table { border-collapse: collapse; width: 100%; margin-top: 4px; }
    th { background: #${MARCA}; color: #fff; font-size: 8.5pt; padding: 4px 5px; border: 1px solid #${MARCA}; text-align: left; }
    td { border: 1px solid #ccc; padding: 3px 5px; vertical-align: top; }
    td.n { text-align: right; white-space: nowrap; } td.c { text-align: center; }
    tfoot td { font-weight: bold; background: #f3e6df; }
    .resumo td { border: 0; padding: 2px 10px 2px 0; }
  </style></head><body>
  <h1>Receitas ${d.ano} — recebimentos de clientes</h1>
  <p class="sub">${esc(nome)}${empresa.cnpj ? ` · CNPJ ${esc(empresa.cnpj)}` : ''}</p>
  <p class="sub">Ano-calendário ${d.ano} (01/01/${d.ano} a 31/12/${d.ano}) · gerado em ${dBr(new Date().toISOString().slice(0, 10))}</p>
  <table class="resumo" style="width:auto;margin-top:10px"><tr><td><b>Total recebido no ano:</b></td><td><b>${moeda(d.total)}</b></td>
    <td>${d.linhas.length} recebimento(s) de ${d.porCliente.length} cliente(s)</td></tr></table>
  ${d.semData.length || d.semLancamento.length ? `<p class="aviso">Atenção: ${d.semData.length} recebimento(s) sem data e ${d.semLancamento.length} contrato(s) sem recebimentos lançados ficaram fora do total (ver Pendências).</p>` : ''}

  <h2>Total por mês</h2>
  ${tab(['Mês', 'Recebimentos', 'Total'], d.porMes.map((m) => `<tr><td>${m.mes}</td><td class="c">${m.quantidade}</td><td class="n">${moeda(m.total)}</td></tr>`).join(''),
    `<tfoot><tr><td>TOTAL DO ANO</td><td class="c">${d.linhas.length}</td><td class="n">${moeda(d.total)}</td></tr></tfoot>`).replace('<table>', '<table style="width:50%">')}

  <h2>Recebimentos</h2>
  ${tab(['Data', 'Cliente (contratante)', 'CPF / CNPJ', 'Contrato', 'Casal / evento', 'Referente a', 'Forma', 'Valor', 'Compr.'],
    d.linhas.map((l) => `<tr><td class="c">${dBr(l.data)}</td><td>${esc(l.cliente)}</td><td>${esc(l.documento)}</td><td class="c">${esc(l.numero_os)}</td><td>${esc(l.casal)}</td><td>${esc(l.tipo)}</td><td>${esc(l.forma)}</td><td class="n">${moeda(l.valor)}</td><td class="c">${l.comprovante ? 'sim' : 'não'}</td></tr>`).join('')
      || '<tr><td colspan="9">Nenhum recebimento com data no ano.</td></tr>',
    `<tfoot><tr><td colspan="7">TOTAL</td><td class="n">${moeda(d.total)}</td><td></td></tr></tfoot>`)}

  <h2>Total por cliente</h2>
  ${tab(['Cliente (contratante)', 'CPF / CNPJ', 'Contrato', 'Casal / evento', 'Recebimentos', 'Total'],
    d.porCliente.map((c) => `<tr><td>${esc(c.cliente)}</td><td>${esc(c.documento)}</td><td class="c">${esc(c.numero_os)}</td><td>${esc(c.casal)}</td><td class="c">${c.quantidade}</td><td class="n">${moeda(c.total)}</td></tr>`).join('')
      || '<tr><td colspan="6">—</td></tr>',
    `<tfoot><tr><td colspan="5">TOTAL</td><td class="n">${moeda(d.total)}</td></tr></tfoot>`)}

  ${d.semData.length || d.semLancamento.length ? `<h2>Pendências (fora do total)</h2>
  ${d.semData.length ? `<p><b>Recebimentos sem data</b> — informe a data no Financeiro do casal:</p>
  ${tab(['Cliente', 'Contrato', 'Casal / evento', 'Referente a', 'Valor'], d.semData.map((l) => `<tr><td>${esc(l.cliente)}</td><td class="c">${esc(l.numero_os)}</td><td>${esc(l.casal)}</td><td>${esc(l.tipo)}</td><td class="n">${moeda(l.valor)}</td></tr>`).join(''))}` : ''}
  ${d.semLancamento.length ? `<p><b>Contratos sem nenhum recebimento lançado</b> — registre no Painel de gestão › Recebimentos:</p>
  ${tab(['Cliente', 'Contrato', 'Casal / evento', 'Situação no contrato', 'Valor do contrato'], d.semLancamento.map((l) => `<tr><td>${esc(l.cliente)}</td><td class="c">${esc(l.numero_os)}</td><td>${esc(l.casal)}</td><td>${esc(l.situacao)}</td><td class="n">${moeda(l.valor)}</td></tr>`).join(''))}` : ''}` : ''}
  </body></html>`;
}

/**
 * PDF do relatório: o LibreOffice converte o próprio .xlsx (mesmas tabelas, uma aba por página); sem LibreOffice,
 * no Windows o Edge/Chrome imprime a versão HTML.
 */
function converterPdf(arqXlsx, arqHtml, pasta) {
  const pdf = path.join(pasta, path.basename(arqXlsx).replace(/\.xlsx$/, '.pdf'));
  try { fs.unlinkSync(pdf); } catch { /* não existia */ }
  const los = ['soffice'];
  if (process.platform === 'win32') los.push('C:\\Program Files\\LibreOffice\\program\\soffice.exe', 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe');
  const tentativas = los.map((lo) => [lo, ['--headless', '--convert-to', 'pdf', '--outdir', pasta, arqXlsx]]);
  if (process.platform === 'win32') {
    for (const nav of ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']) {
      tentativas.push([nav, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file:///${arqHtml.replace(/\\/g, '/')}`]]);
    }
  }
  for (const [bin, args] of tentativas) {
    if (path.isAbsolute(bin) && !fs.existsSync(bin)) continue;
    try {
      const r = spawnSync(bin, args, { stdio: 'ignore', timeout: 120000, windowsHide: true });
      if (!r.error && fs.existsSync(pdf)) return pdf;
    } catch { /* próximo */ }
  }
  return null;
}

/** Gera RECEITAS <ano> - IMPOSTO DE RENDA.xlsx e .pdf em <pasta>. */
function gerarRelatorioIR({ contratos, carregarFin, clienteDe, empresa, ano, pasta }) {
  const d = dadosRelatorio(contratos, carregarFin, clienteDe, ano);
  fs.mkdirSync(pasta, { recursive: true });
  const base = path.join(pasta, `RECEITAS ${d.ano} - IMPOSTO DE RENDA`);
  fs.writeFileSync(`${base}.xlsx`, planilha(d, empresa));
  const arqHtml = `${base}.html`;
  fs.writeFileSync(arqHtml, html(d, empresa));
  let pdf = null;
  try { pdf = converterPdf(`${base}.xlsx`, arqHtml, pasta); } finally { try { fs.unlinkSync(arqHtml); } catch { /* */ } }
  return {
    ano: d.ano, total: d.total, recebimentos: d.linhas.length, clientes: d.porCliente.length,
    sem_data: d.semData.length, sem_lancamento: d.semLancamento.length,
    xlsx: `${base}.xlsx`, pdf, pasta,
  };
}

module.exports = { dadosRelatorio, gerarRelatorioIR, planilha, html };
