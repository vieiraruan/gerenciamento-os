'use strict';

/**
 * Cria a planilha financeira do evento a partir de templates/planilha_financeira.xlsx
 * (gerado por scripts/criar_planilha.py), preenchendo os dados do evento e a linha
 * 001 (contrato com a assessoria). Nunca sobrescreve uma planilha existente, que
 * pode já ter fornecedores e pagamentos lançados.
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { parseData, parseValor } = require('./parser');

const MODELO = path.resolve(__dirname, '..', 'templates', 'planilha_financeira.xlsx');

// datas como "data local" sem fuso, para não virar o dia anterior no Excel
const utc = (d) => (d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : null);

async function criarPlanilha(destino, { brutos, dados, empresa }) {
  if (fs.existsSync(destino)) return { criada: false, arquivo: destino };

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(MODELO);
  wb.calcProperties.fullCalcOnLoad = true; // Excel/Sheets recalculam ao abrir

  const total = parseValor(dados.valor_total);
  const entrada = parseValor(dados.entrada);
  const dataEvento = brutos.evento_data ? utc(parseData(brutos.evento_data)) : null;

  const r = wb.getWorksheet('RESUMO');
  r.getCell('C5').value = `${dados.evento_tipo} de ${dados.evento_nomes}`;
  r.getCell('C6').value = dados.numero_os;
  r.getCell('C7').value = dados.contratante_nome || '';
  r.getCell('C8').value = dataEvento || `a definir${brutos.evento_periodo ? ` (${brutos.evento_periodo})` : ''}`;
  r.getCell('C9').value = brutos.evento_local || 'a definir';
  r.getCell('C10').value = Number(brutos.convidados || 0) || 'a definir';
  r.getCell('C11').value = dados.servicos_nomes;

  // Linha 001: contrato do casal com a assessoria
  const f = wb.getWorksheet('FORNECEDORES');
  const parcelas = dados.parcelas || [];
  const primeiro = parcelas.length
    ? utc(new Date(`${parcelas[0].vencimento_iso}T12:00:00`))
    : (dados.vencimento_saldo ? utc(parseData(dados.vencimento_saldo)) : null);
  const linha = {
    B: '001 - Assessoria',
    C: empresa.nome_fantasia || empresa.razao_social,
    D: `${dados.servicos_nomes} (contrato ${dados.numero_os})`,
    E: total,
    F: total ? Math.round((entrada / total) * 10000) / 10000 : 0,
    H: utc(parseData(dados.data_assinatura)),
    I: parcelas.length || 1,
    J: primeiro,
    P: empresa.pix || '',
    Q: empresa.telefone || '',
    R: 'Gerado automaticamente com o contrato.',
  };
  for (const [col, valor] of Object.entries(linha)) {
    if (valor === null || valor === undefined) continue;
    const cel = f.getCell(`${col}5`);
    cel.value = valor;
    cel.font = { ...(cel.font || {}), name: 'Arial', size: 10, color: { argb: 'FF1F4FBF' } }; // azul = sistema
  }

  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await wb.xlsx.writeFile(destino);
  return { criada: true, arquivo: destino };
}

module.exports = { criarPlanilha };
