'use strict';

const extensoLib = require('extenso');
const { parseValor, parseData } = require('./parser');

const extenso = extensoLib.default || extensoLib;

const moeda = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataBR = (d) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const dataExtenso = (d) =>
  d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

const valorExtenso = (v) => extenso(v, { mode: 'currency' });

/** Soma meses mantendo o dia (ajusta para o último dia do mês quando necessário). */
function somarMeses(data, meses) {
  const d = new Date(data.getFullYear(), data.getMonth() + meses, 1);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(data.getDate(), ultimoDia));
  return d;
}

/**
 * Gera as parcelas do saldo (valor_total - entrada).
 * Os centavos que sobram da divisão vão para a última parcela.
 */
function gerarParcelas(saldo, quantidade, primeiroVencimento) {
  if (!quantidade || quantidade < 1 || saldo <= 0) return [];
  const centavos = Math.round(saldo * 100);
  const base = Math.floor(centavos / quantidade);
  const resto = centavos - base * quantidade;

  return Array.from({ length: quantidade }, (_, i) => {
    const valor = (base + (i === quantidade - 1 ? resto : 0)) / 100;
    const vencimento = somarMeses(primeiroVencimento, i);
    return {
      numero: i + 1,
      valor,
      valor_fmt: moeda(valor),
      valor_extenso: valorExtenso(valor),
      vencimento: dataBR(vencimento),
      vencimento_iso: vencimento.toISOString().slice(0, 10),
    };
  });
}

/**
 * Enriquece os dados brutos do .txt com campos calculados
 * (valores formatados, por extenso, parcelas, datas).
 */
function enriquecer(dados, empresa = {}) {
  const out = { ...prefixar(empresa, 'contratada_'), ...dados };

  const total = parseValor(dados.valor_total);
  const entrada = parseValor(dados.entrada) || 0;
  if (total !== undefined) {
    if (entrada > total) throw new Error('A entrada não pode ser maior que o valor total.');
    const saldo = Math.round((total - entrada) * 100) / 100;
    Object.assign(out, {
      valor_total_fmt: moeda(total),
      valor_total_extenso: valorExtenso(total),
      entrada_fmt: moeda(entrada),
      entrada_extenso: valorExtenso(entrada),
      saldo_fmt: moeda(saldo),
      saldo_extenso: valorExtenso(saldo),
    });

    const qtd = Number(dados.num_parcelas || 0);
    const primeiro = parseData(dados.primeiro_vencimento);
    if (qtd > 0 && !primeiro) {
      throw new Error('Informe "primeiro_vencimento" quando houver parcelas.');
    }
    out.parcelas = gerarParcelas(saldo, qtd, primeiro);
    out.tem_parcelas = out.parcelas.length > 0;
    out.num_parcelas_extenso = qtd ? extenso(qtd, { number: { gender: 'female' } }) : '';
  }

  // Datas digitadas no .txt ganham versão por extenso: evento_data -> evento_data_extenso
  for (const [k, v] of Object.entries(dados)) {
    if (/(^|_)data($|_)/.test(k) && /^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = parseData(v);
      out[k] = dataBR(d);
      out[`${k}_extenso`] = dataExtenso(d);
    }
  }

  const assinatura = dados.data_assinatura ? parseData(dados.data_assinatura) : new Date();
  out.data_assinatura = dataBR(assinatura);
  out.data_assinatura_extenso = dataExtenso(assinatura);

  return out;
}

function prefixar(obj, prefixo) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [prefixo + k, v]));
}

module.exports = { enriquecer, gerarParcelas, moeda, valorExtenso };
