/* ═══════════════════════════════════════════════════════════
   ÁGORA PERENE — Feed consolidado
   Consome as três APIs do WordPress, unifica e ordena por data
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── Configuração ─── */
const CONFIG = {
  CACHE_KEY:     'agora_feed_v3',
  CACHE_TTL_MS:  15 * 60 * 1000,   /* 15 minutos */
  POSTS_EACH:    6,
  POSTS_TOTAL:   10,
  FETCH_TIMEOUT: 8000,              /* 8 segundos por fonte */

  SOURCES: [
    {
      id:       'ensino',
      label:    'Ensino',
      tag:      'card__tag--ensino',
      url:      'https://ensino.agorap.org/wp-json/wp/v2/posts',
      postType: 'posts',
    },
    {
      id:       'revista',
      label:    'Revista',
      tag:      'card__tag--revista',
      url:      'https://revista.agorap.org/wp-json/wp/v2/posts',
      postType: 'posts',
    },
    {
      id:       'podcast',
      label:    'Podcast',
      tag:      'card__tag--podcast',
      url:      'https://revista.agorap.org/wp-json/wp/v2/podcast',
      postType: 'podcast',
    },
    {
      id:       'inst',
      label:    'Instituto',
      tag:      'card__tag--inst',
      url:      'https://agorap.org/wp-json/wp/v2/posts',
      postType: 'posts',
    },
  ],
};

/* ─── Cache local (sessionStorage) ─── */
const Cache = {
  get() {
    try {
      const raw = sessionStorage.getItem(CONFIG.CACHE_KEY);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CONFIG.CACHE_TTL_MS) { this.clear(); return null; }
      return data;
    } catch { return null; }
  },
  set(data) {
    try {
      sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch { /* sessionStorage indisponível */ }
  },
  clear() {
    try { sessionStorage.removeItem(CONFIG.CACHE_KEY); } catch { }
  },
};

/* ─── Fetch com timeout ─── */
async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const tid   = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(tid);
  }
}

/* ─── Normaliza um post WP em estrutura comum ─── */
function normalizePost(raw, source) {
  const embed    = raw._embedded || {};
  const terms    = embed['wp:term']?.[0] || [];
  const category = decodeHTMLEntities(terms.find(t => t.taxonomy === 'category')?.name || '');

  /* Imagem destacada */
  let image = null;
  const media = embed['wp:featuredmedia']?.[0];
  if (media?.media_details?.sizes) {
    const sizes = media.media_details.sizes;
    /* Preferência: medium_large → medium → full */
    const preferred = ['medium_large', 'medium', 'full'];
    for (const size of preferred) {
      if (sizes[size]?.source_url) { image = sizes[size].source_url; break; }
    }
  }
  if (!image && media?.source_url) image = media.source_url;

  /* Excerpt sem HTML */
  const excerptRaw = raw.excerpt?.rendered || '';
  const excerpt    = excerptRaw.replace(/<[^>]+>/g, '').replace(/\[.*?\]/g, '').trim();

  /* Título decodificado */
  const titleRaw = raw.title?.rendered || 'Sem título';
  const title    = decodeHTMLEntities(titleRaw);

  return {
    id:       `${source.id}-${raw.id}`,
    source,
    date:     new Date(raw.date_gmt ? raw.date_gmt + 'Z' : raw.date),
    dateStr:  raw.date,
    title,
    excerpt:  excerpt.slice(0, 140) + (excerpt.length > 140 ? '…' : ''),
    category,
    image,
    link:     raw.link,
  };
}

/* ─── Sanitização básica ─── */
function decodeHTMLEntities(str) {
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent || str;
}

function sanitizeURL(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '#';
    return url;
  } catch { return '#'; }
}

/* ─── Formata data em pt-BR compacto ─── */
function formatDate(date) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(date);
  } catch { return ''; }
}

/* ─── Render de um card ─── */
function renderCard(post) {
  const url      = sanitizeURL(post.link);
  const dateText = formatDate(post.date);

  const imgHTML = post.image
    ? `<img
         class="card__img"
         src="${sanitizeURL(post.image)}"
         alt=""
         loading="lazy"
         decoding="async"
         width="100"
         height="88"
       >`
    : `<div class="card__img-placeholder" aria-hidden="true">
         <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
           <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
           <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.2"/>
           <path d="M3 16l5-5 3 3 3-3 7 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
       </div>`;

  const categoryHTML = post.category
    ? `<span class="card__category">${escapeHTML(post.category)}</span>`
    : '';

  const excerptHTML = post.excerpt
    ? `<p class="card__excerpt">${escapeHTML(post.excerpt)}</p>`
    : '';

  return `
    <a class="card" href="${url}" rel="noopener" target="_blank" aria-label="${escapeHTML(post.title)} — ${post.source.label}">
      <div class="card__img-wrap">${imgHTML}</div>
      <div class="card__body">
        <div class="card__meta">
          <span class="card__tag ${post.source.tag}">${escapeHTML(post.source.label)}</span>
          ${categoryHTML}
        </div>
        <h3 class="card__title">${escapeHTML(post.title)}</h3>
        ${excerptHTML}
        <time class="card__date" datetime="${escapeHTML(post.dateStr)}">${dateText}</time>
      </div>
    </a>`.trim();
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Busca uma fonte — retorna [] em caso de falha ─── */
async function fetchSource(source) {
  const endpoint = `${source.url}?per_page=${CONFIG.POSTS_EACH}&_embed=1`;
  try {
    const raw  = await fetchWithTimeout(endpoint, CONFIG.FETCH_TIMEOUT);
    if (!Array.isArray(raw)) return [];
    return raw.map(p => normalizePost(p, source));
  } catch (err) {
    console.warn(`[Ágora] Falha em ${source.id}:`, err.message);
    return [];
  }
}

/* ─── Renderiza o feed no DOM ─── */
function renderFeed(posts) {
  const feedEl = document.getElementById('feed');
  if (!feedEl) return;

  if (!posts.length) {
    feedEl.hidden = true;
    const errEl = document.getElementById('feed-error');
    if (errEl) errEl.hidden = false;
    return;
  }

  feedEl.setAttribute('aria-busy', 'false');
  feedEl.innerHTML = posts.map(renderCard).join('');
}

/* ─── Inicialização principal ─── */
async function init() {
  /* Ano no footer */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const feedEl = document.getElementById('feed');
  if (!feedEl) return;

  /* 1. Verifica cache */
  const cached = Cache.get();
  if (cached) {
    renderFeed(cached);
    return;
  }

  /* 2. Busca todas as fontes em paralelo */
  const results = await Promise.all(CONFIG.SOURCES.map(fetchSource));

  /* 3. Une, ordena por data desc, limita */
  const all = results
    .flat()
    .sort((a, b) => b.date - a.date)
    .slice(0, CONFIG.POSTS_TOTAL);

  /* 4. Cache */
  if (all.length) Cache.set(all);

  /* 5. Renderiza */
  renderFeed(all);
}

/* ─── Entry point ─── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
