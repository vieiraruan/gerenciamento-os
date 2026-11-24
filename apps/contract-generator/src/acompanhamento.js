'use strict';

/**
 * Acompanhamento de um casal: burndown das atividades do cronograma e alertas de atrasos (atividades e pagamentos).
 * Usado pelo painel do casal (Tayná) e pela área do casal.
 */

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deIso = (s) => { const [a, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };
const deBr = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim()); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
const hojeIso = () => iso(new Date());
const dBr = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const moeda = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function somarMeses(d, n) {
  const base = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return new Date(base.getFullYear(), base.getMonth(), Math.min(d.getDate(), ultimo));
}
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const diasEntre = (a, b) => Math.round((deIso(b) - deIso(a)) / 864e5);

/**
 * Burndown: tarefas que faltam ao longo do tempo, do início do planejamento até o casamento.
 *  - planejado: o que o cronograma prevê que ainda falte em cada data (cada tarefa vence no fim da sua etapa);
 *  - real: o que de fato faltava (pela data em que cada tarefa foi concluída). Tarefas concluídas sem data
 *    (vindas da planilha) contam como feitas no prazo previsto, ou na data da planilha se for antes de hoje.
 * @param {object} ck resultado de montarChecklist
 * @param {object} [evento] dados do evento (planilha.modificada_em)
 */
function burndown(ck, evento = null, hoje = hojeIso()) {
  const data = deBr(ck && ck.evento && ck.evento.data);
  if (!ck || !data) return null;
  const itens = [...ck.secoes.flatMap((s) => s.itens), ...ck.concluidas];
  if (!itens.length) return null;
  const total = itens.length;
  const maxMes = Math.max(1, ...itens.map((i) => Number(i.mes_base) || 1));
  const inicio = somarMeses(data, -maxMes);
  const hojeD = deIso(hoje);
  const fimReal = hojeD < data ? hojeD : data;
  const plDate = evento && evento.planilha && (evento.planilha.modificada_em || evento.planilha.lido_em);
  const daPlanilha = plDate ? deIso(iso(new Date(plDate))) : null;
  const prazo = (i) => { const m = Number(i.mes_base) || 1; return m <= 1 ? data : somarDias(somarMeses(data, -(m - 1)), -1); };
  const prazos = itens.map(prazo);
  const feitas = itens.filter((i) => i.concluida).map((i, k) => {
    if (i.concluida_em) return deIso(iso(new Date(i.concluida_em)));
    const p = prazo(i);
    const ref = daPlanilha && daPlanilha < hojeD ? daPlanilha : hojeD;
    return p < ref ? p : ref;
  }).map((d) => (d < inicio ? inicio : d));

  // um ponto por semana, mais hoje e o dia do casamento
  const datas = [];
  for (let d = inicio; d < data; d = somarDias(d, 7)) datas.push(d);
  datas.push(data);
  if (hojeD > inicio && hojeD < data && !datas.some((d) => iso(d) === hoje)) datas.push(hojeD);
  datas.sort((a, b) => a - b);
  const pontos = datas.map((d) => ({
    data: iso(d),
    planejado: total - prazos.filter((p) => p <= d).length,
    real: d <= fimReal ? total - feitas.filter((f) => f <= d).length : null,
  }));
  const restantes = total - feitas.length;
  const esperado = total - prazos.filter((p) => p <= fimReal).length;
  // projeção: ritmo das últimas 8 semanas (ou desde o início)
  let previsao = null;
  if (hojeD < data && restantes > 0) {
    const desde = new Date(Math.max(inicio, somarDias(hojeD, -56)));
    const semanas = Math.max(1, (hojeD - desde) / (7 * 864e5));
    const ritmo = feitas.filter((f) => f > desde && f <= hojeD).length / semanas;
    if (ritmo > 0) previsao = iso(somarDias(hojeD, Math.ceil((restantes / ritmo) * 7)));
  }
  return {
    inicio: iso(inicio), casamento: iso(data), hoje, total, concluidas: feitas.length, restantes, esperado_hoje: esperado,
    diferenca: esperado - restantes, // > 0 adiantado, < 0 atrasado
    previsao, termina_antes: previsao ? previsao <= iso(data) : restantes === 0, pontos,
  };
}

/**
 * Alertas do casal, do mais grave para o mais leve. nivel: 'critico' (atrasado), 'aviso' (vence logo), 'info'.
 * @param {object} o { ck, resumoFin (financeiro.resumo), recebimento (gestao.recebimentoCasal) | null, dataEvento ISO }
 */
function alertas({ ck = null, resumoFin = null, recebimento = null, dataEvento = '' } = {}, hoje = hojeIso()) {
  const out = [];
  const futuro = !dataEvento || dataEvento >= hoje;
  if (ck && futuro) {
    const atrasadas = ck.secoes.flatMap((s) => s.itens).filter((i) => i.atrasada && !i.concluida);
    if (atrasadas.length) {
      out.push({ nivel: 'critico', tipo: 'atividade', titulo: `${atrasadas.length} atividade(s) atrasada(s)`,
        texto: atrasadas.slice(0, 4).map((i) => i.texto.replace(/\s+/g, ' ').slice(0, 70)).join(' · ') + (atrasadas.length > 4 ? ' …' : '') });
    } else if (ck.ritmo && ck.ritmo.situacao === 'atrasado') {
      out.push({ nivel: 'aviso', tipo: 'atividade', titulo: 'Ritmo abaixo do previsto', texto: `${-ck.ritmo.saldo} atividade(s) atrás do cronograma.` });
    }
    const atual = ck.secoes.find((s) => s.situacao === 'atual');
    const doMes = atual ? atual.itens.filter((i) => !i.concluida && !i.atrasada).length : 0;
    if (atual && doMes) out.push({ nivel: 'info', tipo: 'atividade', titulo: `${doMes} atividade(s) para esta etapa`, texto: `${atual.rotulo.toLowerCase()} · até ${atual.fim}` });
  }
  if (resumoFin) {
    for (const v of resumoFin.atrasados || []) {
      out.push({ nivel: 'critico', tipo: 'pagamento', titulo: `${v.fornecedor}: parcela ${v.numero} vencida`,
        texto: `${moeda(v.valor)} · venceu em ${dBr(v.vencimento)} (${diasEntre(v.vencimento, hoje)} dia(s))` });
    }
    for (const e of resumoFin.entradas_pendentes || []) {
      if (e.vencimento && e.vencimento < hoje) out.push({ nivel: 'critico', tipo: 'pagamento', titulo: `${e.fornecedor}: entrada em aberto`, texto: `${moeda(e.valor)} · prevista para ${dBr(e.vencimento)}` });
    }
    const em7 = iso(somarDias(deIso(hoje), 7));
    for (const v of (resumoFin.proximos || []).filter((x) => x.vencimento <= em7)) {
      out.push({ nivel: 'aviso', tipo: 'pagamento', titulo: `${v.fornecedor}: parcela ${v.numero} vence ${v.vencimento === hoje ? 'hoje' : `em ${dBr(v.vencimento)}`}`, texto: moeda(v.valor) });
    }
    // saldo sem parcelas a vencer: quitar antes do casamento (aviso nos 45 dias anteriores)
    if (dataEvento && dataEvento >= hoje && diasEntre(hoje, dataEvento) <= 45) {
      for (const i of resumoFin.itens || []) {
        const c = i.calc;
        if (c.saldo > 0.009 && !c.vencimentos.some((v) => !v.paga)) {
          out.push({ nivel: 'aviso', tipo: 'pagamento', titulo: `${i.nome}: quitar antes do casamento`, texto: `${moeda(c.saldo)} em aberto` });
        }
      }
    }
  }
  if (recebimento && recebimento.status === 'Atrasado') {
    out.push({ nivel: 'critico', tipo: 'assessoria', titulo: 'Assessoria: pagamento em atraso', texto: `${moeda(recebimento.atrasado)} em atraso com a Tayná` });
  }
  if (recebimento && recebimento.divergencia) out.push({ nivel: 'info', tipo: 'assessoria', titulo: 'Conferir valores', texto: recebimento.divergencia });
  const peso = { critico: 0, aviso: 1, info: 2 };
  return out.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}

module.exports = { burndown, alertas };
