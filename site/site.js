/* Site Tayná Alves Assessoria: menu no celular e pedido de orçamento ligado ao Lotus (/api/publico/*). */
(() => {
  const $ = (s) => document.querySelector(s);
  const WHATS = 'https://wa.me/5581996760320';

  // ---- menu (celular/tablet) ----
  const botao = $('.menu-btn'); const menu = $('#menu');
  const fechar = () => { menu.classList.remove('aberto'); botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-label', 'Abrir menu'); };
  botao.addEventListener('click', () => {
    const abrir = !menu.classList.contains('aberto');
    menu.classList.toggle('aberto', abrir);
    botao.setAttribute('aria-expanded', String(abrir)); botao.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) fechar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

  // ---- chamadas ao Lotus ----
  async function api(caminho, corpo) {
    const op = corpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) } : {};
    let r;
    try { r = await fetch(caminho, op); } catch { throw new Error('Sem conexão. Confira a internet e tente de novo, ou chame a Tayná no WhatsApp.'); }
    let j = {}; try { j = await r.json(); } catch { /* resposta vazia */ }
    if (!r.ok || j.erro) throw new Error(j.erro || 'Não foi possível enviar agora. Tente de novo ou chame a Tayná no WhatsApp.');
    return j;
  }

  // ---- serviços (lista do Lotus; se falhar, fica a lista fixa) ----
  const SERVICOS_PADRAO = [
    ['so_vou_pra_casar', 'Só Vou Pra Casar'], ['essencial', 'O Essencial'], ['dia_d', 'Dia D Completo'], ['empurraozinho', 'O Empurrãozinho'],
    ['necessario', 'O Necessário'], ['te_deixa_tranquila', 'Te Deixa Tranquila'], ['sai_na_vassoura', 'Sai na Vassoura'], ['nao_sei', 'Ainda não sei'],
  ];
  const sel = $('#servico');
  function preencherServicos(lista) {
    sel.innerHTML = '';
    for (const [id, nome] of lista) { const o = document.createElement('option'); o.value = id; o.textContent = nome; sel.appendChild(o); }
    sel.value = lista.some(([id]) => id === 'essencial') ? 'essencial' : lista[0][0];
  }
  preencherServicos(SERVICOS_PADRAO);
  api('/api/publico/servicos').then((j) => { if (j.servicos && j.servicos.length) preencherServicos(j.servicos.map((s) => [s.id, s.nome])); }).catch(() => {});

  // ---- 1. pedido de orçamento ----
  const form = $('#formOrc'); const erroOrc = $('#erroOrc'); const btnEnviar = $('#btnEnviar');
  let pedido = null; let escolhido = null;
  const mostrarErro = (el, msg) => { el.textContent = msg; el.hidden = !msg; };

  function validar() {
    const f = form.elements; let primeiro = null;
    const marca = (campo, ok) => { campo.setAttribute('aria-invalid', ok ? 'false' : 'true'); if (!ok && !primeiro) primeiro = campo; };
    marca(f.nome, f.nome.value.trim().length >= 3);
    marca(f.whatsapp, f.whatsapp.value.replace(/\D/g, '').length >= 10);
    marca(f.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()));
    if (primeiro) { primeiro.focus(); return 'Confira os campos marcados: nome do casal, WhatsApp com DDD e e-mail.'; }
    if (!f.consentimento.checked) { f.consentimento.focus(); return 'Para receber o orçamento por e-mail, marque a autorização.'; }
    return '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = validar(); mostrarErro(erroOrc, msg); if (msg) return;
    const f = form.elements;
    const dados = {
      nome: f.nome.value.trim(), whatsapp: f.whatsapp.value.trim(), email: f.email.value.trim(), data: f.data.value,
      convidados: f.convidados.value, cidade: f.cidade.value.trim(), servico: f.servico.value, fora: f.fora.checked,
      mensagem: f.mensagem.value.trim(), consentimento: f.consentimento.checked, site: f.site.value,
    };
    btnEnviar.disabled = true; btnEnviar.textContent = 'Enviando…';
    try {
      pedido = await api('/api/publico/orcamento', dados);
      $('#servicoNome').textContent = pedido.servico || sel.options[sel.selectedIndex].text;
      $('#msgRecebido').textContent = `Pedido recebido, ${dados.nome}!`;
      const w = pedido.whatsapp || WHATS; $('#linkWhats').href = w; $('#linkWhats2').href = w;
      form.hidden = true; $('#etapaEnviado').hidden = false;
      $('#painel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      carregarHorarios();
    } catch (err) { mostrarErro(erroOrc, err.message); }
    finally { btnEnviar.disabled = false; btnEnviar.textContent = 'Pedir orçamento'; }
  });

  // ---- 2. horário para conversar com a Tayná ----
  const caixaHorarios = $('#horarios'); const btnAgendar = $('#btnAgendar'); const erroAgenda = $('#erroAgenda');
  async function carregarHorarios() {
    caixaHorarios.innerHTML = '<p class="pequeno">Carregando os horários…</p>'; btnAgendar.hidden = true; escolhido = null;
    let lista = [];
    try { lista = (await api('/api/publico/horarios')).horarios || []; } catch { /* sem agenda: só WhatsApp */ }
    caixaHorarios.innerHTML = '';
    if (!lista.length) {
      caixaHorarios.innerHTML = '<p class="pequeno">Os horários online não estão disponíveis agora. Chame a Tayná no WhatsApp para combinar a conversa.</p>';
      return;
    }
    lista.slice(0, 12).forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      b.textContent = h.rotulo; b.dataset.inicio = h.inicio;
      b.addEventListener('click', () => {
        caixaHorarios.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', 'false'));
        b.setAttribute('aria-checked', 'true'); escolhido = h;
      });
      caixaHorarios.appendChild(b);
    });
    escolhido = lista[0]; btnAgendar.hidden = false;
  }
  btnAgendar.addEventListener('click', async () => {
    if (!pedido || !escolhido) return;
    mostrarErro(erroAgenda, ''); btnAgendar.disabled = true; btnAgendar.textContent = 'Enviando…';
    try {
      const r = await api('/api/publico/agenda', { id: pedido.id, token: pedido.token, inicio: escolhido.inicio });
      $('#horarioEscolhido').textContent = r.rotulo || escolhido.rotulo;
      $('#etapaEnviado').hidden = true; $('#etapaAgendado').hidden = false;
      $('#painel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      mostrarErro(erroAgenda, err.message);
      if (/ocupado/i.test(err.message)) carregarHorarios();
    } finally { btnAgendar.disabled = false; btnAgendar.textContent = 'Solicitar este horário'; }
  });

  // ---- 3. recomeçar ----
  $('#btnRecomecar').addEventListener('click', () => {
    form.reset(); sel.value = 'essencial'; pedido = null;
    $('#etapaAgendado').hidden = true; $('#etapaEnviado').hidden = true; form.hidden = false;
    form.elements.nome.focus();
  });
})();
