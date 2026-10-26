'use strict';

/**
 * Regras do contrato da assessoria: serviços contratados, equipe, horários,
 * prazos e números por extenso no padrão "06 (seis)".
 */
const extensoLib = require('extenso');
const { parseValor, parseData } = require('./parser');
const { moeda, valorExtenso } = require('./calculos');

const extenso = extensoLib.default || extensoLib;

/** 6 -> "06 (seis)"; 130 -> "130 (cento e trinta)" */
function numFmt(n, genero = 'male') {
  const v = Number(n);
  const txt = extenso(v, { number: { gender: genero } });
  return `${String(v).padStart(2, '0')} (${txt})`;
}

const pctFmt = (p) => `${String(p).replace('.', ',')}% (${extenso(p, { number: { gender: 'male' } })} por cento)`;

/** "a, b e c" */
const juntar = (itens) =>
  itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;

const lista = (s) => String(s || '').split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean);

/** "15:00", "15h", "15h30" -> minutos desde 00:00 */
function parseHora(texto) {
  const m = /^(\d{1,2})\s*(?:[:hH]\s*(\d{2})?)?\s*h?$/.exec(String(texto || '').trim());
  if (!m) throw new Error(`Horário inválido (use 15:00 ou 15h): ${texto}`);
  return Number(m[1]) * 60 + Number(m[2] || 0);
}

const horaFmt = (min) => {
  const t = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

const dataExtenso = (d) =>
  d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const dataBR = (d) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Monta os campos do contrato modular a partir dos dados do .txt (já com cliente)
 * e do catálogo de serviços.
 */
function montarContrato(d, catalogo) {
  const out = {};

  // ---- Serviços -----------------------------------------------------------
  const ids = lista(d.servicos);
  const cortesias = lista(d.servicos_cortesia);
  if (!ids.length) throw new Error('Informe "servicos:" (ex.: servicos: dia_d).');
  const desconhecidos = [...ids, ...cortesias].filter((id) => !catalogo[id]);
  if (desconhecidos.length) {
    throw new Error(
      `Serviço(s) não encontrado(s): ${desconhecidos.join(', ')}. ` +
      `Disponíveis: ${Object.keys(catalogo).filter((k) => !k.startsWith('_')).join(', ')}`,
    );
  }
  const contratados = ids.map((id) => ({ id, ...catalogo[id] }));
  const gratis = cortesias.map((id) => ({ id, ...catalogo[id] }));

  for (const s of [...contratados, ...gratis]) {
    for (const secao of s.secoes) out[`secao_${secao}`] = true;
  }
  out.servicos_descricao = juntar(contratados.map((s) => s.descricao));
  out.servicos_nomes = juntar(contratados.map((s) => s.nome));
  out.tem_cortesia = gratis.length > 0;
  out.cortesia_nomes = juntar(gratis.map((s) => `"${s.nome}" (${s.descricao})`));
  out.servicos_lista = contratados.map((s) => ({
    nome: s.nome, descricao: s.descricao, preco_tabela_fmt: moeda(s.preco),
  }));
  out.linha = contratados.some((s) => s.linha === 'AS') ? 'AS' : 'CE';
  out.linha_nome = out.linha === 'AS' ? 'Assessoria' : 'Cerimonial';

  // ---- Valores ------------------------------------------------------------
  const precoTabela = contratados.reduce((t, s) => t + s.preco, 0);
  const total = d.valor_total ? parseValor(d.valor_total) : precoTabela;
  out.valor_total = String(total);
  out.preco_tabela_fmt = moeda(precoTabela);
  out.desconto_fmt = total < precoTabela ? moeda(precoTabela - total) : '';

  const pct = d.entrada_percentual !== undefined
    ? Number(String(d.entrada_percentual).replace('%', '').replace(',', '.'))
    : d.entrada ? Math.round((parseValor(d.entrada) / total) * 1000) / 10 : 30;
  if (!(pct >= 0 && pct <= 100)) throw new Error(`entrada_percentual inválido: ${d.entrada_percentual}`);
  out.entrada = d.entrada || String(Math.round(total * pct) / 100);
  out.entrada_percentual_fmt = pctFmt(pct);

  const prazo = Number(d.prazo_quitacao_dias || 15);
  out.prazo_quitacao_fmt = numFmt(prazo);

  const adicional = parseValor(d.valor_profissional_adicional || 350);
  out.adicional_fmt = moeda(adicional);
  out.adicional_extenso = valorExtenso(adicional);

  // ---- Evento -------------------------------------------------------------
  out.evento_tipo = d.evento_tipo || 'casamento';
  if (d.evento_data) {
    const data = parseData(d.evento_data);
    out.evento_quando = `no dia ${dataExtenso(data)}`;
    out.evento_dia_semana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
    const venc = new Date(data);
    venc.setDate(venc.getDate() - prazo);
    out.vencimento_saldo = dataBR(venc);
    out.tem_vencimento = true;
  } else {
    out.evento_quando = `em data a ser definida${d.evento_periodo ? `, prevista para ${d.evento_periodo}` : ''}`;
    out.tem_vencimento = false;
  }

  out.destination = /^(s|sim|true|1)$/i.test(d.destination || '');
  if (d.evento_local) {
    out.evento_local_frase = `no local ${d.evento_local}`;
  } else if (out.destination) {
    out.evento_local_frase = 'em local para cerimônia e recepção a ser definido pela CONTRATANTE, ' +
      'fora da Região Metropolitana do Recife (destination), aplicando-se as condições especiais previstas ' +
      'neste contrato';
  } else {
    out.evento_local_frase = 'em local para cerimônia e recepção a ser definido, desde que situado na Região ' +
      'Metropolitana do Recife, abrangendo também Aldeia, Porto de Galinhas e Olinda';
  }

  const convidados = Number(d.convidados || 150);
  const padrinhos = Number(d.casais_padrinhos || 8);
  const criancas = Number(d.criancas || 4);
  out.convidados_fmt = numFmt(convidados);
  out.casais_padrinhos_fmt = numFmt(padrinhos);
  out.criancas_fmt = numFmt(criancas, 'female');

  // ---- Equipe e horários --------------------------------------------------
  const equipe = Math.max(2, Number(d.qtd_equipe || 2));
  const assistentes = equipe - 1;
  out.equipe_fmt = numFmt(equipe);
  out.assistentes_fmt = numFmt(assistentes);
  out.assistentes_palavra = assistentes === 1 ? 'assistente' : 'assistentes';

  const antecedencia = Number(d.supervisao_antecedencia_horas || 3);
  out.supervisao_antecedencia_fmt = numFmt(antecedencia, 'female');

  const duracao = Number(d.cerimonial_horas || 6);
  out.cerimonial_horas_fmt = numFmt(duracao, 'female');
  if (d.evento_horario) {
    const ini = parseHora(d.evento_horario);
    out.evento_horario = horaFmt(ini);
    out.cerimonial_inicio = horaFmt(ini - 60);
    out.cerimonial_fim = horaFmt(ini - 60 + duracao * 60);
    out.supervisao_chegada = horaFmt(ini - antecedencia * 60);
    out.tem_horario = true;
  } else {
    out.tem_horario = false;
  }

  return out;
}

module.exports = { montarContrato, numFmt, juntar, parseHora, horaFmt };
