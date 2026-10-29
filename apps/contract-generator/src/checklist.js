'use strict';

/**
 * Gerador de Checklist do evento (cronograma de tarefas da assessoria).
 *
 * Vertentes (templates/checklists/<vertente>.json):
 *   destination  — modelo do casal Hanna & Ivan (casamento fora da Região Metropolitana)  ✅
 *   padrao       — casamento na Região Metropolitana do Recife                          (em breve)
 *
 * As tarefas ficam agrupadas por "meses antes do evento"; com a data do evento, cada etapa
 * ganha o período (de/até) e a situação em relação a hoje (vencida / atual / futura).
 * A planilha .xlsx segue o visual do "CRONOGRAMA - CHECK LIST" da planilha de assessoria.
 */
const fs = require('fs');
const path = require('path');
const { parseData } = require('./parser');
const { criarXlsx } = require('./xlsx');

const RAIZ = path.resolve(__dirname, '..');
const DIR_MODELOS = path.join(RAIZ, 'templates', 'checklists');
const LOGO = path.join(RAIZ, 'templates', 'marca', 'logo.png');

const VERTENTES = {
  destination: { nome: 'Destination', arquivo: 'destination.json', disponivel: true },
  padrao: { nome: 'Sem destination', arquivo: 'padrao.json', disponivel: false },
};

function listarVertentes() {
  return Object.entries(VERTENTES).map(([id, v]) => ({
    id, nome: v.nome, disponivel: v.disponivel && fs.existsSync(path.join(DIR_MODELOS, v.arquivo)),
  }));
}

function carregarModelo(vertente) {
  const v = VERTENTES[vertente];
  if (!v) throw new Error(`Vertente de checklist desconhecida: ${vertente}`);
  const arq = path.join(DIR_MODELOS, v.arquivo);
  if (!v.disponivel || !fs.existsSync(arq)) throw new Error(`O checklist "${v.nome}" ainda não está disponível.`);
  return JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
}

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------
function somarMeses(data, n) {
  const d = new Date(data.getFullYear(), data.getMonth() + n, 1);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(data.getDate(), ultimo));
  return d;
}
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dataBr = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hojeSemHora = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); };

function rotuloMeses(m) { return m === 1 ? '1 MÊS ANTES' : `${m} MESES ANTES`; }

// ---------------------------------------------------------------------------
// Situação das tarefas (marcadas no app ou vindas da planilha do casal)
// ---------------------------------------------------------------------------
const CONCLUIDO = new Set(['FINALIZADO', 'NÃO SE APLICA', 'NÃO DESEJO']);
const chaveTarefa = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'com', 'para', 'por', 'na', 'no', 'nas', 'nos', 'em', 'um', 'uma', 'se', 'ou', 'que', 'ja', 'foi', 'caso', 'seja', 'outros', 'outras', 'nao', 'sim', 'estiver', 'necessario']);
const palavras = (s) => new Set(chaveTarefa(s).split(' ').filter((w) => w.length > 1 && !VAZIAS.has(w)).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w)));

function semelhanca(a, b) {
  const A = palavras(a); const B = palavras(b);
  if (!A.size || !B.size) return 0;
  let comum = 0;
  const igual = (w, v) => w === v || (Math.min(w.length, v.length) >= 4 && (w.startsWith(v) || v.startsWith(w)));
  for (const w of A) if ([...B].some((v) => igual(w, v))) comum++;
  if (comum < 2 && !(A.size === 1 && B.size === 1 && comum === 1)) return 0;
  if (comum / Math.max(A.size, B.size) <= 0.4 && !(comum === Math.min(A.size, B.size) && comum >= 2)) return 0;
  return comum / Math.min(A.size, B.size) * (comum / Math.max(A.size, B.size)) ** 0.1;
}

const normalizarStatus = (st) => {
  const k = chaveTarefa(st).toUpperCase();
  if (!k) return '';
  if (/FINALIZ|CONCLU|FEITO|OK$/.test(k)) return 'FINALIZADO';
  if (/NAO SE APLICA|N A$/.test(k)) return 'NÃO SE APLICA';
  if (/NAO DESEJ/.test(k)) return 'NÃO DESEJO';
  if (/COTA/.test(k)) return 'EM COTAÇÃO';
  if (/ANDAMENTO|INICIAD/.test(k)) return 'EM ANDAMENTO';
  return '';
};

/**
 * Casa as tarefas da planilha do casal (aba ASSESSORIA) com as do modelo: cada tarefa do modelo fica com a da
 * planilha mais parecida (texto), se for parecida o bastante.
 */
function casarTarefasPlanilha(itensModelo, daPlanilha) {
  const res = new Map();
  const usadas = new Set();
  const pares = [];
  itensModelo.forEach((it) => (daPlanilha || []).forEach((p, j) => {
    const v = semelhanca(it.texto, p.item);
    if (v >= 0.55) pares.push([v, it.chave, j]);
  }));
  pares.sort((x, y) => y[0] - x[0]);
  for (const [, k, j] of pares) {
    if (res.has(k) || usadas.has(j)) continue;
    res.set(k, daPlanilha[j]);
    usadas.add(j);
  }
  res.sobras = (daPlanilha || []).filter((p, j) => !usadas.has(j));
  return res;
}

/** Situação efetiva de cada tarefa: a edição mais recente vence (app x planilha). */
function situacaoTarefas(itensModelo, evento) {
  const doApp = (evento && evento.tarefas) || {};
  const pl = evento && evento.planilha;
  const quandoPl = pl ? new Date(pl.modificada_em || pl.lido_em || 0) : new Date(0);
  const casadas = casarTarefasPlanilha(itensModelo, evento && evento.tarefas_planilha);
  const out = {};
  out.__sobras = casadas.sobras || [];
  for (const it of itensModelo) {
    const a = doApp[it.chave];
    const p = casadas.get(it.chave);
    const pStatus = p ? normalizarStatus(p.status) : '';
    const usarApp = a && (a.status || a.obs) && (!p || !pStatus || new Date(a.editado_em || 0) >= quandoPl);
    if (usarApp) out[it.chave] = { ...a, origem: 'app' };
    else if (p && (pStatus || p.obs || p.fornecedor)) {
      out[it.chave] = { status: pStatus, obs: p.obs || '', fornecedor: p.fornecedor || '', origem: 'planilha', item_planilha: p.item };
    } else if (a) out[it.chave] = { ...a, origem: 'app' };
  }
  return out;
}

const mesesEntre = (de, ate) => {
  let m = (ate.getFullYear() - de.getFullYear()) * 12 + (ate.getMonth() - de.getMonth());
  if (ate.getDate() < de.getDate()) m -= 1;
  return m;
};

/**
 * Monta o cronograma de tarefas a partir do contrato, da vertente e do que já foi feito.
 *
 * - Tarefas concluídas (FINALIZADO / NÃO SE APLICA / NÃO DESEJO) saem do cronograma e vão para "Concluídas".
 * - As que faltam são redistribuídas nos meses que faltam até o casamento, com carga parecida por mês
 *   (faltam N tarefas em M meses → cerca de N/M por mês), sem passar do prazo de cada uma no modelo.
 *   Quanto mais rápido as tarefas são concluídas, menos fica para cada mês; atrasadas entram no mês atual.
 * - Ritmo: concluídas x esperadas até hoje pelo modelo, tarefas por mês necessárias.
 * @param {object} contrato campos do .txt do contrato (evento_nomes, evento_data, data_assinatura...)
 * @param {object} [evento] dados do evento (tarefas marcadas no app e tarefas da planilha do casal)
 */
function montarChecklist(contrato, vertente = 'destination', hoje = hojeSemHora(), evento = null) {
  const modelo = carregarModelo(vertente);
  let data = null;
  try { data = contrato.evento_data ? parseData(contrato.evento_data) : null; } catch { data = null; }
  let inicio = null;
  try { inicio = contrato.data_assinatura ? parseData(contrato.data_assinatura) : null; } catch { inicio = null; }

  // itens do modelo com ordem e chave
  let ordem = 0;
  const itens = [];
  modelo.secoes.slice().sort((a, b) => b.meses - a.meses).forEach((s) => s.itens.forEach((i) => {
    itens.push({ ordem: ++ordem, texto: i.texto, sugerido: Boolean(i.sugerido), chave: chaveTarefa(i.texto), meses_modelo: s.meses });
  }));
  const sit = situacaoTarefas(itens, evento);
  // tarefas da planilha do casal que não existem no modelo: entram também (nada se perde)
  for (const p of sit.__sobras) {
    if (!String(p.item || '').trim() || /^\s*\d+\s*m[eê]s/i.test(p.item)) continue;
    const k = `pl ${chaveTarefa(p.item)}`;
    const a = ((evento && evento.tarefas) || {})[k];
    const quandoPl = new Date((evento && evento.planilha && (evento.planilha.modificada_em || evento.planilha.lido_em)) || 0);
    const usarApp = a && new Date(a.editado_em || 0) >= quandoPl;
    sit[k] = usarApp ? { ...a, origem: 'app' } : { status: normalizarStatus(p.status), obs: p.obs || '', fornecedor: p.fornecedor || '', origem: 'planilha' };
    itens.push({ ordem: ++ordem, texto: String(p.item).replace(/\s+/g, ' ').trim(), sugerido: false, chave: k, meses_modelo: Math.max(1, Math.min(12, Number(p.meses) || 1)), da_planilha: true });
  }
  for (const it of itens) {
    const st = sit[it.chave] || {};
    Object.assign(it, {
      status: st.status || '', obs: st.obs || '', fornecedor: st.fornecedor || '', concluida_em: st.concluida_em || '',
      origem: st.origem || '', concluida: CONCLUIDO.has(st.status),
    });
  }

  const futuro = Boolean(data && data > hoje);
  // meses que faltam, contando o mês corrente
  const meses = futuro ? Math.max(1, Math.min(12, mesesEntre(hoje, data) + 1)) : 0;
  // linha de base: o modelo (12 meses) comprimido no tempo entre a assinatura e o casamento
  // sem data de assinatura: usa a 1ª etapa da planilha do casal (ex.: começou em "6 MESES antes")
  const daPlanilha = Math.max(0, ...((evento && evento.tarefas_planilha) || []).map((t) => Number(t.meses) || 0));
  const total = data && inicio && inicio < data ? Math.max(1, Math.min(12, mesesEntre(inicio, data) + 1))
    : daPlanilha ? Math.min(12, daPlanilha) : 12;
  for (const it of itens) it.mes_base = Math.max(1, Math.ceil((it.meses_modelo * total) / 12));

  const pendentes = itens.filter((i) => !i.concluida);
  const concluidas = itens.filter((i) => i.concluida);
  const grupos = new Map();
  if (futuro) {
    // cada tarefa fica no mês previsto (atrasadas: no mês atual); mês com tarefas demais passa o excesso
    // (as de prazo mais tarde) para o mês seguinte. Nunca adianta uma tarefa: só adia quando o mês lota.
    const porMes = Math.ceil(pendentes.length / meses) || 0;
    let excesso = [];
    for (let m = meses; m >= 1; m--) {
      const doMes = pendentes.filter((i) => Math.min(i.mes_base, meses) === m);
      const lista = [...excesso, ...doMes].sort((a, b) => b.mes_base - a.mes_base || a.ordem - b.ordem);
      const naturais = doMes.filter((i) => i.mes_base === m).length;
      const fica = m === 1 ? lista : lista.slice(0, Math.max(porMes, naturais));
      excesso = m === 1 ? [] : lista.slice(fica.length);
      for (const it of fica) it.adiada = Math.min(it.mes_base, meses) !== m;
      if (fica.length) grupos.set(m, fica);
    }
    for (const it of pendentes) it.atrasada = it.mes_base > meses;
  } else {
    for (const it of pendentes) {
      if (!grupos.has(it.mes_base)) grupos.set(it.mes_base, []);
      grupos.get(it.mes_base).push(it);
    }
  }

  const secoes = [...grupos.entries()].sort((a, b) => b[0] - a[0]).map(([m, lista]) => {
    let ini = null; let fim = null; let situacao = null;
    if (data) {
      ini = somarMeses(data, -m);
      if (futuro && m === meses && ini < hoje) ini = hoje;
      fim = somarDias(m > 1 ? somarMeses(data, -(m - 1)) : data, -1);
      situacao = hoje > fim ? 'vencida' : hoje >= ini ? 'atual' : 'futura';
    }
    return {
      meses: m, rotulo: rotuloMeses(m), inicio: ini && dataBr(ini), fim: fim && dataBr(fim), situacao,
      itens: lista.sort((a, b) => a.ordem - b.ordem),
    };
  });

  // ritmo
  const esperadas = futuro ? itens.filter((i) => i.mes_base > meses).length : itens.length;
  // início do trabalho: assinatura do contrato, mas não antes de "total" meses do casamento (o modelo tem 12)
  const inicioBase = data ? (inicio && mesesEntre(inicio, data) + 1 <= total ? inicio : somarMeses(data, -total)) : inicio;
  const decorridos = inicioBase && inicioBase < hoje ? Math.max(1, mesesEntre(inicioBase, hoje) + 1) : null;
  const ritmo = {
    total: itens.length,
    concluidas: concluidas.length,
    pendentes: pendentes.length,
    em_andamento: pendentes.filter((i) => i.status).length,
    percentual: itens.length ? Math.round((concluidas.length / itens.length) * 100) : 0,
    esperadas_ate_hoje: esperadas,
    saldo: concluidas.length - esperadas, // > 0 adiantado, < 0 atrasado
    atrasadas: pendentes.filter((i) => i.atrasada).length,
    por_mes_necessario: futuro ? Math.round((pendentes.length / meses) * 10) / 10 : null,
    por_mes_atual: decorridos ? Math.round((concluidas.length / decorridos) * 10) / 10 : null,
  };
  if (futuro && ritmo.por_mes_atual) {
    const mesesParaTerminar = pendentes.length / ritmo.por_mes_atual;
    ritmo.previsao_termino = dataBr(somarDias(hoje, Math.round(mesesParaTerminar * 30.4)));
    ritmo.termina_antes = somarDias(hoje, Math.round(mesesParaTerminar * 30.4)) <= data;
  }
  ritmo.situacao = !futuro ? null : ritmo.saldo >= 0 ? (ritmo.saldo > 0 ? 'adiantado' : 'em_dia') : 'atrasado';

  return {
    vertente,
    titulo: modelo.titulo,
    status: modelo.status,
    evento: {
      numero_os: contrato.numero_os || '',
      nomes: String(contrato.evento_nomes || '').replace(/\s+/g, ' ').trim(),
      data: data ? dataBr(data) : '',
      data_extenso: data ? data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
      periodo: contrato.evento_periodo || '',
      horario: (evento && evento.info && evento.info.hora_cerimonia) || contrato.evento_horario || '',
      local: contrato.evento_local || '',
      convidados: (evento && evento.info && evento.info.convidados) || contrato.convidados || '',
      padrinhos: (evento && evento.info && evento.info.padrinhos) || contrato.padrinhos || contrato.casais_padrinhos || '',
      criancas: (evento && evento.info && evento.info.criancas) || contrato.criancas || '',
    },
    total_itens: itens.length,
    meses_restantes: meses,
    comprimido: futuro && meses < 12,
    gerado_em: dataBr(hoje),
    ritmo,
    secoes,
    concluidas: concluidas.sort((a, b) => a.ordem - b.ordem),
    planilha_tarefas: evento && evento.tarefas_planilha ? evento.tarefas_planilha.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Planilha
// ---------------------------------------------------------------------------
const MARCA = '97492D';
const MARCA_ESCURA = '8D432A';
const ESTILOS = {
  cab: { negrito: true, cor: 'FFFFFF', fundo: MARCA, alinhar: 'center', borda: 'medium', corBorda: MARCA, tamanho: 12 },
  rot: { negrito: true, borda: 'thin', alinhar: 'left', cor: '3A2A25' },
  val: { borda: 'thin', alinhar: 'left', quebrar: true },
  colcab: { negrito: true, cor: 'FFFFFF', fundo: MARCA_ESCURA, alinhar: 'center', borda: 'medium', corBorda: MARCA_ESCURA, quebrar: true },
  secao: { negrito: true, cor: 'FFFFFF', fundo: MARCA, alinhar: 'center', borda: 'medium', corBorda: MARCA },
  ordem: { negrito: true, alinhar: 'center', borda: 'thin' },
  item: { tamanho: 10, alinhar: 'left', quebrar: true, borda: 'thin' },
  status: { negrito: true, alinhar: 'center', borda: 'thin', tamanho: 10 },
  obs: { tamanho: 10, alinhar: 'left', quebrar: true, borda: 'thin' },
  moeda: { formato: '"R$" #,##0.00', borda: 'thin', alinhar: 'right' },
  total: { negrito: true, alinhar: 'right', borda: 'medium', corBorda: MARCA, fundo: 'F3E6DF' },
  totalMoeda: { negrito: true, formato: '"R$" #,##0.00', borda: 'medium', corBorda: MARCA, fundo: 'F3E6DF', alinhar: 'right' },
  nota: { italico: true, tamanho: 9, cor: '7B6F6A' },
};
const DESTAQUES = [
  { fundo: 'E2F0D9', cor: '375623', negrito: true }, // FINALIZADO
  { fundo: 'FFF2CC', cor: '7F6000', negrito: true }, // EM ANDAMENTO
  { fundo: 'DDEBF7', cor: '1F4E78', negrito: true }, // EM COTAÇÃO
  { fundo: 'EDEDED', cor: '7F7F7F', negrito: true }, // NÃO SE APLICA / NÃO DESEJO
];

function alturaTexto(texto, porLinha = 62) {
  const linhas = String(texto).split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / porLinha)), 0);
  return Math.max(18, 13.5 * linhas + 4);
}

function planilhaChecklist(ck) {
  const L = [];
  const mesclas = [];
  const e = ck.evento;
  const linha = (n, celulas, altura) => L.push({ n, celulas, altura });

  linha(2, { B: { v: 'INFORMAÇÕES', s: 'cab' }, C: { s: 'cab' }, D: { s: 'cab' }, E: { s: 'cab' } }, 22);
  mesclas.push('B2:E2');
  linha(3, { B: { v: 'NOIVOS:', s: 'rot' }, C: { v: e.nomes.toUpperCase(), s: 'val' }, D: { s: 'val' }, E: { s: 'val' } });
  mesclas.push('C3:E3');
  linha(4, {
    B: { v: 'DATA DO EVENTO:', s: 'rot' },
    C: { v: e.data ? `${e.data} (${e.data_extenso.split(',')[0]})` : (e.periodo ? `A definir (${e.periodo})` : 'A definir'), s: 'val' },
    D: { v: 'HORÁRIO:', s: 'rot' }, E: { v: e.horario || 'A definir', s: 'val' },
  });
  linha(5, {
    B: { v: 'QTD. CONVIDADOS:', s: 'rot' }, C: { v: Number(e.convidados) || e.convidados || '', s: 'val' },
    D: { v: 'CASAIS DE PADRINHOS:', s: 'rot' }, E: { v: Number(e.padrinhos) || e.padrinhos || '', s: 'val' },
  });
  linha(6, {
    B: { v: 'QTD. CRIANÇAS:', s: 'rot' }, C: { v: Number(e.criancas) || e.criancas || '', s: 'val' },
    D: { v: 'CONTRATO:', s: 'rot' }, E: { v: [e.numero_os, 'Destination'].filter(Boolean).join(' · '), s: 'val' },
  });
  linha(7, { B: { v: 'LOCAL:', s: 'rot' }, C: { v: e.local || 'A definir', s: 'val' }, D: { s: 'val' }, E: { s: 'val' } },
    alturaTexto(e.local || '', 90));
  mesclas.push('C7:E7');

  const sobre = ck.meses_restantes
    ? ` · ${ck.meses_restantes === 1 ? '1 MÊS' : `${ck.meses_restantes} MESES`} ATÉ O CASAMENTO (calculado em ${ck.gerado_em})` : '';
  const r = ck.ritmo || {};
  if (r.total) {
    const sitTxt = { adiantado: `adiantado (${r.saldo} tarefa(s) à frente)`, em_dia: 'em dia', atrasado: `atrasado (${-r.saldo} tarefa(s) atrás)` }[r.situacao] || '';
    const partes = [`${r.concluidas} de ${r.total} tarefas concluídas (${r.percentual}%)`, sitTxt && `ritmo: ${sitTxt}`,
      r.por_mes_necessario != null && `faltam ${r.pendentes} → cerca de ${String(r.por_mes_necessario).replace('.', ',')} por mês`];
    linha(8, { B: { v: partes.filter(Boolean).join('   ·   '), s: 'nota' } });
  }
  linha(9, Object.fromEntries('BCDEFGH'.split('').map((c, i) => [c, { v: i ? undefined : `${ck.titulo}${sobre}`, s: 'cab' }])), 24);
  mesclas.push('B9:H9');
  const cab = ['ORDEM', 'ITENS', 'STATUS', 'OBSERVAÇÕES', 'ESTIMATIVA (R$)', 'VALOR FINAL (R$)', 'FORNECEDOR'];
  linha(10, Object.fromEntries('BCDEFGH'.split('').map((c, i) => [c, { v: cab[i], s: 'colcab' }])), 20);

  let n = 11;
  const primeiraItem = n + 1;
  const blocos = ck.secoes.map((s) => ({ titulo: `${s.rotulo}${s.inicio ? `   ·   de ${s.inicio} a ${s.fim}` : ''}`, itens: s.itens }));
  if ((ck.concluidas || []).length) blocos.push({ titulo: `JÁ CONCLUÍDAS (${ck.concluidas.length})`, itens: ck.concluidas });
  for (const bl of blocos) {
    linha(n, Object.fromEntries('BCDEFGH'.split('').map((c, i) => [c, { v: i ? undefined : bl.titulo, s: 'secao' }])), 19);
    mesclas.push(`B${n}:H${n}`);
    n++;
    for (const it of bl.itens) {
      const obs = [it.atrasada ? 'Prazo original já passou' : '', it.obs].filter(Boolean).join(' · ');
      linha(n, {
        B: { v: it.ordem, s: 'ordem' }, C: { v: it.texto, s: 'item' }, D: { v: it.status || undefined, s: 'status' }, E: { v: obs || undefined, s: 'obs' },
        F: { s: 'moeda' }, G: { s: 'moeda' }, H: { v: it.fornecedor || undefined, s: 'obs' },
      }, Math.max(alturaTexto(it.texto), alturaTexto(obs, 40)));
      n++;
    }
  }
  const ultimaItem = n - 1;
  linha(n, {
    B: { s: 'total' }, C: { s: 'total' }, D: { s: 'total' }, E: { v: 'TOTAL', s: 'total' },
    F: { f: `SUM(F${primeiraItem}:F${ultimaItem})`, s: 'totalMoeda' },
    G: { f: `SUM(G${primeiraItem}:G${ultimaItem})`, s: 'totalMoeda' }, H: { s: 'total' },
  }, 20);
  linha(n + 2, { B: { v: `Gerado pelo sistema Tayná Alves Assessoria em ${dataBr(new Date())}.`, s: 'nota' } });

  const faixa = `D${primeiraItem}:D${ultimaItem}`;
  return criarXlsx({
    estilos: ESTILOS,
    abas: [{
      nome: 'CHECKLIST',
      colunas: { A: 2.5, B: 22, C: 58, D: 23, E: 34, F: 17, G: 17, H: 26 },
      linhas: L,
      mesclas,
      congelar: 11,
      semGrade: true,
      validacoes: [{ sqref: faixa, lista: ck.status }],
      destaques: DESTAQUES,
      condicional: [{
        sqref: faixa,
        regras: [
          { valor: 'FINALIZADO', dxf: 0 }, { valor: 'EM ANDAMENTO', dxf: 1 }, { valor: 'EM COTAÇÃO', dxf: 2 },
          { valor: 'NÃO SE APLICA', dxf: 3 }, { valor: 'NÃO DESEJO', dxf: 3 },
        ],
      }],
      imagem: fs.existsSync(LOGO)
        ? { png: fs.readFileSync(LOGO), col: 'G', linha: 2, dx: 20, dy: 2, largura: 176, altura: 132 }
        : null,
    }],
  });
}

function nomeArquivoChecklist(ck, sufixo = '') {
  const nomes = ck.evento.nomes.replace(/[\\/:*?"<>|]/g, '').trim() || 'Evento';
  const v = ck.vertente === 'destination' ? 'DESTINATION' : 'EVENTO';
  return `CHECKLIST ${v} - ${nomes}${sufixo}.xlsx`;
}

/**
 * Grava a planilha na pasta do casal. Nunca sobrescreve: se já existir, devolve
 * { existe: true } — com novaVersao=true grava uma cópia com data e hora no nome.
 */
function gravarChecklist(ck, pastaCasal, { novaVersao = false } = {}) {
  fs.mkdirSync(pastaCasal, { recursive: true });
  let arquivo = path.join(pastaCasal, nomeArquivoChecklist(ck));
  if (fs.existsSync(arquivo)) {
    if (!novaVersao) return { existe: true, arquivo };
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    arquivo = path.join(pastaCasal, nomeArquivoChecklist(ck, ` (${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}h${p(d.getMinutes())})`));
  }
  fs.writeFileSync(arquivo, planilhaChecklist(ck));
  return { existe: false, arquivo };
}

module.exports = {
  CONCLUIDO, chaveTarefa, normalizarStatus, casarTarefasPlanilha, listarVertentes, carregarModelo, montarChecklist, planilhaChecklist, gravarChecklist, nomeArquivoChecklist,
};
