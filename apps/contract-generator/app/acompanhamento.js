/* Lotus · acompanhamento do casal: quadro (kanban) das atividades, burndown e alertas.
 * Usado no painel do casal (Tayná) e na área do casal. Sem dependências. */
(function () {
  'use strict';
  var CSS = [
    '.ac-barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}',
    '.ac-barra .ac-chip{border:1px solid #eadcd4;background:#fff;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;min-height:34px;color:#2b2220}',
    '.ac-barra .ac-chip[aria-pressed="true"]{background:#f3e6df;border-color:#a8705c;color:#824634;font-weight:600}',
    '.ac-barra input{flex:1;min-width:160px;max-width:280px;font:inherit;font-size:14px;border:1px solid #eadcd4;border-radius:9px;padding:6px 10px;min-height:34px}',
    '.ac-kb{display:grid;grid-template-columns:repeat(6,minmax(190px,1fr));gap:10px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory}',
    '.ac-col{background:#f4ede8;border-radius:12px;display:flex;flex-direction:column;min-height:120px;scroll-snap-align:start;border:2px solid transparent;transition:border-color .12s,background .12s}',
    '.ac-col.ac-sobre{border-color:#a8705c;background:#efe2da}',
    '.ac-col h3{margin:0;padding:10px 12px 8px;font-size:13.5px;display:flex;justify-content:space-between;align-items:center;gap:6px;color:#2b2220;border-bottom:3px solid var(--ac-cor,#d8c9c0)}',
    '.ac-col h3 .ac-n{font-weight:600;color:#6f625d;font-size:12.5px;background:#fff;border-radius:99px;padding:1px 8px}',
    '.ac-lista{padding:8px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;max-height:62vh}',
    '.ac-card{background:#fff;border:1px solid #eadcd4;border-left:4px solid var(--ac-cor,#d8c9c0);border-radius:10px;padding:9px 10px;cursor:grab;font-size:13.5px;line-height:1.35;box-shadow:0 1px 2px rgba(0,0,0,.04);text-align:left;width:100%;font-family:inherit;color:inherit}',
    '.ac-card:hover{box-shadow:0 3px 10px rgba(130,70,52,.12)}',
    '.ac-card:focus-visible{outline:2px solid #824634;outline-offset:2px}',
    '.ac-card.ac-arrastando{opacity:.45}',
    '.ac-card .ac-meta{font-size:11.5px;color:#6f625d;margin-top:5px;display:flex;flex-wrap:wrap;gap:4px 8px}',
    '.ac-card .ac-obs{font-size:12px;color:#6f625d;margin-top:5px;border-top:1px dashed #f1e7e1;padding-top:4px;word-break:break-word}',
    '.ac-tag{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:99px}',
    '.ac-tag.atr{background:#fde8e6;color:#b3261e}.ac-tag.cas{background:#e8f1ea;color:#2f7a4f}',
    '.ac-vazio{font-size:12.5px;color:#9b8f8a;text-align:center;padding:14px 6px}',
    '.ac-mais{border:0;background:none;color:#824634;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:4px}',
    '.ac-dlg{border:0;border-radius:16px;padding:0;width:min(480px,calc(100vw - 16px));box-shadow:0 20px 60px rgba(0,0,0,.25)}',
    '.ac-dlg::backdrop{background:rgba(43,34,32,.45)}',
    '.ac-dlg form{padding:18px;display:flex;flex-direction:column;gap:12px}',
    '.ac-dlg h4{margin:0;color:#824634;font-size:16.5px;line-height:1.35}',
    '.ac-dlg .ac-sts{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
    '.ac-dlg .ac-sts button{border:1px solid #eadcd4;background:#fff;border-left:4px solid var(--ac-cor);border-radius:9px;padding:8px 10px;font:inherit;font-size:14px;text-align:left;cursor:pointer;min-height:40px}',
    '.ac-dlg .ac-sts button[aria-pressed="true"]{background:#f3e6df;border-color:#a8705c;font-weight:700}',
    '.ac-dlg textarea{font:inherit;font-size:14.5px;border:1px solid #eadcd4;border-radius:9px;padding:8px 10px;min-height:80px;resize:vertical}',
    '.ac-dlg .ac-bt{display:flex;gap:8px;justify-content:flex-end}',
    '.ac-dlg .ac-bt button{border:1px solid #eadcd4;background:#fff;color:#824634;border-radius:10px;padding:8px 16px;font:inherit;font-weight:600;cursor:pointer;min-height:40px}',
    '.ac-dlg .ac-bt .ac-pri{background:#824634;border-color:#824634;color:#fff}',
    '.ac-dlg .ac-erro{color:#b3261e;font-size:13px;margin:0}',
    '.ac-bd-kpis{display:flex;flex-wrap:wrap;gap:8px 18px;margin:0 0 8px;font-size:13px;color:#6f625d}',
    '.ac-bd-kpis b{color:#2b2220;font-size:15px}',
    '.ac-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:#6f625d;margin:2px 0 4px}',
    '.ac-leg span{display:inline-flex;align-items:center;gap:6px}',
    '.ac-graf{position:relative}',
    '.ac-graf svg{display:block;width:100%;height:auto;overflow:visible}',
    '.ac-tip{position:absolute;pointer-events:none;background:#2b2220;color:#fff;font-size:12px;line-height:1.4;padding:6px 9px;border-radius:8px;white-space:nowrap;transform:translate(-50%,-110%);box-shadow:0 6px 18px rgba(0,0,0,.2)}',
    '.ac-alertas{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}',
    '.ac-alertas li{display:flex;gap:10px;align-items:flex-start;border-radius:10px;padding:8px 10px;font-size:13.5px;border:1px solid}',
    '.ac-alertas .critico{background:#fdf0ee;border-color:#f3c9c4}.ac-alertas .aviso{background:#fff7e6;border-color:#f0dcae}.ac-alertas .info{background:#f5f1ee;border-color:#e8ddd6}',
    '.ac-alertas .ac-ic{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff}',
    '.ac-alertas .critico .ac-ic{background:#b3261e}.ac-alertas .aviso .ac-ic{background:#9a6400}.ac-alertas .info .ac-ic{background:#8a7d77}',
    '.ac-alertas .ac-niv{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#6f625d;margin-right:6px}',
    '.ac-alertas .ac-tx{color:#6f625d;font-size:12.5px}',
    '@media (max-width:760px){.ac-kb{grid-template-columns:repeat(6,82vw)}.ac-lista{max-height:none}}',
  ].join('\n');
  function estilos() { if (document.getElementById('ac-css')) return; var s = document.createElement('style'); s.id = 'ac-css'; s.textContent = CSS; document.head.appendChild(s); }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dBr = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // colunas do quadro, na ordem do trabalho
  var COLUNAS = [
    { st: '', rotulo: 'A fazer', cor: '#b9aca5' },
    { st: 'EM COTAÇÃO', rotulo: 'Em cotação', cor: '#5b7fa6' },
    { st: 'EM ANDAMENTO', rotulo: 'Em andamento', cor: '#c08a2e' },
    { st: 'FINALIZADO', rotulo: 'Concluída', cor: '#2f7a4f' },
    { st: 'NÃO SE APLICA', rotulo: 'Não se aplica', cor: '#8a7d77' },
    { st: 'NÃO DESEJO', rotulo: 'Não desejamos', cor: '#8a7d77' },
  ];
  var rotuloSt = function (st) { for (var i = 0; i < COLUNAS.length; i++) if (COLUNAS[i].st === st) return COLUNAS[i].rotulo; return st || 'A fazer'; };
  var corSt = function (st) { for (var i = 0; i < COLUNAS.length; i++) if (COLUNAS[i].st === st) return COLUNAS[i].cor; return '#b9aca5'; };

  /**
   * Quadro das atividades.
   * opts: { itens: [{chave,texto,status,obs,atrasada,pelo_casal,etapa,prazo,concluida_em}], onMudar(chave, {status?, obs?}) → Promise,
   *         tagCasal: 'casal' | 'por vocês', editavel: true }
   */
  function quadro(el, opts) {
    estilos();
    var estado = el.__ac || (el.__ac = { filtro: 'todas', busca: '', maisFeitas: false });
    var itens = opts.itens || [];
    var q = estado.busca.trim().toLowerCase();
    var etapaAtual = opts.etapaAtual || '';
    var visiveis = itens.filter(function (i) {
      if (estado.filtro === 'atrasadas' && !(i.atrasada && !i.concluida)) return false;
      if (estado.filtro === 'etapa' && i.etapa !== etapaAtual) return false;
      if (q && (i.texto + ' ' + (i.obs || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var nAtr = itens.filter(function (i) { return i.atrasada && !i.concluida; }).length;
    var html = '<div class="ac-barra" role="group" aria-label="Filtrar atividades">' +
      '<button class="ac-chip" data-acf="todas" aria-pressed="' + (estado.filtro === 'todas') + '">Todas</button>' +
      (etapaAtual ? '<button class="ac-chip" data-acf="etapa" aria-pressed="' + (estado.filtro === 'etapa') + '">Etapa atual</button>' : '') +
      '<button class="ac-chip" data-acf="atrasadas" aria-pressed="' + (estado.filtro === 'atrasadas') + '">Atrasadas (' + nAtr + ')</button>' +
      '<input type="search" data-acb placeholder="Buscar atividade" aria-label="Buscar atividade" value="' + esc(estado.busca) + '"></div>';
    html += '<div class="ac-kb">' + COLUNAS.map(function (c) {
      var daCol = visiveis.filter(function (i) { return (i.status || '') === c.st; });
      if (c.st === 'FINALIZADO') daCol.sort(function (a, b) { return String(b.concluida_em || '').localeCompare(String(a.concluida_em || '')); });
      var limite = c.st === 'FINALIZADO' && !estado.maisFeitas && !q ? 25 : Infinity;
      var cards = daCol.slice(0, limite).map(function (i) {
        var meta = [];
        if (i.etapa) meta.push(esc(i.etapa.charAt(0) + i.etapa.slice(1).toLowerCase()));
        if (i.prazo && !i.concluida) meta.push('até ' + esc(i.prazo));
        if (i.concluida_em) meta.push('concluída em ' + dBr(i.concluida_em));
        return '<div class="ac-card" role="button" tabindex="0" draggable="' + (opts.editavel !== false) + '" data-acc="' + esc(i.chave) + '" style="--ac-cor:' + c.cor + '">' +
          '<div>' + esc(i.texto) + '</div>' +
          '<div class="ac-meta">' + (i.atrasada && !i.concluida ? '<span class="ac-tag atr">atrasada</span>' : '') +
          (i.pelo_casal ? '<span class="ac-tag cas">' + esc(opts.tagCasal || 'casal') + '</span>' : '') + meta.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' +
          (i.obs ? '<div class="ac-obs">' + esc(i.obs.length > 120 ? i.obs.slice(0, 120) + '…' : i.obs) + '</div>' : '') + '</div>';
      }).join('');
      if (daCol.length > limite) cards += '<button class="ac-mais" data-acmais>Mostrar todas (' + daCol.length + ')</button>';
      return '<section class="ac-col" data-acst="' + esc(c.st) + '" style="--ac-cor:' + c.cor + '" aria-label="' + c.rotulo + '">' +
        '<h3>' + c.rotulo + '<span class="ac-n">' + daCol.length + '</span></h3>' +
        '<div class="ac-lista">' + (cards || '<div class="ac-vazio">' + (opts.editavel !== false ? 'Arraste uma atividade para cá' : 'Nenhuma') + '</div>') + '</div></section>';
    }).join('') + '</div>';
    el.innerHTML = html;

    var porChave = {}; itens.forEach(function (i) { porChave[i.chave] = i; });
    el.onclick = function (e) {
      var f = e.target.closest('[data-acf]'); if (f) { estado.filtro = f.getAttribute('data-acf'); quadro(el, opts); return; }
      if (e.target.closest('[data-acmais]')) { estado.maisFeitas = true; quadro(el, opts); return; }
      var c = e.target.closest('[data-acc]'); if (c && !estado.arrastou) abrir(porChave[c.getAttribute('data-acc')]);
    };
    el.onkeydown = function (e) { var c = e.target.closest && e.target.closest('[data-acc]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrir(porChave[c.getAttribute('data-acc')]); } };
    var busca = el.querySelector('[data-acb]');
    busca.oninput = function () { estado.busca = busca.value; clearTimeout(estado.t); estado.t = setTimeout(function () { quadro(el, opts); var b = el.querySelector('[data-acb]'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250); };
    if (opts.editavel === false) return;
    // arrastar e soltar (computador); no celular, toque no cartão e escolha a situação
    el.querySelectorAll('[data-acc]').forEach(function (card) {
      card.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', card.getAttribute('data-acc')); e.dataTransfer.effectAllowed = 'move'; card.classList.add('ac-arrastando'); estado.arrastou = true; });
      card.addEventListener('dragend', function () { card.classList.remove('ac-arrastando'); setTimeout(function () { estado.arrastou = false; }, 50); });
    });
    el.querySelectorAll('.ac-col').forEach(function (col) {
      col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('ac-sobre'); });
      col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('ac-sobre'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault(); col.classList.remove('ac-sobre');
        var chave = e.dataTransfer.getData('text/plain'); var it = porChave[chave]; var st = col.getAttribute('data-acst');
        if (!it || (it.status || '') === st) return;
        it.status = st; quadro(el, opts); // otimista
        Promise.resolve(opts.onMudar(chave, { status: st })).catch(function (err) { alert(err.message || 'Não foi possível salvar.'); });
      });
    });

    function abrir(it) {
      if (!it) return;
      var dlg = document.getElementById('ac-dlg');
      if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'ac-dlg'; dlg.className = 'ac-dlg'; document.body.appendChild(dlg); }
      var escolhido = it.status || '';
      dlg.innerHTML = '<form method="dialog"><h4>' + esc(it.texto) + '</h4>' +
        '<div class="ac-meta" style="font-size:12.5px;color:#6f625d;margin-top:-6px">' + [it.etapa ? esc(it.etapa.charAt(0) + it.etapa.slice(1).toLowerCase()) : '', it.prazo && !it.concluida ? 'até ' + esc(it.prazo) : '', it.atrasada && !it.concluida ? '<b style="color:#b3261e">atrasada</b>' : ''].filter(Boolean).join(' · ') + '</div>' +
        '<div class="ac-sts" role="group" aria-label="Situação">' + COLUNAS.map(function (c) { return '<button type="button" data-st="' + esc(c.st) + '" style="--ac-cor:' + c.cor + '" aria-pressed="' + (c.st === escolhido) + '">' + c.rotulo + '</button>'; }).join('') + '</div>' +
        '<label style="font-size:13px;font-weight:600;display:flex;flex-direction:column;gap:4px">Observação<textarea maxlength="500" placeholder="Algo que a equipe precise saber">' + esc(it.obs || '') + '</textarea></label>' +
        '<p class="ac-erro" hidden></p><div class="ac-bt"><button type="button" data-fechar>Cancelar</button><button type="submit" class="ac-pri">Salvar</button></div></form>';
      dlg.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { escolhido = b.getAttribute('data-st'); dlg.querySelectorAll('[data-st]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
      dlg.querySelector('[data-fechar]').onclick = function () { dlg.close(); };
      dlg.querySelector('form').onsubmit = function (e) {
        e.preventDefault();
        var obs = dlg.querySelector('textarea').value; var mud = {};
        if (escolhido !== (it.status || '')) mud.status = escolhido;
        if (obs !== (it.obs || '')) mud.obs = obs;
        if (!Object.keys(mud).length) { dlg.close(); return; }
        var bt = dlg.querySelector('.ac-pri'); bt.disabled = true; bt.textContent = 'Salvando…';
        Promise.resolve(opts.onMudar(it.chave, mud)).then(function () { dlg.close(); }).catch(function (err) {
          var p = dlg.querySelector('.ac-erro'); p.textContent = err.message || 'Não foi possível salvar.'; p.hidden = false; bt.disabled = false; bt.textContent = 'Salvar';
        });
      };
      dlg.showModal();
    }
  }

  /** Burndown: tarefas que faltam × tempo (planejado tracejado, real contínuo, projeção pontilhada). */
  function burndown(el, b, opts) {
    estilos(); opts = opts || {};
    if (!b || !b.pontos || !b.pontos.length) { el.innerHTML = '<p style="color:#6f625d;font-size:13px;margin:0">Sem data do casamento ou sem atividades: o gráfico aparece quando houver.</p>'; return; }
    var W = Math.max(320, Math.min(980, el.clientWidth || 640)); var H = W < 520 ? 230 : 270;
    var m = { l: 34, r: 16, t: 14, b: 26 };
    var t0 = Date.parse(b.inicio + 'T12:00'); var t1 = Date.parse(b.casamento + 'T12:00');
    var x = function (iso) { return m.l + ((Date.parse(iso + 'T12:00') - t0) / (t1 - t0)) * (W - m.l - m.r); };
    var passo = b.total > 80 ? 20 : b.total > 40 ? 10 : 5; var topo = Math.ceil(b.total / passo) * passo || 5;
    var y = function (v) { return m.t + (1 - v / topo) * (H - m.t - m.b); };
    var COR_REAL = '#824634', COR_PLAN = '#8a7d77';
    var g = '';
    for (var v = 0; v <= topo; v += passo) g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#efe6e0" stroke-width="1"/><text x="' + (m.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="11" fill="#8a7d77">' + v + '</text>';
    // meses no eixo x (no máximo ~8 rótulos)
    var d0 = new Date(t0); var meses = []; for (var d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1); d.getTime() <= t1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) meses.push(d);
    var cada = Math.max(1, Math.ceil(meses.length / (W < 520 ? 5 : 8)));
    meses.forEach(function (d, i) {
      if (i % cada) return; var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; var xx = x(iso);
      g += '<line x1="' + xx + '" x2="' + xx + '" y1="' + (H - m.b) + '" y2="' + (H - m.b + 4) + '" stroke="#cbbdb5"/><text x="' + xx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#8a7d77">' + MESES[d.getMonth()] + (d.getMonth() === 0 || i === 0 ? '/' + String(d.getFullYear()).slice(2) : '') + '</text>';
    });
    g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#cbbdb5"/>';
    var linha = function (pts, k) { return pts.filter(function (p) { return p[k] !== null && p[k] !== undefined; }).map(function (p, i) { return (i ? 'L' : 'M') + x(p.data).toFixed(1) + ',' + y(p[k]).toFixed(1); }).join(''); };
    g += '<path d="' + linha(b.pontos, 'planejado') + '" fill="none" stroke="' + COR_PLAN + '" stroke-width="2" stroke-dasharray="6 5" stroke-linejoin="round"/>';
    var reais = b.pontos.filter(function (p) { return p.real !== null; });
    if (reais.length) g += '<path d="' + linha(b.pontos, 'real') + '" fill="none" stroke="' + COR_REAL + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
    var ult = reais[reais.length - 1];
    if (b.previsao && ult) {
      var fimProj = b.previsao <= b.casamento ? b.previsao : b.casamento;
      var restoFim = b.previsao <= b.casamento ? 0 : Math.max(0, ult.real - ult.real * ((t1 - Date.parse(ult.data + 'T12:00')) / (Date.parse(b.previsao + 'T12:00') - Date.parse(ult.data + 'T12:00'))));
      g += '<path d="M' + x(ult.data) + ',' + y(ult.real) + 'L' + x(fimProj) + ',' + y(restoFim) + '" fill="none" stroke="' + COR_REAL + '" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round" opacity=".7"/>';
    }
    if (b.hoje > b.inicio && b.hoje < b.casamento) {
      var xh = x(b.hoje);
      g += '<line x1="' + xh + '" x2="' + xh + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="#2b2220" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/><text x="' + (xh + 4) + '" y="' + (m.t + 10) + '" font-size="11" fill="#6f625d">hoje</text>';
    }
    if (ult) g += '<circle cx="' + x(ult.data) + '" cy="' + y(ult.real) + '" r="4.5" fill="' + COR_REAL + '" stroke="#fff" stroke-width="2"/>' +
      '<text x="' + Math.min(x(ult.data) + 8, W - m.r - 60) + '" y="' + (y(ult.real) - 8) + '" font-size="12" font-weight="700" fill="#2b2220">faltam ' + ult.real + '</text>';
    g += '<line data-cruz x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="#824634" stroke-width="1" opacity="0"/>';
    var dif = b.diferenca;
    var sit = b.restantes === 0 ? 'Tudo concluído' : dif > 0 ? dif + ' à frente do previsto' : dif < 0 ? (-dif) + ' atrás do previsto' : 'No ritmo previsto';
    el.innerHTML = '<div class="ac-bd-kpis"><span>Faltam <b>' + b.restantes + '</b> de ' + b.total + '</span><span>Previsto para hoje: <b>' + b.esperado_hoje + '</b></span>' +
      '<span><b style="color:' + (dif < 0 ? '#b3261e' : '#2f7a4f') + '">' + sit + '</b></span>' +
      (b.previsao ? '<span>No ritmo atual termina em <b>' + dBr(b.previsao) + '</b>' + (b.termina_antes ? '' : ' <b style="color:#b3261e">(depois do casamento)</b>') + '</span>' : '') + '</div>' +
      '<div class="ac-leg"><span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke="' + COR_REAL + '" stroke-width="2.4"/></svg>Real (o que falta)</span>' +
      '<span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke="' + COR_PLAN + '" stroke-width="2" stroke-dasharray="6 5"/></svg>Planejado</span>' +
      (b.previsao ? '<span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke="' + COR_REAL + '" stroke-width="2" stroke-dasharray="2 4" opacity=".7"/></svg>Projeção</span>' : '') + '</div>' +
      '<div class="ac-graf"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Burndown: faltam ' + b.restantes + ' de ' + b.total + ' atividades; previsto para hoje ' + b.esperado_hoje + '">' + g +
      '<rect data-area x="' + m.l + '" y="' + m.t + '" width="' + (W - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/></svg><div class="ac-tip" hidden></div></div>' +
      '<details style="margin-top:6px;font-size:12.5px;color:#6f625d"><summary style="cursor:pointer">Ver em tabela</summary><table style="border-collapse:collapse;margin-top:6px;font-size:12.5px">' +
      '<tr><th style="text-align:left;padding:2px 10px 2px 0">Data</th><th style="text-align:right;padding:2px 10px">Planejado</th><th style="text-align:right;padding:2px 0">Real</th></tr>' +
      b.pontos.filter(function (p, i) { return i % 4 === 0 || p.data === b.hoje || i === b.pontos.length - 1; }).map(function (p) { return '<tr><td style="padding:2px 10px 2px 0">' + dBr(p.data) + '</td><td style="text-align:right;padding:2px 10px">' + p.planejado + '</td><td style="text-align:right">' + (p.real === null ? '—' : p.real) + '</td></tr>'; }).join('') + '</table></details>';
    // dica ao passar o mouse / tocar
    var svg = el.querySelector('svg[role=img]'); var tip = el.querySelector('.ac-tip'); var cruz = svg.querySelector('[data-cruz]');
    var mover = function (ev) {
      var r = svg.getBoundingClientRect(); var px = ((ev.clientX - r.left) / r.width) * W;
      var melhor = null; b.pontos.forEach(function (p) { var dx = Math.abs(x(p.data) - px); if (!melhor || dx < melhor.dx) melhor = { p: p, dx: dx }; });
      if (!melhor) return; var p = melhor.p; var xx = x(p.data);
      cruz.setAttribute('x1', xx); cruz.setAttribute('x2', xx); cruz.setAttribute('opacity', '.5');
      tip.hidden = false; tip.style.left = (xx / W) * r.width + 'px'; tip.style.top = (y(p.real !== null ? p.real : p.planejado) / H) * r.height + 'px';
      tip.innerHTML = '<b>' + dBr(p.data) + '</b><br>Planejado: ' + p.planejado + (p.real !== null ? '<br>Real: ' + p.real : '');
    };
    svg.addEventListener('pointermove', mover); svg.addEventListener('pointerdown', mover);
    svg.addEventListener('pointerleave', function () { tip.hidden = true; cruz.setAttribute('opacity', '0'); });
  }

  /** Lista de alertas (ícone + rótulo: nunca só a cor). */
  function alertas(el, lista, opts) {
    estilos(); opts = opts || {};
    var NIV = { critico: ['!', 'Atrasado'], aviso: ['⏱', 'Vence logo'], info: ['i', 'Para saber'] };
    lista = (lista || []).filter(function (a) { return !opts.semInfo || a.nivel !== 'info'; });
    el.innerHTML = lista.length ? '<ul class="ac-alertas">' + lista.map(function (a) {
      var n = NIV[a.nivel] || NIV.info;
      return '<li class="' + a.nivel + '"><span class="ac-ic" aria-hidden="true">' + n[0] + '</span><div><span class="ac-niv">' + n[1] + '</span><b>' + esc(a.titulo) + '</b>' + (a.texto ? '<div class="ac-tx">' + esc(a.texto) + '</div>' : '') + '</div></li>';
    }).join('') + '</ul>' : '<p style="margin:0;font-size:13.5px;color:#2f7a4f">✔ ' + esc(opts.vazio || 'Nada atrasado. Tudo em dia!') + '</p>';
  }

  /** Itens do quadro a partir do cronograma devolvido pela API (pendentes + concluídas). */
  function itensDoCronograma(c) {
    if (!c) return [];
    var out = []; c.secoes.forEach(function (s) { s.itens.forEach(function (i) { out.push(i); }); });
    return out.concat(c.concluidas || []);
  }
  function etapaAtual(c) { var s = c && c.secoes.filter(function (x) { return x.situacao === 'atual'; })[0]; return s ? s.rotulo : ''; }

  window.Acomp = { quadro: quadro, burndown: burndown, alertas: alertas, itensDoCronograma: itensDoCronograma, etapaAtual: etapaAtual, rotuloSt: rotuloSt, corSt: corSt, COLUNAS: COLUNAS };
})();
