# bio.agorap.org

Landing page institucional editorial do Instituto Ágora Perene.  
Hub do ecossistema — feed consolidado automático das três plataformas.

## Estrutura

```
bio-agorap/
├── index.html      — Página principal
├── style.css       — Estilos (zero dependências)
├── app.js          — Feed consolidado via WordPress REST API
├── favicon.svg     — Ícone vetorial
├── .htaccess       — Configuração Apache (Hostinger)
├── _headers        — Headers Cloudflare Pages
├── _redirects      — Redirects Cloudflare Pages / Netlify
├── robots.txt
└── .gitignore
```

## Deploy — Hostinger

1. Acesse o **File Manager** ou conecte via FTP/SFTP.
2. Navegue até `public_html` (ou o diretório raiz do subdomínio `bio.agorap.org`).
3. Faça upload de todos os arquivos.
4. Verifique se o `.htaccess` foi enviado (arquivos ocultos precisam estar visíveis).
5. Aponte o subdomínio `bio.agorap.org` para o diretório correto em **Subdominios**.

## Deploy — Cloudflare Pages (recomendado)

1. Conecte este repositório GitHub ao Cloudflare Pages.
2. Build command: *(vazio — site estático puro)*
3. Output directory: `/` (raiz)
4. Configure o domínio customizado `bio.agorap.org`.
5. Os arquivos `_headers` e `_redirects` são lidos automaticamente.

## Deploy via GitHub + Cloudflare (fluxo recomendado)

```bash
git init
git remote add origin https://github.com/SEU_USER/bio-agorap.git
git add .
git commit -m "feat: landing page inicial"
git push -u origin main
```

Depois conecte o repositório no painel do Cloudflare Pages.  
Cada `git push` dispara um novo deploy automaticamente.

## Configurações que podem precisar de ajuste

### `index.html`

| Trecho | O que mudar |
|--------|-------------|
| `href="https://revista.agorap.org/#newsletter"` | Substituir pela URL real de inscrição da newsletter |
| `href="https://instagram.com/agoraperene"` | Confirmar handle do Instagram |
| `href="https://agorap.org/contato"` | Confirmar URL de contato |
| `content="https://bio.agorap.org/og-image.jpg"` | Adicionar imagem Open Graph (1200×630px) |

### `app.js`

| Constante | Padrão | Descrição |
|-----------|--------|-----------|
| `CACHE_TTL_MS` | 15 min | Tempo de cache do feed no sessionStorage |
| `POSTS_EACH` | 6 | Posts buscados por fonte |
| `POSTS_TOTAL` | 12 | Posts exibidos no feed final |
| `FETCH_TIMEOUT` | 8000ms | Timeout por requisição à API |

## Cloudflare — configurações recomendadas

- **Cache Rules**: HTML com TTL de 10 min, assets estáticos com TTL de 1 mês.
- **Speed > Minification**: ativar HTML, CSS, JS.
- **Speed > Rocket Loader**: **desativar** (página já é leve; Rocket Loader pode atrasar o feed).
- **Security > WAF**: regra para bloquear bots agressivos.
- **SSL/TLS**: Full (strict).
- **Page Rules** ou **Redirect Rules**: `www.bio.agorap.org` → `bio.agorap.org`.

## Segurança

- Nenhum dado sensível no cliente.
- CSP configurada no `.htaccess` restringe origens permitidas.
- Todas as URLs externas recebem `rel="noopener"`.
- Conteúdo da API é sanitizado antes da renderização (`escapeHTML`, `sanitizeURL`, `DOMParser`).
- Sem cookies, sem rastreamento de terceiros.

## Performance

- Zero dependências JS de terceiros.
- Google Fonts carregado com `display=swap` e `preconnect`.
- Imagens com `loading="lazy"` e `decoding="async"`.
- Skeleton loading durante fetch das APIs.
- Cache de 15 min no `sessionStorage` evita refetch em navegação.
- `defer` no script principal.
- CSS inline crítico pode ser extraído se LCP precisar de otimização adicional.

## Manutenção

A página é **totalmente automática**. Não requer edição manual após o deploy.  
Novos posts publicados em qualquer das três plataformas aparecem automaticamente no feed.

Para atualizar links permanentes ou textos dos CTAs, edite apenas o `index.html`.
