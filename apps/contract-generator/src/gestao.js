/**
 * Visão de gestão: recebimentos da Tayná (contrato de assessoria/cerimonial de cada casal), pagamentos a
 * fornecedores de todos os casais (atrasados, a vencer, a quitar antes do evento) e indicadores do painel.
 *
 * Fontes: o .txt do contrato (valor, entrada, parcelas, data do evento) e o financeiro de cada casal
 * (_DADOS DO SISTEMA/financeiro/<contrato>.json). O que o casal pagou à Tayná é a linha "Tayna Alves Assessoria"
 * do financeiro do casal (importada da planilha ou lançada no sistema).
 */
const fin = require('./financeiro');

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const chave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const NOME_TAYNA = 'Tayna Alves Assessoria';

/** Linha do financeiro do casal que é o pagamento à própria Tayná. */
const ehTayna = (item) => /\btayna\b/.test(chave(item.nome)) || /tayna alves/.test(chave(item.descricao));

function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const x = new Date(a, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function somarMeses(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const base = new Date(a, m - 1 + n, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 864e5);

/** Plano de pagamento do contrato da Tayná (entrada + parcelas ou saldo antes do evento). */
function planoContrato(c) {
  const total = fin.valorDe(c.valor_total);
  if (!total) return null;
  const pct = c.entrada_percentual !== undefined && c.entrada_percentual !== ''
    ? Number(String(c.entrada_percentual).replace('%', '').replace(',', '.')) : 30;
  const entrada = c.entrada ? fin.valorDe(c.entrada) : r2((total * (Number.isFinite(pct) ? pct : 30)) / 100);
  const saldo = r2(total - entrada);
  const evento = fin.dataDe(c.evento_data);
  const etapas = [{ descricao: `Entrada (${Math.round((entrada / total) * 100)}%)`, valor: entrada, vencimento: fin.dataDe(c.data_assinatura) || '' }];
  const qtd = Number(c.num_parcelas) || 0;
  const primeiro = fin.dataDe(c.primeiro_vencimento);
  if (saldo > 0 && qtd > 0 && primeiro) {
    const base = Math.floor((saldo * 100) / qtd) / 100;
    for (let i = 0; i < qtd; i++) {
      etapas.push({ descricao: `Parcela ${i + 1} de ${qtd}`, valor: i === qtd - 1 ? r2(saldo - base * (qtd - 1)) : base, vencimento: somarMeses(primeiro, i) });
    }
  } else if (saldo > 0) {
    const prazo = Number(c.prazo_quitacao_dias) || 15;
    etapas.push({ descricao: primeiro ? 'Saldo' : `Saldo (até ${prazo} dias antes do evento)`, valor: saldo, vencimento: primeiro || (evento ? somarDias(evento, -prazo) : '') });
  }
  return { total, entrada, saldo, etapas };
}

/** Recebimentos da Tayná para um contrato. */
function recebimentoCasal(arquivo, c, finCasal, hoje = hojeIso()) {
  const plano = planoContrato(c);
  const item = (finCasal?.itens || []).find((i) => !i.removido && ehTayna(i)) || null;
  const evento = fin.dataDe(c.evento_data);
  const base = {
    arquivo, numero_os: c.numero_os || '', casal: c.evento_nomes || arquivo, evento_data: evento, evento_periodo: c.evento_periodo || '',
    linha: /^CE/i.test(c.numero_os || '') ? 'CE' : 'AS', item_id: item?.id || null,
  };
  if (!plano) return { ...base, total: null, recebido: 0, a_receber: null, status: 'Sem valor', etapas: [], pagamentos: [] };

  let recebido = 0;
  let fonte = 'sem lançamento';
  const pagamentos = [];
  if (item) {
    recebido = fin.calcular(item, hoje).pago;
    fonte = (item.pagamentos || []).some((p) => !p.importado) ? 'sistema' : 'planilha';
    pagamentos.push(...(item.pagamentos || []).map((p) => ({ id: p.id, tipo: p.tipo, valor: p.valor, data: p.data, forma: p.forma, comprovante: p.comprovante, importado: Boolean(p.importado) })));
  } else if (/quitad/i.test(c.situacao_financeira || '')) {
    recebido = plano.total; fonte = 'contrato (quitado)';
  }
  // distribui o que foi recebido pelas etapas, na ordem
  let resto = recebido;
  const etapas = plano.etapas.map((e) => {
    const pago = r2(Math.min(e.valor, Math.max(0, resto)));
    resto = r2(resto - pago);
    const quitada = pago >= e.valor - 0.009;
    return { ...e, pago, quitada, atrasada: !quitada && e.vencimento && e.vencimento < hoje };
  });
  const aReceber = r2(Math.max(0, plano.total - recebido));
  const semLancamento = fonte === 'sem lançamento';
  // sem nenhum recebimento registrado não dá para dizer que está atrasado (pode só não ter sido lançado)
  if (semLancamento) etapas.forEach((e) => { e.atrasada = false; });
  const atrasado = r2(etapas.filter((e) => e.atrasada).reduce((s, e) => s + e.valor - e.pago, 0));
  const proxima = etapas.find((e) => !e.quitada) || null;
  let status = aReceber <= 0.009 ? 'Quitado' : atrasado > 0 ? 'Atrasado' : 'Em dia';
  if (semLancamento && aReceber > 0) status = 'Sem lançamento';
  return {
    ...base, total: plano.total, entrada: plano.entrada, recebido: r2(recebido), a_receber: aReceber, atrasado,
    percentual: Math.round((recebido / plano.total) * 100), status, fonte, etapas, pagamentos,
    proxima: proxima ? { descricao: proxima.descricao, valor: r2(proxima.valor - proxima.pago), vencimento: proxima.vencimento } : null,
    divergencia: [
      item && item.valor_contratado && Math.abs(item.valor_contratado - plano.total) > 1
        ? `Na planilha a assessoria está com ${fin.moeda(item.valor_contratado)}; no contrato, ${fin.moeda(plano.total)}.` : '',
      item && /quitad/i.test(c.situacao_financeira || '') && aReceber > 0.009
        ? `O contrato está marcado como QUITADO, mas na planilha constam ${fin.moeda(recebido)} recebidos.` : '',
    ].filter(Boolean).join(' '),
  };
}

/** Contratos que importam agora: evento futuro (ou sem data) ou algo ainda a receber. */
const ativo = (r, hoje) => !r.evento_data || r.evento_data >= somarDias(hoje, -7) || (r.a_receber || 0) > 0.009;

function recebimentos(contratos, carregarFin, hoje = hojeIso()) {
  const lista = contratos.filter((x) => x.campos.numero_os)
    .map(({ arquivo, campos }) => recebimentoCasal(arquivo, campos, carregarFin(arquivo), hoje))
    .filter((r) => ativo(r, hoje))
    .sort((a, b) => (a.evento_data || '9').localeCompare(b.evento_data || '9'));
  const soma = (k, f = () => true) => r2(lista.filter(f).reduce((s, r) => s + (Number(r[k]) || 0), 0));
  const em = (dias) => (r) => r.proxima && r.proxima.vencimento && r.proxima.vencimento >= hoje && r.proxima.vencimento <= somarDias(hoje, dias);
  return {
    hoje,
    itens: lista,
    totais: {
      contratado: soma('total'), recebido: soma('recebido'), atrasado: soma('atrasado'),
      // "a receber" só dos contratos com recebimentos lançados (planilha ou sistema); os demais ficam à parte
      a_receber: soma('a_receber', (r) => r.status !== 'Sem lançamento'),
      sem_lancamento_valor: soma('total', (r) => r.status === 'Sem lançamento'),
      casais: lista.length, quitados: lista.filter((r) => r.status === 'Quitado').length,
      atrasados: lista.filter((r) => r.status === 'Atrasado').length, sem_lancamento: lista.filter((r) => r.status === 'Sem lançamento').length,
      proximos_30: r2(lista.filter(em(30)).reduce((s, r) => s + r.proxima.valor, 0)),
    },
  };
}

/** Pagamentos aos fornecedores de todos os casais: atrasados, a vencer e saldos a quitar antes do evento. */
function pagamentos(contratos, carregarFin, hoje = hojeIso(), { dias = 30, diasEvento = 45 } = {}) {
  const atrasados = []; const aVencer = []; const antesDoEvento = []; const entradas = []; const aposEvento = [];
  for (const { arquivo, campos } of contratos) {
    const f = carregarFin(arquivo);
    if (!f) continue;
    const evento = fin.dataDe(campos.evento_data);
    if (evento && evento < somarDias(hoje, -60)) continue; // evento antigo
    const casal = { arquivo, numero_os: campos.numero_os || '', casal: campos.evento_nomes || arquivo, evento_data: evento };
    for (const item of f.itens.filter((i) => !i.removido && !ehTayna(i))) {
      const c = fin.calcular(item, hoje);
      const base = { ...casal, item_id: item.id, fornecedor: item.nome, descricao: item.descricao || '', pix: item.pix || '' };
      if (evento && evento < hoje) {
        // evento já aconteceu e ainda há saldo: provavelmente pago no dia e não lançado — conferir
        if (c.saldo !== null && c.saldo > 0.009) aposEvento.push({ ...base, tipo: 'Saldo', valor: c.saldo, vencimento: evento, dias: diasEntre(evento, hoje) });
        continue;
      }
      c.atrasadas.forEach((v) => atrasados.push({ ...base, tipo: `Parcela ${v.numero}${c.parcelas_total ? ` de ${c.parcelas_total}` : ''}`, valor: v.valor, vencimento: v.vencimento, dias: diasEntre(v.vencimento, hoje) }));
      c.vencimentos.filter((v) => !v.paga && v.vencimento >= hoje && v.vencimento <= somarDias(hoje, dias))
        .forEach((v) => aVencer.push({ ...base, tipo: `Parcela ${v.numero}${c.parcelas_total ? ` de ${c.parcelas_total}` : ''}`, valor: v.valor, vencimento: v.vencimento, dias: diasEntre(hoje, v.vencimento) }));
      if (c.entrada_prevista && !c.entrada_paga) {
        entradas.push({ ...base, tipo: 'Entrada', valor: r2(c.entrada_prevista - c.pago_entrada), vencimento: item.entrada?.data || '' });
      }
      // saldo sem parcelas com vencimento: tem de estar quitado antes do evento
      const saldoSemVenc = c.saldo !== null && c.saldo > 0.009 && !c.vencimentos.some((v) => !v.paga);
      if (saldoSemVenc && evento && evento <= somarDias(hoje, diasEvento)) {
        antesDoEvento.push({ ...base, tipo: 'Saldo', valor: c.saldo, vencimento: evento, dias: diasEntre(hoje, evento) });
      }
    }
  }
  const porData = (a, b) => (a.vencimento || '9').localeCompare(b.vencimento || '9');
  const total = (l) => r2(l.reduce((s, x) => s + (Number(x.valor) || 0), 0));
  return {
    hoje, dias, dias_evento: diasEvento,
    atrasados: atrasados.sort(porData), a_vencer: aVencer.sort(porData), antes_do_evento: antesDoEvento.sort(porData), entradas: entradas.sort(porData),
    apos_evento: aposEvento.sort(porData),
    totais: { atrasados: total(atrasados), a_vencer: total(aVencer), antes_do_evento: total(antesDoEvento), entradas: total(entradas), apos_evento: total(aposEvento) },
  };
}

/** Indicadores do painel de gestão. `cronograma(arquivo, campos)` devolve o ritmo do checklist (ou null). */
function painel(contratos, carregarFin, cronograma, hoje = hojeIso()) {
  const rec = recebimentos(contratos, carregarFin, hoje);
  const pag = pagamentos(contratos, carregarFin, hoje);
  const porArquivo = Object.fromEntries(rec.itens.map((r) => [r.arquivo, r]));
  const casais = [];
  for (const { arquivo, campos } of contratos.filter((x) => x.campos.numero_os)) {
    const r = porArquivo[arquivo];
    if (!r) continue; // evento passado e quitado
    const f = carregarFin(arquivo);
    const forn = f ? fin.resumo({ itens: f.itens.filter((i) => !ehTayna(i)) }, hoje).totais : null;
    // cronograma de tarefas só para assessoria (cerimonial não acompanha o planejamento mês a mês)
    let ritmo = null;
    if (r.linha === 'AS') { try { ritmo = cronograma(arquivo, campos); } catch { ritmo = null; } }
    const alertas = [];
    if (r.status === 'Atrasado') alertas.push(`assessoria: ${fin.moeda(r.atrasado)} em atraso`);
    const atrasForn = pag.atrasados.filter((x) => x.arquivo === arquivo);
    if (atrasForn.length) alertas.push(`${atrasForn.length} parcela(s) de fornecedor em atraso`);
    const antes = pag.antes_do_evento.filter((x) => x.arquivo === arquivo);
    if (antes.length) alertas.push(`${antes.length} fornecedor(es) a quitar antes do evento`);
    const depois = pag.apos_evento.filter((x) => x.arquivo === arquivo);
    if (depois.length) alertas.push(`evento realizado: ${depois.length} fornecedor(es) ainda com saldo na planilha`);
    if (ritmo && ritmo.situacao === 'atrasado') alertas.push(`cronograma atrasado (${-ritmo.saldo} tarefa(s))`);
    if (r.divergencia) alertas.push(r.divergencia);
    casais.push({
      arquivo, numero_os: r.numero_os, casal: r.casal, linha: r.linha, evento_data: r.evento_data, evento_periodo: r.evento_periodo,
      dias: r.evento_data ? diasEntre(hoje, r.evento_data) : null, servicos: campos.servicos || '',
      assessoria: { total: r.total, recebido: r.recebido, a_receber: r.a_receber, status: r.status, percentual: r.percentual ?? null },
      fornecedores: forn ? { contratado: forn.contratado, pago: forn.pago, saldo: forn.saldo, percentual: forn.percentual, quantidade: forn.fornecedores } : null,
      cronograma: ritmo ? { percentual: ritmo.percentual, concluidas: ritmo.concluidas, total: ritmo.total, situacao: ritmo.situacao, saldo: ritmo.saldo, atrasadas: ritmo.atrasadas } : null,
      alertas,
    });
  }
  // receita por mês do evento (próximos 12 meses + anteriores com saldo)
  const meses = {};
  for (const r of rec.itens) {
    const k = r.evento_data ? r.evento_data.slice(0, 7) : 'sem data';
    meses[k] = meses[k] || { mes: k, contratado: 0, recebido: 0, eventos: 0 };
    meses[k].contratado = r2(meses[k].contratado + (r.total || 0));
    meses[k].recebido = r2(meses[k].recebido + (r.recebido || 0));
    meses[k].eventos += 1;
  }
  const ano = hoje.slice(0, 4);
  const doAno = (a) => rec.itens.filter((r) => (r.evento_data || '').startsWith(a));
  const soma = (l, k) => r2(l.reduce((s, r) => s + (Number(r[k]) || 0), 0));
  const fornT = casais.reduce((t, c) => {
    if (!c.fornecedores) return t;
    t.contratado += c.fornecedores.contratado; t.pago += c.fornecedores.pago; t.saldo += c.fornecedores.saldo; return t;
  }, { contratado: 0, pago: 0, saldo: 0 });
  return {
    hoje,
    kpis: {
      casais_ativos: casais.length,
      eventos_30: casais.filter((c) => c.dias !== null && c.dias >= 0 && c.dias <= 30).length,
      eventos_90: casais.filter((c) => c.dias !== null && c.dias >= 0 && c.dias <= 90).length,
      assessoria: rec.totais,
      ano_atual: { ano, contratado: soma(doAno(ano), 'total'), recebido: soma(doAno(ano), 'recebido'), eventos: doAno(ano).length },
      ano_seguinte: { ano: String(Number(ano) + 1), contratado: soma(doAno(String(Number(ano) + 1)), 'total'), recebido: soma(doAno(String(Number(ano) + 1)), 'recebido'), eventos: doAno(String(Number(ano) + 1)).length },
      fornecedores: { contratado: r2(fornT.contratado), pago: r2(fornT.pago), saldo: r2(fornT.saldo) },
      pagamentos: pag.totais,
      cronograma_atrasado: casais.filter((c) => c.cronograma && c.cronograma.situacao === 'atrasado').length,
    },
    meses: Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes)),
    casais: casais.sort((a, b) => (a.evento_data || '9').localeCompare(b.evento_data || '9')),
  };
}

/** Garante a linha da Tayná no financeiro do casal (para registrar um recebimento). */
function garantirItemTayna(f, pastaCasal, c) {
  let item = f.itens.find((i) => !i.removido && ehTayna(i));
  if (item) return item;
  const plano = planoContrato(c);
  if (!plano) throw new Error('O contrato não tem valor: informe o valor no contrato antes de registrar recebimentos.');
  const qtd = Number(c.num_parcelas) || 0;
  item = fin.adicionarItem(f, pastaCasal, {
    nome: NOME_TAYNA, descricao: /^CE/i.test(c.numero_os || '') ? 'Cerimonial' : 'Assessoria, supervisão de montagem, cerimonial e finalização do casamento.',
    valor_contratado: plano.total, entrada: { valor: plano.entrada, data: c.data_assinatura || '' },
    parcelas: qtd ? { quantidade: qtd, primeiro_vencimento: c.primeiro_vencimento || '' } : {},
  });
  return item;
}

module.exports = { ehTayna, planoContrato, recebimentoCasal, recebimentos, pagamentos, painel, garantirItemTayna, NOME_TAYNA };
