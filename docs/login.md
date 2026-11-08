# Login do Lotus online

O Lotus do computador abre sem login (só atende em `127.0.0.1`). O Lotus online (servidor na Oracle) só atende com
o login ligado: **"Entrar com Google"**, aceito apenas para e-mails cadastrados na tela **Usuários**.

| Perfil | O que acessa |
|---|---|
| **Admin** | Tudo (contratos, checklist, financeiro, painel de gestão, usuários) |
| **Equipe** | Tela inicial, checklist e dados do dia do evento — sem financeiro, gestão, gerador de contratos e valores |
| **Casal** | Só o próprio evento: preparativos (cronograma) e fornecedores/pagamentos, sem alterar nada (`/meu-evento`) |

Os usuários ficam em `CONTRATOS GERADOS/_DADOS DO SISTEMA/usuarios.json` (depois, no PostgreSQL). Trocar o perfil,
bloquear ou "Encerrar sessões" desconecta a pessoa na hora. Os e-mails de `LOTUS_ADMINS` são sempre admin (primeiro acesso).

## Credencial do Google (uma vez, na conta da empresa)

1. Acesse https://console.cloud.google.com com **contatotaynaassessoria@gmail.com** e crie um projeto "Lotus".
2. **APIs e serviços › Tela de permissão OAuth**: tipo *Externo*, nome "Lotus", e-mail de suporte da empresa,
   escopos `openid`, `email`, `profile`. Publique o app (status "Em produção") — só pede e-mail e nome, não precisa
   de verificação do Google.
3. **APIs e serviços › Credenciais › Criar credenciais › ID do cliente OAuth** › *Aplicativo da Web*:
   - Origens JavaScript autorizadas: `https://<endereço do Lotus>`
   - URIs de redirecionamento autorizados: `https://<endereço do Lotus>/auth/google/retorno`
4. Guarde o **ID do cliente** e a **chave secreta** só no cofre (OCI Vault / Secret do Kubernetes `lotus-segredos`) —
   nunca no git, em e-mail ou em mensagem.

## Variáveis do servidor (Secret `lotus-segredos`)

| Variável | Valor |
|---|---|
| `LOTUS_LOGIN` | `1` |
| `HOST` | `0.0.0.0` |
| `LOTUS_URL` | `https://<endereço do Lotus>` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | da credencial acima |
| `LOTUS_SESSAO_SEGREDO` | 32+ caracteres aleatórios (`openssl rand -base64 48`) |
| `LOTUS_ADMINS` | e-mails admin fixos, separados por vírgula |

Sem `LOTUS_LOGIN=1` o servidor recusa atender fora de `127.0.0.1`.

## Segurança

- Fluxo OpenID Connect com `state`, `nonce` e PKCE (S256); o `id_token` vem direto do Google por TLS e é conferido
  (emissor, audiência, validade, nonce, e-mail verificado).
- Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Lax`, assinado com HMAC-SHA256, válido por 12 h; o usuário é
  conferido na lista a cada requisição.
- POST só da própria origem; rotas que mexem no computador (`/api/abrir`, `/api/encerrar`) desligadas online.
- Teste automático: `npm test` (inclui `scripts/testar-login.js`, com um Google falso).
