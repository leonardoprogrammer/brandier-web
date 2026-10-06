# Brandier Web

Front-end da **Brandier**, uma plataforma de gestão de promotores de marca: o gestor de uma marca cadastra lojas e produtos, convida promotores e acompanha as reposições que eles registram nos pontos de venda.

> Projeto de portfólio. A aplicação que está no ar **não é para uso comercial**. O código é livre: você pode clonar, estudar e fazer fork.

A API fica no repositório `brandier-api`.

## Tecnologias

| Área | O que é usado |
|---|---|
| Framework | Angular 20 (componentes standalone, signals, formulários reativos) |
| Renderização | SSR com Express; as páginas públicas são prerenderizadas |
| Estilo | Tailwind CSS 3 |
| Reatividade | RxJS |
| Testes | Jasmine e Karma (Chrome headless) |

## Telas

| Rota | Tela | Acesso |
|---|---|---|
| `/entrar` | Login, com link para recuperar a senha | Visitante |
| `/cadastro` | Criação de conta, com aceite dos termos | Visitante |
| `/verificar-email` | Confirma o e-mail pelo link recebido | Qualquer |
| `/esqueci-senha` | Pede o link de redefinição de senha | Visitante |
| `/redefinir-senha` | Define a nova senha pelo link recebido | Qualquer |
| `/sobre` | Sobre o projeto, privacidade e contato | Público |
| `/painel` | Painel (provisório, em construção) | Autenticado |

## Estrutura do código

Em `src/app`:

| Pasta | Conteúdo |
|---|---|
| `pages` | Telas roteadas, carregadas sob demanda (*lazy loading*) |
| `components` | Componentes reutilizáveis (layouts, requisitos de senha) |
| `services` | `AuthService`, que concentra a sessão e as chamadas à API |
| `interceptors` | Renovação automática da sessão |
| `guards` | Proteção de rotas (autenticado / visitante) |
| `validators` | Regras de senha |
| `core` | Leitura de erros da API e constantes |
| `models` | Tipos de dados |

### Convenções

- **Textos, rotas e nomes de negócio em português** (`entrar`, `cadastro`, `senha`); **peças técnicas em inglês** (`AuthService`, `auth.interceptor`).
- Sem comentários no código; nomes expressivos no lugar.

## Decisões técnicas

### Sessão

- A sessão vive em **cookies `HttpOnly`** definidos pela API: o JavaScript do front **nunca vê os tokens**. O front só guarda o usuário atual, em um *signal*.
- Ao iniciar, o app chama `GET /api/v1/usuario/eu` para descobrir se há sessão (e, de quebra, obter o cookie `XSRF-TOKEN`).
- O **interceptor** trata o `401`: renova a sessão **uma única vez** (mesmo com várias requisições simultâneas), repete a requisição e, se a renovação falhar, leva o usuário ao login.
- **CSRF**: o suporte nativo do Angular lê o cookie `XSRF-TOKEN` e envia o cabeçalho `X-XSRF-TOKEN` nas requisições que alteram dados.

### SSR e navegação

- As páginas **públicas** (`/entrar`, `/cadastro`, `/esqueci-senha`, `/sobre`) são prerenderizadas; as demais, renderizadas no navegador.
- Os *guards* só consultam a sessão no navegador (no servidor, deixam passar), porque os cookies `HttpOnly` não são legíveis pelo JavaScript.
- O token dos links de e-mail é **removido da barra de endereço** assim que a tela carrega, e o `index.html` define a política de *referrer* como `same-origin`.

### Formulários e acessibilidade

- As validações do front **espelham as da API** (por exemplo, limite de 72 bytes na senha), mas a API continua sendo a fonte da verdade; erros por campo vindos dela aparecem junto ao campo.
- Rótulos associados, `aria-invalid`, mensagens com `role="alert"` e estados de carregamento e erro em todas as telas.
- Layout responsivo e sem dependência de biblioteca de componentes.

## Como executar

Requisitos: **Node.js 20.19 ou superior** e a API rodando em `http://localhost:8080` (veja o README do `brandier-api`).

```bash
npm install
npm start
```

A aplicação sobe em `http://localhost:4200`. O arquivo `proxy.conf.json` encaminha `/api` para a porta 8080, de modo que front e API pareçam a mesma origem, como em produção (necessário para os cookies e para o CSRF).

| Comando | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento (porta 4200) |
| `npm run build` | Build de produção, com SSR e prerender |
| `npm test` | Testes unitários (Karma) |
| `npm run serve:ssr:brandier-web` | Serve o build com SSR (porta 4000; `PORT` configura) |

### Configuração

- `src/environments/environment*.ts`: contém só valores **públicos** (`apiUrl: '/api/v1'`). Tudo que vai nesses arquivos é entregue ao navegador, então **nenhum segredo** deve ficar ali.
- `.env.example`: variáveis do processo Node do SSR (`PORT`). O `.env` real não é versionado.

## Testes

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

Cobrem validadores, leitura de erros da API, serviço de autenticação, interceptor, guards, as telas de autenticação e a página Sobre. O build de produção (`npm run build`) também compila os templates em modo estrito.
