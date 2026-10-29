'use strict';

/**
 * PAINEL DO EVENTO — página HTML única (sem internet, sem servidor) para a equipe acompanhar o dia
 * do casamento no iPad/celular: cronograma com horários e marcação de concluído, próximo item,
 * fornecedores com ligar/WhatsApp, montagem e outros dias.
 *
 * O conteúdo vai escrito no próprio HTML (funciona até em visualizadores sem JavaScript); o script
 * só acrescenta: marcar concluído/chegou (salvo no aparelho), relógio, destaque do próximo item e
 * do que está atrasado, e filtros.
 */
const fs = require('fs');
const path = require('path');

const LOGO = path.join(__dirname, '..', 'templates', 'marca', 'logo.png');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function telefoneLinks(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (d.length < 10) return '';
  const intl = d.length <= 11 ? `55${d}` : d;
  return `<a class="bt" href="tel:+${intl}">Ligar</a><a class="bt wa" href="https://wa.me/${intl}">WhatsApp</a>`;
}

function minutos(h) {
  const m = /^(\d{1,2})h(\d{2})?$/.exec(String(h || ''));
  if (!m) return null;
  const t = Number(m[1]) * 60 + Number(m[2] || 0);
  return t < 300 ? t + 1440 : t;
}

function gerarPainel(d) {
  const logo = fs.existsSync(LOGO) ? `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}` : '';
  const chaveEstado = `painel:${d.numero_os}:${d.data_evento}`;

  const itemTempo = (t, i) => `
    <li class="it ${t.tipo === 'chegada' ? 'chegada' : ''}" data-id="t${i}" data-min="${minutos(t.hora) ?? ''}">
      <label class="ck"><input type="checkbox" data-k="t${i}"><span></span></label>
      <div class="hora">${esc(t.hora)}</div>
      <div class="corpo">
        <div class="tx">${esc(t.texto)}</div>
        ${(t.responsavel || t.fornecedor) ? `<div class="sub">${[t.responsavel && `Resp.: ${esc(t.responsavel)}`, t.tipo !== 'chegada' && t.fornecedor && esc(t.fornecedor)].filter(Boolean).join(' · ')}</div>` : ''}
        ${t.detalhes.length ? `<ul class="det">${t.detalhes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${t.telefone ? `<div class="acoes">${telefoneLinks(t.telefone)}<span class="num">${esc(t.telefone)}</span></div>` : ''}
      </div>
    </li>`;

  const grupos = {};
  d.fornecedores.forEach((f) => { (grupos[f.categoria] = grupos[f.categoria] || []).push(f); });
  const cartoes = Object.entries(grupos).map(([cat, fs2]) => `
    <h3>${esc(cat)}</h3>
    ${fs2.map((f, i) => `
      <div class="forn" data-busca="${esc(`${f.nome} ${f.servico_txt} ${f.responsavel} ${cat}`.toLowerCase())}">
        <div class="fl"><b>${esc(f.nome)}</b><span>${esc(f.servico_txt)}</span></div>
        <div class="fl2">${f.responsavel !== '—' ? `Resp.: ${esc(f.responsavel)} · ` : ''}Chegada: <b>${esc(f.chegada_txt)}</b></div>
        ${f.observacao ? `<div class="fl2">${esc(f.observacao)}</div>` : ''}
        <div class="acoes">${telefoneLinks(f.telefone)}<span class="num">${esc(f.telefone)}</span>
          <label class="chegou"><input type="checkbox" data-k="f-${esc(f.nome)}"> chegou</label></div>
      </div>`).join('')}`).join('');

  const blocoInfo = (itens) => `<div class="card"><dl class="info">${itens.map((x) => `<dt>${esc(x.rotulo)}</dt><dd>${x.lista
    ? `<ol>${x.lista.map((y) => `<li>${esc(y)}</li>`).join('')}</ol>` : esc(x.valor)}</dd>`).join('')}</dl></div>`;
  const atracoes = (d.atracoes || []).map((a, i) => `
    <li class="it"><label class="ck"><input type="checkbox" data-k="at${i}"><span></span></label>
      <div class="hora">${esc(a.inicio)}</div><div class="corpo"><div class="tx">${esc(a.nome)}</div>
      <div class="sub">até ${esc(a.fim)}${a.obs_txt ? ` · ${esc(a.obs_txt.replace(/^\s*·\s*/, ''))}` : ''}</div></div></li>`).join('');

  const listaMontagem = (lista, pref) => lista.map((m, i) => `
    <li class="it"><label class="ck"><input type="checkbox" data-k="${pref}${i}"><span></span></label>
      <div class="hora">${esc(m.chegada)}</div><div class="corpo"><div class="tx">${esc(m.servico_txt)} – ${esc(m.nome)}</div>
      ${m.contato_txt ? `<div class="sub">${esc(m.contato_txt.replace(/^\s*·\s*/, ''))}</div>` : ''}</div></li>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Painel do evento · ${esc(d.titulo_nomes)}</title>
<style>
  :root { --marca:#824634; --marca2:#a8705c; --fundo:#f8f3ef; --borda:#eadcd4; --texto:#2b2220; --suave:#7b6f6a; --ok:#2f7a4f; --erro:#b3261e; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin:0; font:17px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; color:var(--texto); background:var(--fundo); }
  header { background:#fffdfb; border-bottom:1px solid var(--borda); padding:10px 16px env(safe-area-inset-right); position:sticky; top:0; z-index:5; }
  .topo { display:flex; align-items:center; gap:14px; }
  .topo img { height:54px; }
  .topo h1 { margin:0; font-size:22px; color:var(--marca); font-weight:600; }
  .topo .s { color:var(--suave); font-size:14px; }
  .topo .esp { flex:1; }
  .relogio { font-size:30px; font-weight:700; color:var(--marca); font-variant-numeric:tabular-nums; }
  .prog { font-size:13px; color:var(--suave); text-align:right; }
  .prox { margin-top:8px; background:#fdf1e9; border:1px solid #f0d5c5; border-radius:12px; padding:8px 12px; font-size:15px; display:none; }
  .prox b { color:var(--marca); }
  nav { display:flex; gap:6px; margin-top:10px; overflow-x:auto; }
  nav button { font:inherit; font-size:15px; font-weight:600; border:1px solid var(--borda); background:#fff; color:var(--marca); border-radius:999px; padding:8px 16px; white-space:nowrap; }
  nav button.on { background:var(--marca); color:#fff; border-color:var(--marca); }
  main { padding:14px 16px 60px; max-width:1100px; margin:0 auto; }
  section { display:none; } section.on { display:block; }
  .card { background:#fff; border:1px solid var(--borda); border-radius:14px; padding:14px 16px; margin-bottom:12px; }
  .card dl { display:grid; grid-template-columns:auto 1fr; gap:4px 14px; margin:0; }
  .card dt { color:var(--suave); }
  dl.info { grid-template-columns: minmax(150px, 34%) 1fr; gap:10px 16px; }
  dl.info dt { font-size:14px; } dl.info dd { margin:0; font-weight:600; }
  dl.info ol { margin:0; padding-left:20px; font-weight:600; }
  @media (max-width:600px) { dl.info { grid-template-columns:1fr; gap:2px; } dl.info dd { margin-bottom:8px; } }
  ul.lista { list-style:none; margin:0; padding:0; }
  .it { display:grid; grid-template-columns:44px 74px 1fr; gap:10px; align-items:start; background:#fff; border:1px solid var(--borda); border-radius:14px; padding:12px; margin-bottom:8px; }
  .it.chegada { background:#fbf8f6; }
  .it.prox-item { border:2px solid var(--marca); box-shadow:0 4px 16px rgba(130,70,52,.15); }
  .it.atrasado .hora { color:var(--erro); }
  .it.feito { opacity:.5; } .it.feito .tx { text-decoration:line-through; }
  .hora { font-weight:700; font-size:19px; color:var(--marca); font-variant-numeric:tabular-nums; padding-top:6px; }
  .tx { font-weight:600; padding-top:6px; }
  .sub, .fl2 { color:var(--suave); font-size:14px; margin-top:2px; }
  ul.det { margin:6px 0 0; padding-left:18px; font-size:14px; color:#4b3f3b; }
  .ck input { display:none; }
  .ck span { display:block; width:40px; height:40px; border-radius:10px; border:2px solid var(--marca2); background:#fff; }
  .ck input:checked + span { background:var(--ok); border-color:var(--ok); }
  .ck input:checked + span::after { content:'✓'; color:#fff; font-size:26px; display:block; text-align:center; line-height:36px; }
  .acoes { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:8px; }
  .bt { display:inline-block; text-decoration:none; font-weight:600; font-size:14px; padding:8px 14px; border-radius:10px; background:var(--marca); color:#fff; }
  .bt.wa { background:#25d366; color:#08361d; }
  .num { color:var(--suave); font-size:14px; }
  h2 { color:var(--marca); font-size:18px; margin:16px 0 8px; }
  h3 { color:var(--suave); font-size:13px; text-transform:uppercase; letter-spacing:.4px; margin:16px 0 6px; }
  .forn { background:#fff; border:1px solid var(--borda); border-radius:14px; padding:12px 14px; margin-bottom:8px; }
  .forn.chegou-ok { border-color:var(--ok); background:#f2f8f4; }
  .fl { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; }
  .fl span { color:var(--suave); }
  .chegou { margin-left:auto; font-size:15px; display:flex; align-items:center; gap:6px; }
  .chegou input { width:24px; height:24px; accent-color:var(--ok); }
  input.busca { width:100%; font:inherit; padding:10px 12px; border:1px solid var(--borda); border-radius:12px; margin-bottom:6px; }
  .rodape { color:var(--suave); font-size:12px; text-align:center; margin-top:20px; }
  .rodape button { font:inherit; font-size:12px; color:var(--marca); background:none; border:1px solid var(--borda); border-radius:8px; padding:4px 10px; }
  @media (max-width:600px) { .it { grid-template-columns:40px 62px 1fr; } .topo img { display:none; } .relogio { font-size:24px; } }
</style>
</head>
<body>
<header>
  <div class="topo">
    ${logo ? `<img src="${logo}" alt="Tayná Alves">` : ''}
    <div><h1>${esc(d.titulo_nomes)}</h1><div class="s">${esc(d.data_extenso)} · ${esc(d.numero_os)}</div></div>
    <div class="esp"></div>
    <div><div class="relogio" id="relogio">--:--</div><div class="prog" id="prog"></div></div>
  </div>
  <div class="prox" id="prox"></div>
  <nav id="abas">
    <button class="on" data-s="crono">Cronograma</button>
    <button data-s="ceri">Cerimônia</button>
    ${d.padrao ? '<button data-s="cortejo">Cortejo</button>' : ''}
    <button data-s="festa">Festa</button>
    <button data-s="forn">Fornecedores</button>
    <button data-s="mont">Montagem</button>
    ${d.tem_posterior ? '<button data-s="outros">Outros dias</button>' : ''}
    <button data-s="info">Informações</button>
  </nav>
</header>
<main>
  <section id="crono" class="on">
    <ul class="lista">${d.linha_tempo.map(itemTempo).join('')}</ul>
  </section>
  <section id="ceri">${blocoInfo(d.cerimonia_itens || [])}</section>
  ${d.padrao ? `<section id="cortejo">
    <h2>Músicas e ordem do cortejo</h2>
    <ul class="lista">${(d.cortejo || []).map((c, i) => `<li class="it" data-id="c${i}">
      <label class="ck"><input type="checkbox" data-k="c${i}"><span></span></label>
      <div class="hora">${c.n}</div>
      <div class="corpo"><div class="tx">${esc(c.entrada)}</div><div class="sub">${esc(c.musica)}${c.quem ? ` · ${esc(c.quem)}` : ''}</div></div></li>`).join('')}</ul>
    ${(d.criancas_cortejo || []).length ? `<h2>Crianças do cortejo</h2>${d.criancas_cortejo.map((x) => `<div class="forn"><div class="fl"><b>${esc(x.nome)}</b><span>${esc(x.funcao)}${x.idade ? ` · ${esc(x.idade)} anos` : ''}</span></div>
      ${x.responsavel ? `<div class="acoes">${telefoneLinks(x.responsavel)}<span class="num">${esc(x.responsavel)}</span></div>` : ''}</div>`).join('')}` : ''}
    ${[['Padrinhos', d.padrinhos], ['Madrinhas', d.madrinhas]].filter(([, l]) => (l || []).length).map(([t, l]) => `<h2>${t}</h2>${l.map((x) => `<div class="forn">
      <div class="fl"><b>${esc(x.nome)}</b>${x.obs ? `<span>${esc(x.obs)}</span>` : ''}</div>
      ${x.contato ? `<div class="acoes">${telefoneLinks(x.contato)}<span class="num">${esc(x.contato)}</span><label class="chegou"><input type="checkbox" data-k="p-${esc(x.nome)}"> chegou</label></div>` : ''}</div>`).join('')}`).join('')}
    ${d.notas_cerimonial ? `<div class="card"><b>Para o cerimonial</b><p style="white-space:pre-wrap;margin:6px 0 0">${esc(d.notas_cerimonial)}</p></div>` : ''}
  </section>` : ''}
  <section id="festa">
    ${atracoes ? `<h2>Previsão artística</h2><ul class="lista">${atracoes}</ul>` : ''}
    <h2>Informações da festa</h2>
    ${blocoInfo(d.festa_itens || [])}
  </section>
  <section id="forn">
    <input class="busca" id="busca" placeholder="Buscar fornecedor, serviço ou responsável…">
    ${cartoes}
  </section>
  <section id="mont">
    ${d.tem_vespera ? `<h2>Véspera – ${esc(d.data_vespera)}${d.inicio_montagem_vespera ? ` · início ${esc(d.inicio_montagem_vespera)}` : ''}</h2>
    <ul class="lista">${listaMontagem(d.montagem_vespera, 'mv')}</ul>` : ''}
    <h2>Dia do evento – ${esc(d.data_evento)}${d.inicio_montagem_dia ? ` · início ${esc(d.inicio_montagem_dia)}` : ''}</h2>
    <ul class="lista">${listaMontagem(d.montagem_dia, 'md')}</ul>
  </section>
  ${d.tem_posterior ? `<section id="outros"><h2>Programação dos outros dias</h2><ul class="lista">${listaMontagem(d.posterior, 'po')}</ul></section>` : ''}
  <section id="info">
    <div class="card"><dl>
      <dt>Data</dt><dd>${esc(d.data_extenso)}</dd>
      <dt>Cerimônia</dt><dd>${esc(d.cerimonia_txt)}</dd>
      <dt>Recepção</dt><dd>${esc(d.recepcao_txt)}</dd>
      <dt>Convidados</dt><dd>${esc(d.convidados_txt)}</dd>
      ${d.padrao ? `<dt>Previsão de atraso</dt><dd>${esc(d.previsao_atraso)}</dd><dt>Chegada dos padrinhos</dt><dd>${esc(d.chegada_padrinhos)}</dd>` : ''}
      <dt>Montagem</dt><dd>${esc(d.responsavel_montagem)}${d.telefone_assessoria ? ` · ${esc(d.telefone_assessoria)}` : ''}</dd>
      ${d.contato_emergencia ? `<dt>Emergência</dt><dd>${esc(d.contato_emergencia)}</dd>` : ''}
    </dl>
    ${d.telefone_assessoria ? `<div class="acoes">${telefoneLinks(d.telefone_assessoria)}</div>` : ''}</div>
    ${d.padrao ? ['noiva', 'noivo'].map((l) => `<div class="card"><b>${l === 'noiva' ? 'Noiva' : 'Noivo'}: ${esc(d[`${l}_nome`])}</b>
      <div class="fl2">Pais: ${esc(d[`${l}_pais`])}</div>
      <div class="fl2">Fotos – pais separados: ${esc(d[`familia_${l}_pais_separados`])} · irmãos: ${esc(d[`familia_${l}_irmaos`])} · avós: ${esc(d[`familia_${l}_avos`])}${d[`familia_${l}_obs`] ? ` · ${esc(d[`familia_${l}_obs`])}` : ''}</div>
      ${d[`${l}_telefone`] ? `<div class="acoes">${telefoneLinks(d[`${l}_telefone`])}<span class="num">${esc(d[`${l}_telefone`])}</span></div>` : ''}</div>`).join('') : ''}
    ${d.observacoes ? `<div class="card"><b>Observações</b><p style="white-space:pre-wrap;margin:6px 0 0">${esc(d.observacoes)}</p></div>` : ''}
  </section>
  <div class="rodape">Gerado em ${esc(d.gerado_em)} · Tayná Alves Assessoria · as marcações ficam salvas neste aparelho
    <button id="zerar">Limpar marcações</button></div>
</main>
<script>
(function () {
  var CHAVE = ${JSON.stringify(chaveEstado)};
  var DATA = ${JSON.stringify(d.data_evento)};
  var estado = {};
  try { estado = JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch (e) { estado = {}; }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {} }
  var caixas = document.querySelectorAll('input[data-k]');
  function aplicar() {
    caixas.forEach(function (c) {
      c.checked = !!estado[c.dataset.k];
      var li = c.closest('.it'); if (li) li.classList.toggle('feito', c.checked);
      var fo = c.closest('.forn'); if (fo) fo.classList.toggle('chegou-ok', c.checked);
    });
    var tot = document.querySelectorAll('#crono input[data-k]').length;
    var ok = document.querySelectorAll('#crono input[data-k]:checked').length;
    document.getElementById('prog').textContent = ok + ' de ' + tot + ' concluídos';
    atualizarProximo();
  }
  caixas.forEach(function (c) { c.addEventListener('change', function () { estado[c.dataset.k] = c.checked; salvar(); aplicar(); }); });
  document.getElementById('zerar').onclick = function () { if (confirm('Limpar todas as marcações deste aparelho?')) { estado = {}; salvar(); aplicar(); } };
  document.querySelectorAll('#abas button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('#abas button').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('main section').forEach(function (s) { s.classList.toggle('on', s.id === b.dataset.s); });
      window.scrollTo(0, 0);
    };
  });
  var busca = document.getElementById('busca');
  if (busca) busca.addEventListener('input', function () {
    var q = busca.value.trim().toLowerCase();
    document.querySelectorAll('.forn').forEach(function (f) { f.style.display = !q || f.dataset.busca.indexOf(q) >= 0 ? '' : 'none'; });
  });
  function hojeEhOEvento() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() === DATA;
  }
  function atualizarProximo() {
    var agora = new Date(), min = agora.getHours() * 60 + agora.getMinutes();
    if (min < 300) min += 1440;
    var dia = hojeEhOEvento(), prox = null;
    document.querySelectorAll('#crono .it').forEach(function (li) {
      var m = li.dataset.min === '' ? null : Number(li.dataset.min);
      var feito = li.classList.contains('feito');
      li.classList.remove('prox-item');
      li.classList.toggle('atrasado', dia && !feito && m !== null && m < min - 10);
      if (!feito && !prox) prox = li;
    });
    var caixa = document.getElementById('prox');
    if (prox) {
      prox.classList.add('prox-item');
      caixa.style.display = 'block';
      caixa.innerHTML = 'Próximo: <b>' + prox.querySelector('.hora').textContent + '</b> · ' + prox.querySelector('.tx').textContent;
    } else { caixa.style.display = 'block'; caixa.innerHTML = '<b>Tudo concluído!</b>'; }
  }
  function relogio() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    document.getElementById('relogio').textContent = p(d.getHours()) + ':' + p(d.getMinutes());
    atualizarProximo();
  }
  aplicar(); relogio(); setInterval(relogio, 20000);
})();
</script>
</body>
</html>
`;
}

module.exports = { gerarPainel };
