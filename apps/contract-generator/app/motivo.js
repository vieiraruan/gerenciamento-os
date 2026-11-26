/* Lotus · antes de confirmar uma correção ou exclusão, pede o motivo (vai para o registro de alterações).
 * pedirMotivo({ titulo, texto, botao, perigo }) → Promise<string | null> (null = cancelado). */
(function () {
  'use strict';
  var CSS = '.mt-dlg{border:0;border-radius:16px;padding:0;width:min(460px,calc(100vw - 16px));box-shadow:0 20px 60px rgba(0,0,0,.25);font:15px/1.45 "Segoe UI",system-ui,-apple-system,sans-serif;color:#2b2220}'
    + '.mt-dlg::backdrop{background:rgba(43,34,32,.45)}.mt-dlg form{padding:18px 20px;display:flex;flex-direction:column;gap:10px}'
    + '.mt-dlg h3{margin:0;color:#824634;font-size:17px}.mt-dlg .mt-txt{font-size:14px;color:#2b2220;background:#f8f3ef;border-radius:10px;padding:10px 12px;white-space:pre-line}'
    + '.mt-dlg label{font-size:13px;font-weight:700;color:#6f625d;display:flex;flex-direction:column;gap:5px}'
    + '.mt-dlg textarea{font:inherit;font-size:15px;border:1px solid #eadcd4;border-radius:10px;padding:9px 11px;min-height:84px;resize:vertical;color:#2b2220}'
    + '.mt-dlg textarea:focus{outline:2px solid #a8705c;outline-offset:1px}.mt-dlg .mt-dica{font-size:12px;color:#6f625d;margin:-4px 0 0}'
    + '.mt-dlg .mt-erro{color:#b3261e;font-size:13px;margin:0}.mt-dlg .mt-bt{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}'
    + '.mt-dlg .mt-bt button{font:inherit;font-weight:600;border-radius:10px;padding:9px 16px;border:1px solid #824634;background:#fff;color:#824634;cursor:pointer;min-height:40px}'
    + '.mt-dlg .mt-bt .mt-ok{background:#824634;color:#fff}.mt-dlg .mt-bt .mt-ok.perigo{background:#b3261e;border-color:#b3261e}';
  function pedirMotivo(o) {
    o = o || {};
    if (!document.getElementById('mt-css')) { var st = document.createElement('style'); st.id = 'mt-css'; st.textContent = CSS; document.head.appendChild(st); }
    var dlg = document.createElement('dialog'); dlg.className = 'mt-dlg';
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    dlg.innerHTML = '<form method="dialog"><h3>' + esc(o.titulo || 'Confirmar alteração') + '</h3>'
      + (o.texto ? '<div class="mt-txt">' + esc(o.texto) + '</div>' : '')
      + '<label>Motivo da alteração *<textarea maxlength="500" required placeholder="Ex.: o casal digitou 30.000 em vez de 3.000"></textarea></label>'
      + '<p class="mt-dica">Fica no registro de alterações (quem, quando e por quê).</p><p class="mt-erro" hidden></p>'
      + '<div class="mt-bt"><button type="button" class="mt-cancelar">Cancelar</button><button type="submit" class="mt-ok' + (o.perigo ? ' perigo' : '') + '">' + esc(o.botao || 'Confirmar alteração') + '</button></div></form>';
    document.body.appendChild(dlg);
    return new Promise(function (resolve) {
      var feito = false;
      var fim = function (v) { if (feito) return; feito = true; resolve(v); dlg.close(); dlg.remove(); };
      dlg.querySelector('.mt-cancelar').onclick = function () { fim(null); };
      dlg.addEventListener('cancel', function () { fim(null); });
      dlg.querySelector('form').onsubmit = function (e) {
        e.preventDefault();
        var m = dlg.querySelector('textarea').value.replace(/\s+/g, ' ').trim();
        if (m.length < 5) { var p = dlg.querySelector('.mt-erro'); p.textContent = 'Escreva o motivo (pelo menos 5 letras).'; p.hidden = false; return; }
        fim(m);
      };
      dlg.showModal(); dlg.querySelector('textarea').focus();
    });
  }
  window.pedirMotivo = pedirMotivo;
})();
