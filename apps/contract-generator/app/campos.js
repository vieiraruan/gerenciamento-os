/* Lotus: máscaras de CPF/CNPJ e telefone com país (mesmo arquivo no site: site/campos.js).
 *  - CPF/CNPJ: a pessoa digita só números → 000.000.000-00 (11 dígitos) ou 00.000.000/0000-00 (14).
 *  - Telefone: seletor de país + formato internacional → +55 81 99676-0320.
 * Campos: [data-formato="doc"] / [data-formato="tel"] e os já existentes (CPF/CNPJ e telefone de contratos,
 * fornecedores e checklist). Valores colocados pelo próprio código da página também são formatados. */
(() => {
  const PAISES = [
    ['BR', 'Brasil', '55'], ['PT', 'Portugal', '351'], ['US', 'Estados Unidos / Canadá', '1'], ['AR', 'Argentina', '54'],
    ['UY', 'Uruguai', '598'], ['PY', 'Paraguai', '595'], ['CL', 'Chile', '56'], ['IT', 'Itália', '39'], ['ES', 'Espanha', '34'],
    ['FR', 'França', '33'], ['DE', 'Alemanha', '49'], ['GB', 'Reino Unido', '44'], ['CH', 'Suíça', '41'], ['NL', 'Países Baixos', '31'],
    ['IE', 'Irlanda', '353'], ['AU', 'Austrália', '61'],
  ];
  const CODIGOS = PAISES.map((p) => p[2]);
  // idioma da página (site e área do casal): nomes dos países pelo navegador; textos do seletor traduzidos
  const LANG = String(document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
  const TXT = { pt: ['País do telefone', 'Outro país (digite +código)'], en: ['Phone country', 'Other country (type +code)'], es: ['País del teléfono', 'Otro país (escriba +código)'],
    fr: ['Pays du téléphone', 'Autre pays (tapez +indicatif)'], de: ['Land der Telefonnummer', 'Anderes Land (+Vorwahl eingeben)'] }[LANG] || ['País do telefone', 'Outro país (digite +código)'];
  let nomesPaises = null;
  try { if (LANG !== 'pt' && Intl.DisplayNames) nomesPaises = new Intl.DisplayNames([document.documentElement.lang], { type: 'region' }); } catch { /* sem Intl */ }
  const nomePais = (p) => (nomesPaises && p[0] !== 'US' ? nomesPaises.of(p[0]) : p[0] === 'US' && nomesPaises ? `${nomesPaises.of('US')} / ${nomesPaises.of('CA')}` : p[1]);
  // país sugerido quando o campo está vazio: o do idioma (de → Alemanha…), senão Brasil
  const PADRAO = { de: '49', fr: '33', es: '34' }[LANG] || '55';
  const SEL_DOC = '[data-formato="doc"], [data-cli="cpf_cnpj"], #dfDoc';
  const SEL_TEL = '[data-formato="tel"], [data-cli="telefone"], #dfTel, [data-c="telefone"]';
  const nativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const digitos = (s) => String(s == null ? '' : s).replace(/\D/g, '');

  // ---- CPF / CNPJ ----
  function mascara(d, partes, seps) {
    let out = ''; let i = 0;
    partes.forEach((n, k) => { if (i >= d.length) return; if (k > 0) out += seps[k - 1]; out += d.slice(i, i + n); i += n; });
    return out;
  }
  function formatarDoc(v) {
    const d = digitos(v).slice(0, 14);
    if (!d) return '';
    return d.length <= 11 ? mascara(d, [3, 3, 3, 2], ['.', '.', '-']) : mascara(d, [2, 3, 3, 4, 2], ['.', '.', '/', '-']);
  }

  // ---- telefone ----
  function acharCodigo(d) {
    for (const n of [3, 2, 1]) { const c = d.slice(0, n); if (d.length >= n && CODIGOS.includes(c)) return c; }
    return '';
  }
  function formatarNacional(cc, d) {
    if (cc === '55') {
      d = d.slice(0, 11);
      if (d.length <= 2) return d;
      const dd = d.slice(0, 2); const r = d.slice(2);
      if (r.length <= 4) return `${dd} ${r}`;
      const corte = r.length === 8 ? 4 : 5; // fixo 0000-0000, celular 00000-0000
      return r.length > corte ? `${dd} ${r.slice(0, corte)}-${r.slice(corte)}` : `${dd} ${r}`;
    }
    d = d.slice(0, 15 - cc.length);
    if (cc === '1') return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(' ');
    const grupos = []; while (d.length > 4) { grupos.push(d.slice(0, 3)); d = d.slice(3); } grupos.push(d);
    return grupos.filter(Boolean).join(' ');
  }
  /** "+55 81 99676-0320" a partir do que foi digitado; sem "+", usa o país escolhido (padrão Brasil). */
  function formatarTel(texto, ccEscolhido) {
    const t = String(texto == null ? '' : texto).trim();
    let d = digitos(t);
    if (!d) return t.startsWith('+') ? '+' : '';
    let cc;
    if (t.startsWith('+')) {
      cc = acharCodigo(d);
      if (!cc) return `+${d.slice(0, 15)}`;
      d = d.slice(cc.length);
    } else {
      cc = ccEscolhido || '55';
      d = d.replace(/^0+/, '');
      if (cc === '55' && d.length >= 12 && d.startsWith('55')) d = d.slice(2);
    }
    return d ? `+${cc} ${formatarNacional(cc, d)}` : `+${cc}`;
  }
  const codigoDe = (valor) => (String(valor || '').trim().startsWith('+') ? acharCodigo(digitos(valor)) : '');

  // ---- estilo do seletor de país ----
  const estilo = document.createElement('style');
  estilo.textContent = '.lc-tel{display:flex;gap:6px;align-items:stretch;width:100%}' +
    '.lc-tel>select{flex:0 0 auto;width:auto!important;max-width:84px;min-width:0;padding-right:4px}' +
    '.lc-tel>input{flex:1 1 auto;min-width:0;width:auto!important}';
  document.head.appendChild(estilo);

  function prepararDoc(el) {
    el.dataset.lcPronto = '1';
    el.setAttribute('inputmode', 'numeric');
    if (!el.placeholder) el.placeholder = '000.000.000-00';
    Object.defineProperty(el, 'value', { configurable: true, get() { return nativo.get.call(el); }, set(v) { nativo.set.call(el, formatarDoc(v)); } });
    el.addEventListener('input', () => { const f = formatarDoc(nativo.get.call(el)); if (f !== nativo.get.call(el)) nativo.set.call(el, f); });
    nativo.set.call(el, formatarDoc(nativo.get.call(el)));
  }

  function prepararTel(el) {
    el.dataset.lcPronto = '1';
    el.setAttribute('inputmode', 'tel');
    if (!el.getAttribute('autocomplete')) el.setAttribute('autocomplete', 'tel');
    el.placeholder = '+55 81 90000-0000';
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', TXT[0]);
    sel.innerHTML = PAISES.map((p) => `<option value="${p[2]}" title="${nomePais(p)}">${p[0]}</option>`).join('') +
      '<option value="">+…</option>';
    // fechado mostra só a sigla do país (o código já aparece no número); aberto, o nome e o código
    const rotulos = (longo) => [...sel.options].forEach((o, i) => {
      const p = PAISES[i]; o.textContent = p ? (longo ? `${p[0]} · ${nomePais(p)} (+${p[2]})` : p[0]) : (longo ? TXT[1] : '+…');
    });
    sel.addEventListener('focus', () => rotulos(true)); sel.addEventListener('mousedown', () => rotulos(true));
    sel.addEventListener('blur', () => rotulos(false));
    if (el.className) sel.className = el.className;
    const caixa = document.createElement('span'); caixa.className = 'lc-tel';
    el.parentNode.insertBefore(caixa, el); caixa.appendChild(sel); caixa.appendChild(el);

    const sincronizar = () => { const cc = codigoDe(nativo.get.call(el)); sel.value = cc || (nativo.get.call(el).trim().startsWith('+') ? '' : sel.value || '55'); };
    // valor colocado pelo código (dados salvos): sem "+" é número do Brasil
    const aplicar = (v) => { nativo.set.call(el, formatarTel(v, '55')); sel.value = '55'; sincronizar(); };
    Object.defineProperty(el, 'value', { configurable: true, get() { return nativo.get.call(el); }, set(v) { aplicar(v); } });
    el.addEventListener('input', () => { const atual = nativo.get.call(el); const f = formatarTel(atual, sel.value || '55'); if (f !== atual) nativo.set.call(el, f); sincronizar(); });
    el.addEventListener('blur', () => { if (/^\+\d{0,3}$/.test(nativo.get.call(el).trim())) { nativo.set.call(el, ''); el.dispatchEvent(new Event('change', { bubbles: true })); } });
    sel.addEventListener('change', () => {
      rotulos(false);
      const atual = nativo.get.call(el); const cc = codigoDe(atual);
      const nacional = cc ? digitos(atual).slice(cc.length) : digitos(atual);
      if (!sel.value) { nativo.set.call(el, '+'); el.focus(); return; }
      nativo.set.call(el, nacional ? formatarTel(nacional, sel.value) : '');
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    sel.value = '55';
    aplicar(nativo.get.call(el));
    if (!nativo.get.call(el) && PADRAO !== '55') { sel.value = PADRAO; el.placeholder = `+${PADRAO} …`; }
  }

  function preparar(raiz) {
    if (!raiz || !raiz.querySelectorAll) return;
    const lista = (s) => [...(raiz.matches && raiz.matches(s) ? [raiz] : []), ...raiz.querySelectorAll(s)];
    lista(SEL_DOC).forEach((el) => { if (el.tagName === 'INPUT' && !el.dataset.lcPronto) prepararDoc(el); });
    lista(SEL_TEL).forEach((el) => { if (el.tagName === 'INPUT' && !el.dataset.lcPronto) prepararTel(el); });
  }

  window.LotusCampos = { formatarDoc, formatarTel, preparar };
  const iniciar = () => {
    preparar(document.body);
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) preparar(n); })
      .observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
