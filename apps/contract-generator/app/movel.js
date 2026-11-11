/* Lotus no celular: tabelas que rolam de lado e telas "lista → detalhe" (escolheu um casal, a lista sai). */
(() => {
  const celular = window.matchMedia('(max-width: 760px)');
  const pagina = location.pathname.replace(/\/$/, '') || '/';

  // Onde fica a lista, o detalhe e o que abre um item, por tela
  const TELAS = {
    '/financeiro': { lista: '.layout > aside', detalhe: '.layout > main', item: '#lista li[data-a]', rotulo: 'Casais', param: /[?&](arquivo|casal)=/ },
    '/checklist': { lista: '.layout > aside', detalhe: '.layout > main', item: '#lista li[data-a]', rotulo: 'Casais', param: /[?&](arquivo|casal)=/ },
    '/contratos': { lista: '.layout > aside:not(.lateral-dir)', detalhe: '.layout > main, .layout > .lateral-dir', item: '#listaContratos li[data-arq], #btnNovo', rotulo: 'Contratos', param: /[?&]arquivo=/ },
    '/index.html': null,
    '/cronograma': { lista: '.corpo > .lista, #kpis', detalhe: '#detalhe', item: '.casal', rotulo: 'Casais', param: /[?&]casal=/ },
    '/pedidos': { lista: 'main > .lista', detalhe: '#detalhe', item: 'tr.linha', rotulo: 'Pedidos', param: /[?&]id=/ },
  };
  TELAS['/index.html'] = TELAS['/contratos'];
  const tela = TELAS[pagina];

  // ---- tabelas: embrulha cada uma numa caixa que rola de lado ----
  function embrulharTabelas(raiz) {
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('table').forEach((t) => {
      const pai = t.parentElement;
      if (!pai || pai.classList.contains('m-rolar') || pai.classList.contains('tabela')) {
        if (pai && pai.classList.contains('tabela')) pai.classList.add('m-rolar');
        return;
      }
      const caixa = document.createElement('div');
      caixa.className = 'm-rolar';
      pai.insertBefore(caixa, t);
      caixa.appendChild(t);
    });
  }

  function iniciar() {
    embrulharTabelas(document);
    new MutationObserver((mudancas) => {
      for (const m of mudancas) for (const n of m.addedNodes) if (n.nodeType === 1) embrulharTabelas(n.tagName === 'TABLE' ? n.parentElement || document : n);
    }).observe(document.body, { childList: true, subtree: true });

    // botão do cabeçalho com texto curto no celular ("+ Novo contrato" → "+ Novo")
    const novo = document.querySelector('header #btnNovo');
    if (novo) {
      const longo = novo.textContent;
      const ajustar = () => { novo.textContent = celular.matches ? '+ Novo' : longo; };
      ajustar(); celular.addEventListener('change', ajustar);
    }

    if (!tela) return;
    document.querySelectorAll(tela.lista).forEach((e) => e.setAttribute('data-m-lista', ''));
    const detalhes = document.querySelectorAll(tela.detalhe);
    if (!detalhes.length) return;
    detalhes.forEach((e) => e.setAttribute('data-m-detalhe', ''));
    const detalhe = detalhes[0];
    const voltar = document.createElement('button');
    voltar.type = 'button'; voltar.className = 'm-voltar'; voltar.textContent = `← ${tela.rotulo}`;
    detalhe.parentElement.insertBefore(voltar, detalhe);

    const mostrarDetalhe = (empilhar) => {
      if (!celular.matches || document.body.classList.contains('m-detalhe')) return;
      document.body.classList.add('m-detalhe');
      if (empilhar) history.pushState({ lotusDetalhe: 1 }, '', location.href); // o "voltar" do celular volta para a lista
      window.scrollTo(0, 0);
    };
    const mostrarLista = () => {
      document.body.classList.remove('m-detalhe');
      window.scrollTo(0, 0);
    };
    voltar.addEventListener('click', () => { if (history.state && history.state.lotusDetalhe) history.back(); else mostrarLista(); });
    window.addEventListener('popstate', () => { if (!(history.state && history.state.lotusDetalhe)) mostrarLista(); });
    // antes do clique da própria tela (fase de captura): marca o detalhe e empilha o histórico
    document.addEventListener('click', (ev) => {
      const alvo = ev.target.closest && ev.target.closest(tela.item);
      if (alvo && !alvo.closest('[data-m-detalhe-ignorar]')) mostrarDetalhe(true);
    }, true);
    // aberto já com um casal/pedido no endereço (ex.: vindo do Painel de gestão)
    if (tela.param.test(location.search)) mostrarDetalhe(false);
    celular.addEventListener('change', () => { if (!celular.matches) document.body.classList.remove('m-detalhe'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
