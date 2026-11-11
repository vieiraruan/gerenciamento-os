# Site taynaalvesassessoria.com.br

Página única estática (`index.html`, `estilo.css`, `site.js`), servida pelo Caddy do servidor Oracle
(`infra/oracle/servidor/Caddyfile`, bloco `{$SITE_DOMINIO}`). `www.` redireciona para o domínio sem www.

- **Pedido de orçamento**: o formulário chama o Lotus pelo mesmo endereço (`/api/publico/servicos`,
  `/api/publico/orcamento`, `/api/publico/horarios`, `/api/publico/agenda`); o Caddy repassa essas rotas
  ao Lotus. O PDF vai por e-mail ao casal e o pedido aparece no aplicativo **Pedidos do site**.
- **Área do casal** → `https://lotus.taynaalvesassessoria.com.br/meu-evento` (login Google).
- **Fotos** (`img/`): ficam só no servidor (`/opt/lotus/gerenciamento-os/site/img`), fora do git.
  Para trocar uma foto, substitua o arquivo lá com o mesmo nome (e a versão `-720.jpg`, menor, para celular).
- Mudou `estilo.css` ou `site.js`? Aumente o `?v=` no `index.html` para os navegadores buscarem a versão nova.
