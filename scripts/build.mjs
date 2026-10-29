// Static site generator: renders the home and one page per file in content/servicos
// into dist/. No dependencies; run with `node scripts/build.mjs`.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const config = JSON.parse(readFileSync(join(root, 'src/config.json'), 'utf8'));

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const waLink = (message = config.whatsappDefaultMessage) =>
  `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
const abs = (path) => config.siteUrl + path;

const services = readdirSync(join(root, 'content/servicos'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'content/servicos', f), 'utf8')))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

// Services with a case or an ad gallery open in a dialog on the home; only the others get a page.
const hasPage = (s) => !s.case && !s.gallery;
const ogFor = (name) => (existsSync(join(root, 'public/og', `${name}.png`)) ? `/og/${name}.png` : '/og/home.png');

// Split a heading into word masks. Segments: [text, italic?]. Punctuation that
// follows without a space sticks to the previous word.
const splitWords = (segments, wrap) => {
  const words = [];
  let glue = false;
  for (const [text, italic] of segments) {
    const parts = text.split(/(\s+)/);
    parts.forEach((p) => {
      if (!p) return;
      if (/^\s+$/.test(p)) { glue = false; return; }
      const html = italic ? `<em class="serif">${esc(p)}</em>` : esc(p);
      if (glue && words.length) words[words.length - 1] += html;
      else words.push(html);
      glue = true;
    });
  }
  return words.map((w, i) => wrap(w, i)).join(' ');
};
const h2 = (id, segments, extra = '') =>
  `<h2 class="h2 split${extra}" id="${id}">${splitWords(segments, (w) => `<span class="w"><span class="wi">${w}</span></span>`)}</h2>`;

// ---------- icons ----------
const icon = {
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>',
};

// ---------- shared pieces ----------
const layout = ({ title, description, path, og, body, home = false, schema }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${abs(path)}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<meta name="theme-color" content="#0A0A0B" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:site_name" content="Diogo Abílio" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${abs(path)}" />
<meta property="og:image" content="${abs(og)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${abs(og)}" />
${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
` : ''}<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@1&display=swap" />
${home ? '<link rel="preload" as="image" href="/images/diogo-float-1200.webp" imagesrcset="/images/diogo-float-800.webp 800w, /images/diogo-float-1200.webp 1200w, /images/diogo-float-1774.webp 1774w" imagesizes="(max-width: 860px) 100vw, 1120px" fetchpriority="high" />\n' : ''}<link rel="stylesheet" href="/assets/styles.css" />
<script>document.documentElement.classList.add('js')</script>
<script defer src="/assets/vendor/motion-11.18.2.js"></script>
<script defer src="/assets/main.js"></script>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
${nav()}
<main id="conteudo">
${body}
</main>
${footer()}
<a class="wa-float" href="${waLink()}" target="_blank" rel="noopener" data-wa="flutuante">${icon.chat}Análise grátis</a>
</body>
</html>
`;

const nav = () => `<header class="nav">
  <div class="container nav-inner">
    <a class="nav-logo" href="/">Diogo Abílio</a>
    <nav class="nav-links" id="menu" aria-label="Principal">
      <span class="nav-pill" aria-hidden="true"></span>
      <a href="/#servicos" data-spy="servicos">Serviços</a>
      <a href="/#como-faco" data-spy="como-faco">Como faço</a>
      <a href="/#sobre" data-spy="sobre">Sobre</a>
    </nav>
    <a class="btn btn-primary btn-sm" href="${waLink()}" target="_blank" rel="noopener" data-wa="nav">Análise grátis</a>
    <button class="nav-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu"><span></span></button>
  </div>
</header>`;

const footer = () => `<footer class="footer">
  <div class="container footer-inner">
    <span>Diogo Abílio · São Paulo · 2026</span>
    <div class="footer-links">
      <a href="${config.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
      <a href="${config.instagram}" target="_blank" rel="noopener">Instagram</a>
      <a href="mailto:${config.email}">E-mail</a>
    </div>
  </div>
</footer>`;

const finalCta = (origin, message) => `<section class="section" id="cta-final" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-block reveal">
      ${h2('cta-title', [['Me mostra o que você tem ', false], ['hoje', true], ['.', false]])}
      <p class="lead">Eu gravo um vídeo curto mostrando onde você está perdendo vendas. De graça, sem compromisso.</p>
      <a class="btn btn-primary magnetic" href="${waLink(message)}" target="_blank" rel="noopener" data-wa="${origin}">Quero minha análise grátis <span class="arr" aria-hidden="true">→</span></a>
      <p class="cta-contacts">
        <a href="mailto:${config.email}">${config.email}</a>
        <span aria-hidden="true">·</span>
        <a href="${config.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
        <span aria-hidden="true">·</span>
        <a href="${config.instagram}" target="_blank" rel="noopener">Instagram</a>
      </p>
    </div>
  </div>
</section>`;

const pending = (text = 'Trabalho novo chegando') => `<div class="pending">${text}</div>`;

// ---------- service card mockups ----------
// A browser window showing one or more page images stacked like a long page.
const browserFrame = (imgs, url, cls) => `<div class="browser ${cls}" aria-hidden="true">
            <div class="browser-bar"><i></i><i></i><i></i><span class="browser-url">${esc(url)}</span></div>
            <div class="browser-view"><div class="browser-page">${imgs.map((img) => `<img src="${img.src}" srcset="${img.srcset}" sizes="(max-width: 860px) 90vw, 700px" alt="" width="${img.width}" height="${img.height}" loading="lazy" decoding="async" />`).join('')}</div></div>
          </div>`;

const fanSvgs = [
  '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#1A1A1D"/><circle cx="72" cy="28" r="18" fill="#A970FF"/><rect x="12" y="58" width="58" height="8" rx="2" fill="#F3F1ED"/><rect x="12" y="70" width="40" height="8" rx="2" fill="#F3F1ED"/><rect x="12" y="86" width="30" height="3" rx="1.5" fill="#9B978F"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#8B3DFF"/><rect x="12" y="14" width="22" height="3" rx="1.5" fill="#fff" opacity=".7"/><rect x="12" y="34" width="70" height="10" rx="2" fill="#fff"/><rect x="12" y="48" width="52" height="10" rx="2" fill="#fff"/><circle cx="80" cy="82" r="8" fill="none" stroke="#fff" stroke-width="2"/><path d="M77 82h6M80 79v6" stroke="#fff" stroke-width="2"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#131315"/><path d="M0 25h100M0 50h100M0 75h100M25 0v100M50 0v100M75 0v100" stroke="rgba(255,255,255,.08)"/><rect x="12" y="12" width="38" height="38" rx="4" fill="#A970FF"/><rect x="12" y="62" width="62" height="7" rx="2" fill="#F3F1ED"/><rect x="12" y="74" width="44" height="7" rx="2" fill="#F3F1ED"/></svg>',
];
const adSvg = '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#8B3DFF"/><circle cx="74" cy="30" r="16" fill="#0A0A0B" opacity=".35"/><rect x="10" y="56" width="64" height="9" rx="2" fill="#fff"/><rect x="10" y="69" width="44" height="9" rx="2" fill="#fff"/><rect x="10" y="85" width="34" height="8" rx="4" fill="#0A0A0B"/></svg>';
const plainPost = '<div class="post"><div class="post-head"><i></i><b></b></div><div class="post-media"></div></div>';
const adPost = `<div class="post post--ad"><div class="post-head"><i></i><b></b><small>Patrocinado</small></div>${adSvg}</div>`;
const frameSvgs = [
  '<svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice"><rect width="90" height="160" fill="#1A1A1D"/><circle cx="45" cy="62" r="22" fill="#26262A"/><rect x="18" y="112" width="54" height="7" rx="2" fill="#F3F1ED"/><rect x="26" y="123" width="38" height="7" rx="2" fill="#A970FF"/></svg>',
  '<svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice"><rect width="90" height="160" fill="#8B3DFF"/><rect x="14" y="40" width="62" height="12" rx="2" fill="#fff"/><rect x="14" y="56" width="44" height="12" rx="2" fill="#fff"/><rect x="14" y="128" width="62" height="5" rx="2.5" fill="#fff" opacity=".5"/></svg>',
  '<svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice"><rect width="90" height="160" fill="#131315"/><path d="M10 120 L32 96 L50 108 L80 70" fill="none" stroke="#A970FF" stroke-width="3" stroke-linecap="round"/><rect x="14" y="26" width="48" height="7" rx="2" fill="#F3F1ED"/><rect x="14" y="138" width="40" height="6" rx="2" fill="#9B978F"/></svg>',
];

const mockup = (s) => {
  if (s.mockup === 'browser') {
    // Front window: the full-page print when one exists, else every work image stacked.
    const shown = s.works.filter((w) => w.image);
    const images = shown.map((w) => w.image);
    const host = (w) => (w && w.url ? new URL(w.url).host : s.mockupUrl);
    return `<div class="mock mock-browser">
          ${images[1] ? browserFrame([images[1]], host(shown[1]), 'browser--back') : ''}
          ${browserFrame(s.print ? [s.print] : images, host(shown[0]), 'browser--front')}
        </div>`;
  }
  if (s.mockup === 'showcase') {
    // The main page full size in a browser, the other two on phones that keep scrolling.
    const main = s.works.find((w) => w.preview);
    return `<div class="mock mock-show" data-loop>
          ${browserFrame([main.preview.desktop], new URL(main.url).host, 'browser--front')}
          <div class="show-phones" aria-hidden="true">
            ${s.phones.map((ph, i) => `<div class="show-phone show-phone--${i + 1}"><div class="show-screen"><img src="${ph.src}" alt="" width="${ph.width}" height="${ph.height}" loading="lazy" decoding="async" /></div></div>`).join('\n            ')}
          </div>
        </div>`;
  }
  if (s.mockup === 'fan') {
    return `<div class="mock mock-fan" data-loop aria-hidden="true"><div class="fan">${fanSvgs.join('')}</div><span class="badge">exemplo</span></div>`;
  }
  if (s.mockup === 'phone') {
    const feed = [plainPost, adPost, plainPost, plainPost].join('');
    return `<div class="mock mock-phone" data-loop aria-hidden="true"><div class="phone"><div class="feed">${feed}${feed}</div></div><span class="badge">exemplo</span></div>`;
  }
  if (s.mockup === 'timeline') {
    const bars = Array.from({ length: 48 }, (_, k) => `<span style="--k:${(k * 7) % 13}"></span>`).join('');
    return `<div class="mock mock-timeline" data-loop aria-hidden="true">
          <div class="timeline-wrap">
            <div class="frames">${frameSvgs.map((f) => `<div class="frame">${f}</div>`).join('')}</div>
            <div class="track">${bars}</div>
            <i class="playhead"></i>
          </div>
          <span class="badge">exemplo</span>
        </div>`;
  }
  return `<div class="mock">${pending()}</div>`;
};

// ---------- portfolio cases: a cover on the service card, the piece + strategy in a dialog ----------
// Two kinds: "carousel" (slides) and "video" (vertical video split into scenes).
const pad2 = (n) => String(n).padStart(2, '0');
const slide = (c, n, w) => `${c.dir}/${pad2(n)}-${w}.webp`;
const clock = (t) => `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
const expandIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
const muteIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>';
const arrowIcon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const funnelStages = [['Topo', 'reconhecimento'], ['Meio', 'consideração'], ['Fundo', 'conversão']];
const isVideo = (c) => c.type === 'video';
// one line per slide or scene; scenes carry their start time
const caseSteps = (c) => (isVideo(c) ? c.scenes.map(([t, text]) => ({ t, text })) : c.arc.map((text) => ({ text })));
const stageBadge = (c) => `<span class="badge">${esc(funnelStages[c.stage][0].toLowerCase())} de funil</span>`;

// Carousel cover: slide 1 in front, slides 2–5 tucked behind; they open into a fan on hover.
const carouselCover = (c) => `<div class="mock mock-carousel">
          <button class="carousel-open" type="button" aria-haspopup="dialog" aria-controls="case-${c.id}" data-open-case>
            <span class="sr-only">Abrir o carrossel da ${esc(c.brand)} e a estratégia por trás dele</span>
            <span class="cfan" aria-hidden="true">
              ${[5, 4, 3, 2, 1].map((n) => `<img src="${slide(c, n, 560)}" alt="" width="560" height="700" loading="lazy" decoding="async" data-n="${n}" />`).join('')}
            </span>
            <span class="cfan-hint" aria-hidden="true">${expandIcon}Ver os ${c.count} slides</span>
          </button>
          ${stageBadge(c)}
        </div>`;

// Video cover: a plain vertical Reels screen with the muted highlight loop running.
const videoCover = (c) => `<div class="mock mock-video">
          <button class="carousel-open" type="button" aria-haspopup="dialog" aria-controls="case-${c.id}" data-open-case>
            <span class="sr-only">Assistir ao vídeo da ${esc(c.brand)} e ver a estratégia por trás dele</span>
            <span class="vphone" aria-hidden="true">
              <video class="vprev" muted loop playsinline preload="none" poster="${c.video.posterSmall}" data-src="${c.video.preview}"></video>
              <span class="vmute">${muteIcon}</span>
            </span>
            <span class="cfan-hint" aria-hidden="true">${playIcon}Assistir com som</span>
          </button>
          ${stageBadge(c)}
        </div>`;

// Funnel: three tapered layers, the active one lit; dots keep dropping into the top
// (new people arriving), a light sweeps across the active layer.
const funnelLayers = ['M6 34 H234 L210 84 H30 Z', 'M36 92 H204 L184 136 H56 Z', 'M62 144 H178 L162 184 H78 Z'];
const funnelSvg = (c) => {
  const label = funnelStages.map(([t, sub], i) => `${t}, ${sub}${i === c.stage ? ' (esta peça)' : ''}`).join('; ');
  return `<svg class="funnel" viewBox="0 0 240 190" role="img" aria-label="Funil de vendas: ${esc(label)}">
            <defs>
              <linearGradient id="fg-${c.id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#CF97FF"/><stop offset=".5" stop-color="#A970FF"/><stop offset="1" stop-color="#7B2FF7"/></linearGradient>
              <linearGradient id="fs-${c.id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
              <clipPath id="fc-${c.id}"><path d="${funnelLayers[c.stage]}"/></clipPath>
            </defs>
            ${c.stage === 0 ? `<g class="funnel-drops">${[[40, 0], [78, 1.1], [112, .5], [146, 1.6], [180, .3], [204, 1.3], [96, 2]].map(([x, d]) => `<circle cx="${x}" cy="10" r="2.6" style="--d:${d}s"/>`).join('')}</g>` : ''}
            ${funnelLayers.map((d, i) => `<path class="fl${i === c.stage ? ' is-on' : ''}" d="${d}" style="--k:${i}"${i === c.stage ? ` fill="url(#fg-${c.id})"` : ''}/>`).join('')}
            <g clip-path="url(#fc-${c.id})"><rect class="funnel-sweep" x="-80" y="${[30, 88, 140][c.stage]}" width="70" height="60" fill="url(#fs-${c.id})"/></g>
            ${funnelStages.map(([t, sub], i) => { const y = [58, 113, 163][i]; return `<g class="fl-text${i === c.stage ? ' is-on' : ''}" style="--k:${i}"><text x="120" y="${y}" text-anchor="middle" class="fl-t">${t}</text><text x="120" y="${y + 14}" text-anchor="middle" class="fl-s">${sub.toUpperCase()}</text></g>`; }).join('')}
          </svg>`;
};

const carouselViewer = (c, steps) => `<div class="case-track" tabindex="0" role="region" aria-label="Slides do carrossel">
        ${steps.map((st, i) => `<figure class="case-slide"><img src="${slide(c, i + 1, 1122)}" srcset="${slide(c, i + 1, 560)} 560w, ${slide(c, i + 1, 1122)} 1122w" sizes="(max-width: 860px) 90vw, 560px" width="1122" height="1402" alt="Slide ${i + 1} de ${steps.length}. ${esc(st.text)}" loading="lazy" decoding="async" /></figure>`).join('\n        ')}
      </div>`;
const videoViewer = (c) => `<div class="case-track case-track--video">
        <figure class="case-slide"><video class="case-video" controls playsinline preload="none" poster="${c.video.poster}" aria-label="Vídeo ${esc(c.brand)}: ${esc(c.title)}, com legendas na imagem">
          <source src="${c.video.src720}" type="video/mp4" media="(max-width: 860px)" />
          <source src="${c.video.src1080}" type="video/mp4" />
        </video></figure>
      </div>`;

const caseDialog = (s) => {
  const c = s.case;
  const video = isVideo(c);
  const steps = caseSteps(c);
  return `<dialog class="case case--${c.type}" id="case-${c.id}" aria-labelledby="case-${c.id}-title" data-lenis-prevent${video ? ` data-times="${steps.map((st) => st.t).join(',')}"` : ''}>
  <div class="case-shell">
    <form method="dialog" class="case-close-form"><button class="case-close" aria-label="Fechar">${arrowIcon('M18 6L6 18M6 6l12 12')}</button></form>
    <div class="case-viewer">
      ${video ? videoViewer(c) : `${carouselViewer(c, steps)}
      <div class="case-bar">
        <span class="case-count" aria-live="polite"><b>01</b> / ${pad2(steps.length)}</span>
        <div class="case-thumbs">
          ${steps.map((st, i) => `<button type="button" data-go="${i}" aria-label="Ir para o slide ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}><img src="${slide(c, i + 1, 240)}" alt="" width="240" height="300" loading="lazy" decoding="async" /></button>`).join('')}
        </div>
        <div class="case-arrows">
          <button type="button" class="case-prev" aria-label="Slide anterior" disabled>${arrowIcon('M15 18l-6-6 6-6')}</button>
          <button type="button" class="case-next" aria-label="Próximo slide">${arrowIcon('M9 18l6-6-6-6')}</button>
        </div>
      </div>`}
    </div>
    <div class="case-info">
      <span class="label ci" style="--i:0">${esc(c.kicker)}</span>
      <h2 class="case-title ci" style="--i:1" id="case-${c.id}-title">${esc(c.brand)}: ${esc(c.title)}</h2>
      <p class="case-lead ci" style="--i:2">${esc(c.lead)}</p>

      <div class="case-grid ci" style="--i:3">
        <dl class="case-facts">
          ${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n          ')}
        </dl>
        <div class="case-funnel">
          <span class="case-h">Etapa do funil</span>
          ${funnelSvg(c)}
        </div>
      </div>

      <section class="case-block ci" style="--i:4">
        <h3 class="case-h">A estratégia</h3>
        <ol class="case-strategy">
          ${c.strategy.map(([t, p], i) => `<li><span class="n">${pad2(i + 1)}</span><div><b>${esc(t)}</b><p>${esc(p)}</p></div></li>`).join('\n          ')}
        </ol>
      </section>

      <section class="case-block ci" style="--i:5">
        <h3 class="case-h">${video ? 'Cena a cena' : 'Slide a slide'}</h3>
        <ol class="case-arc">
          ${steps.map((st, i) => (video
            // scenes are read-only; the highlight follows playback
            ? `<li><span class="arc-row${i === 0 ? ' is-active' : ''}"><span class="n">${clock(st.t)}</span><span>${esc(st.text)}</span></span></li>`
            : `<li><button type="button" data-go="${i}"${i === 0 ? ' class="is-active"' : ''}><span class="n">${pad2(i + 1)}</span><span>${esc(st.text)}</span></button></li>`)).join('\n          ')}
        </ol>
      </section>

      <section class="case-block ci" style="--i:6">
        <h3 class="case-h">O que a gente mede</h3>
        <div class="case-tabs" role="tablist" aria-label="Momento das métricas">
          <span class="case-tabs-pill" aria-hidden="true"></span>
          ${c.metrics.map((m, i) => `<button type="button" role="tab" id="case-${c.id}-tab-${i}" aria-controls="case-${c.id}-panel-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(m.tab)}</button>`).join('')}
        </div>
        ${c.metrics.map((m, i) => `<div class="case-panel" role="tabpanel" id="case-${c.id}-panel-${i}" aria-labelledby="case-${c.id}-tab-${i}"${i ? ' hidden' : ''}>
          <ul class="case-metrics">
            ${m.items.map(([t, p]) => `<li><b>${esc(t)}</b><span>${esc(p)}</span></li>`).join('\n            ')}
          </ul>
          ${m.note ? `<p class="case-note">${esc(m.note)}</p>` : ''}
        </div>`).join('\n        ')}
      </section>

      <p class="case-why ci" style="--i:7">${esc(c.why)}</p>

      <div class="case-cta ci" style="--i:8">
        <a class="btn btn-primary" href="${waLink(c.waMessage)}" target="_blank" rel="noopener" data-wa="case-${c.id}">${esc(c.cta || 'Quero um carrossel assim')} <span class="arr" aria-hidden="true">→</span></a>
      </div>
    </div>
  </div>
</dialog>`;
};

const cardBody = (s, link) => `<div class="bcard-body">
          <span class="label">${esc(s.label)}</span>
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.tagline)}</p>
          ${link}
        </div>`;
const cardLinkInner = 'Ver como faço <span class="arr" aria-hidden="true">→</span>';
// Cards with a case or a gallery open its dialog: the cover and the stretched
// "Ver como faço" button are all openers. The others link to their page.
const dialogId = (s) => `case-${(s.case || s.gallery).id}`;
const serviceCard = (s) => s.case || s.gallery
  ? `<article class="bcard bcard--${s.bento || 'small'} card-base spot reveal" data-card="${s.slug}">
        ${s.gallery ? adsCover(s.gallery) : isVideo(s.case) ? videoCover(s.case) : carouselCover(s.case)}
        ${cardBody(s, `<button class="card-link card-stretch" type="button" aria-haspopup="dialog" aria-controls="${dialogId(s)}" data-open-case>${cardLinkInner}</button>`)}
      </article>`
  : `<a class="bcard bcard--${s.bento || 'small'} card-base spot reveal" href="/servicos/${s.slug}" data-card="${s.slug}">
        ${mockup(s)}
        ${cardBody(s, `<span class="card-link">${cardLinkInner}</span>`)}
      </a>`;

// ---------- process illustrations ----------
const ills = [
  // 01 a real landing page on the desk: a lens reads it and stops on the button,
  // gold marks circle what it found, the funnel chart beside it shows where it drops
  `<div class="sc sc-look">
    <div class="sc-paper sc-page">
      <div class="sc-torn"><img src="/images/processo/pagina-640.webp" alt="" width="640" height="800" loading="lazy" decoding="async" /></div>
      <svg class="sc-marks" viewBox="0 0 100 125" preserveAspectRatio="none">
        <path class="mk mk-under" pathLength="1" d="M5.5 40.2 C 12 39.2, 22 40.6, 33.5 39.4"/>
        <path class="mk mk-ring" pathLength="1" d="M27.4 46.6 C 26.8 51.6, 15 53.2, 6.2 51.6 C 0.6 50.4, 0.8 45.8, 6 44.6 C 13 43, 24.6 43.2, 27.8 45.8"/>
      </svg>
      <div class="sc-lens"><img src="/images/processo/pagina-1200.webp" alt="" width="1200" height="1500" loading="lazy" decoding="async" /></div>
    </div>
    <div class="sc-paper sc-chart">
      <svg viewBox="0 0 160 100">
        <path class="ch-grid" d="M12 20 H150 M12 46 H150 M12 72 H150"/>
        <path class="ch-area" d="M12 78 C 30 70, 46 60, 64 50 S 96 34, 108 32 L 122 74 L 150 78 V 90 H 12 Z"/>
        <path class="ch-line" pathLength="1" d="M12 78 C 30 70, 46 60, 64 50 S 96 34, 108 32 L 122 74 L 150 78"/>
        <circle class="ch-dot" cx="122" cy="74" r="3.2"/>
        <path class="mk mk-chart" pathLength="1" d="M131 70 C 133 61, 124 56, 116 59 C 108 62, 109 72, 116 76.5 C 122 80, 132 78, 131 70"/>
      </svg>
      <span class="sc-note">onde cai?</span>
    </div>
  </div>`,
  // 02 the buying journey pinned on the desk with real pieces; a signal runs the thread
  // and dies where it breaks, between the chat and the sale
  `<div class="sc sc-path">
    <figure class="sc-paper sc-p sc-p-ad"><div class="sc-torn"><img src="/images/anuncios-gm/04-480.webp" alt="" width="480" height="600" loading="lazy" decoding="async" /></div><figcaption>anúncio</figcaption></figure>
    <figure class="sc-paper sc-p sc-p-page"><div class="sc-torn gm-page">
      <div class="gm-nav"><img src="/images/logos/guilherme-machado.webp" alt="" width="83" height="40" loading="lazy" decoding="async" /><span class="gm-btn gm-btn-sm">Inscreva-se</span></div>
      <img class="gm-hero" src="/images/processo/gm-hero-480.webp" alt="" width="480" height="186" loading="lazy" decoding="async" />
      <div class="gm-kick">Líder de Alta Performance</div>
      <div class="gm-h">Você é o <em>melhor vendedor</em> da sua imobiliária?</div>
      <div class="gm-sub">Em 2 dias, o time vende sem depender de você no balcão.</div>
      <span class="gm-btn">Quero minha vaga</span>
      <div class="gm-meta"><span>14 e 15 de dezembro</span><span>São Paulo</span></div>
    </div><figcaption>página</figcaption></figure>
    <figure class="sc-paper sc-p sc-p-chat"><div class="chat">
      <div class="chat-top"><i></i><b>Cliente</b><small>online</small></div>
      <p class="in">Oi! Vi o anúncio</p><p class="in">Quanto custa?</p>
      <p class="typing"><i></i><i></i><i></i></p>
    </div><figcaption>WhatsApp</figcaption></figure>
    <figure class="sc-paper sc-p sc-p-sale"><div class="sc-torn receipt">
      <span class="rc-ok"></span><b>Pedido confirmado</b><small>Pagamento aprovado</small>
      <span class="rc-row"></span><span class="rc-row"></span><span class="rc-row short"></span>
    </div><figcaption>venda</figcaption></figure>
    <svg class="sc-thread" viewBox="0 0 400 300">
      <path class="th" d="M56 104 C 92 72, 120 66, 152 80 C 186 94, 214 92, 248 110 C 258 115, 268 119, 278 123"/>
      <path class="th" d="M300 126 C 318 130, 332 138, 348 146"/>
      <path class="th" d="M278 123 c 4 3, 5 7, 2 10 M300 126 c -5 -1, -7 4, -4 7"/>
      <path class="th-pulse" pathLength="1" d="M56 104 C 92 72, 120 66, 152 80 C 186 94, 214 92, 248 110 C 258 115, 268 119, 278 123"/>
      ${[[56, 104], [152, 80], [248, 110], [348, 146]].map(([x, y]) => `<circle class="pin" cx="${x}" cy="${y}" r="3.4"/>`).join('')}
      <circle class="th-spark" cx="278" cy="123" r="5"/>
      <path class="mk mk-break" pathLength="1" d="M307 113 C 312 130, 296 143, 282 141 C 266 139, 266 117, 280 111 C 292 106, 304 109, 309 117"/>
    </svg>
    <span class="sc-note sc-note-break">trava aqui</span>
  </div>`,
  // 03 a real carousel slide assembles from its layers, then the rest of the set fans out
  `<div class="sc sc-build">
    <div class="sc-deck">
      <div class="sc-paper sc-slide sc-slide-3"><div class="sc-torn"><img src="/images/carrossel-vaie/03-560.webp" alt="" width="560" height="700" loading="lazy" decoding="async" /></div></div>
      <div class="sc-paper sc-slide sc-slide-2"><div class="sc-torn"><img src="/images/carrossel-vaie/02-560.webp" alt="" width="560" height="700" loading="lazy" decoding="async" /></div></div>
      <div class="sc-slide sc-slide-1">
        <span class="ly ly-base"></span>
        <img class="ly ly-photo" src="/images/carrossel-vaie/01-560.webp" alt="" width="560" height="700" loading="lazy" decoding="async" />
        <img class="ly ly-title" src="/images/carrossel-vaie/01-560.webp" alt="" width="560" height="700" loading="lazy" decoding="async" />
        <svg class="sc-guides" viewBox="0 0 100 125" preserveAspectRatio="none"><path d="M-14 0 H114 M-14 125 H114 M0 -12 V137 M100 -12 V137 M-14 50 H114"/></svg>
        <svg class="sc-check" viewBox="0 0 40 40"><path class="mk" pathLength="1" d="M9 21 L 17 29 L 32 11"/></svg>
      </div>
    </div>
  </div>`,
  // 04 two real versions of the same campaign side by side: the headline differs,
  // the chosen one comes forward (no numbers: this shows the comparison, not a result)
  `<div class="sc sc-ab">
    <div class="sc-paper sc-v sc-v-a"><div class="sc-torn"><img src="/images/anuncios-gm/01-480.webp" alt="" width="480" height="600" loading="lazy" decoding="async" /></div>
      <svg class="sc-marks" viewBox="0 0 100 125" preserveAspectRatio="none"><path class="mk mk-a" pathLength="1" d="M96 13 C 99 22, 80 32, 60 31 C 40 30, 33 21, 38 13 C 43 6, 70 4, 92 8 C 97 9, 99 12, 97 16"/></svg>
      <span class="sc-tag">A</span></div>
    <div class="sc-paper sc-v sc-v-b"><div class="sc-torn"><img src="/images/anuncios-gm/02-480.webp" alt="" width="480" height="600" loading="lazy" decoding="async" /></div>
      <svg class="sc-marks" viewBox="0 0 100 125" preserveAspectRatio="none"><path class="mk mk-b" pathLength="1" d="M60 34 C 64 52, 46 66, 22 65 C 2 64, -2 48, 4 38 C 10 29, 40 26, 58 30 C 62 31, 63 34, 61 38"/></svg>
      <span class="sc-tag">B</span>
      <svg class="sc-check" viewBox="0 0 40 40"><path class="mk" pathLength="1" d="M9 21 L 17 29 L 32 11"/></svg></div>
    <svg class="sc-thread sc-arrow" viewBox="0 0 400 300"><path class="mk mk-arrow" pathLength="1" d="M142 60 C 170 22, 226 22, 248 78 M239 72 L 248 78 L 253 68"/></svg>
    <span class="sc-note sc-note-ab">outro ângulo</span>
  </div>`,
];

// ---------- structured data (schema.org) ----------
// Tells search engines who the person behind the site is, so name searches
// ("Diogo Abilio designer estratégico") resolve to this page.
const personId = abs('/#diogo');
const person = () => ({
  '@type': 'Person',
  '@id': personId,
  name: 'Diogo Abílio',
  alternateName: ['Diogo Abilio', 'Diogo Abílio Designer'],
  jobTitle: 'Designer estratégico',
  description: 'Designer estratégico e estrategista de marketing em São Paulo. Analisa o funil, encontra onde o cliente desiste e cria páginas, conteúdo, vídeo e anúncios que vendem.',
  url: abs('/'),
  image: abs('/images/diogo-cutout-760.webp'),
  email: `mailto:${config.email}`,
  address: { '@type': 'PostalAddress', addressLocality: 'São Paulo', addressRegion: 'SP', addressCountry: 'BR' },
  knowsAbout: ['Design estratégico', 'Branding', 'Estratégia de marketing', 'Funil de vendas', 'Landing pages', 'Webflow', 'UX design', 'Criativos para anúncios', 'Conteúdo para redes sociais', 'Vídeo'],
  knowsLanguage: ['pt-BR', 'en'],
  sameAs: [config.linkedin, config.instagram],
});
const homeSchema = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    person(),
    { '@type': 'WebSite', '@id': abs('/#site'), url: abs('/'), name: 'Diogo Abílio', inLanguage: 'pt-BR', publisher: { '@id': personId } },
    { '@type': 'ProfilePage', '@id': abs('/#page'), url: abs('/'), name: 'Diogo Abílio · Designer estratégico', inLanguage: 'pt-BR', isPartOf: { '@id': abs('/#site') }, mainEntity: { '@id': personId } },
  ],
});
const serviceSchema = (s) => ({
  '@context': 'https://schema.org',
  '@graph': [
    person(),
    { '@type': 'Service', name: s.seoTitle, description: s.tagline, url: abs(`/servicos/${s.slug}`), areaServed: 'BR', provider: { '@id': personId } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: s.seoTitle, item: abs(`/servicos/${s.slug}`) },
    ] },
  ],
});

// ---------- home ----------
// Light silhouettes exported at 3x (Moonflag a bit less); w x h is the display size, tuned per mark so they read the same size.
const logos = [
  { name: 'G4 Educação', file: 'g4', w: 86, h: 34, key: true },
  { name: 'Guilherme Machado', file: 'guilherme-machado', w: 83, h: 40 },
  { name: "LET'S", file: 'lets', w: 75, h: 24 },
  { name: 'Valid', file: 'valid', w: 78, h: 24 },
  { name: 'Agência Moonflag', file: 'moonflag', w: 117, h: 21 },
  { name: 'Ituran', file: 'ituran', w: 78, h: 36 },
];
const logoItem = (l) => `<li${l.key ? ' class="is-key"' : ''}><img src="/images/logos/${l.file}.webp" alt="${esc(l.name)}" width="${l.w}" height="${l.h}" style="--h:${l.h}px" loading="lazy" decoding="async" /></li>`;
const process = [
  ['01', 'Olho os números', 'Antes de criar qualquer material, entendo seu negócio, seus números e quem compra de você.'],
  ['02', 'Investigo e descubro os gargalos', 'Encontro o ponto em que o cliente desiste de comprar.'],
  ['03', 'Entrego rápido', 'A IA cuida da parte repetitiva, então você recebe em dias o que levaria semanas. A estratégia continua comigo.'],
  ['04', 'Testo e ajusto', 'Coloco no ar, olho os dados e melhoro.'],
];

// Hero headline: two balanced lines, words rise in order after the photo floats in.
const heroWord = (w, i) => `<span class="w"><span class="wi" style="--i:${i}">${w}</span></span>`;
const heroWords = (words, start) => words.map((w, k) => heroWord(w, start + k)).join(' ');
const heroLine1 = `${heroWords(['Deixe-me', 'destravar', 'a'], 0)} ${heroWord('<span class="grad">criatividade</span>', 4)}`;
const heroLucrar = heroWord('<em class="lucrar hl">lucrar<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14 C 50 4, 120 4, 196 10"/></svg></em>', 11);
const heroLine2 = `${heroWords(['da', 'sua', 'empresa', 'e', 'fazer', 'você'], 5)} ${heroLucrar} ${heroWords(['com', 'isso.'], 12)}`;
const heroSub = 'Primeiro, eu entendo seu negócio e onde seu marketing pode ir além. Depois, penso e coloco em prática o que faz sentido agora: vídeos, conteúdos, campanhas ou um site que ajude você a vender mais.';

const home = () => layout({
  title: 'Diogo Abílio · Designer estratégico | Design e marketing que vendem',
  description: 'Designer estratégico em São Paulo: acho onde o cliente desiste no seu funil e resolvo com páginas, conteúdo, vídeo e anúncios.',
  path: '/',
  og: '/og/home.png',
  home: true,
  schema: homeSchema(),
  body: `<section class="hero" id="hero" aria-labelledby="hero-title">
  <div class="hero-bg" aria-hidden="true" data-loop><div class="hero-texture"></div><div class="hero-wash"></div></div>
  <div class="float-stage" data-loop>
    <div class="float-glow" aria-hidden="true"></div>
    <div class="float-parallax">
      <div class="float-bob">
        <img class="float-img" src="/images/diogo-float-1200.webp" srcset="/images/diogo-float-800.webp 800w, /images/diogo-float-1200.webp 1200w, /images/diogo-float-1774.webp 1774w" sizes="(max-width: 860px) 100vw, 1120px" width="1774" height="887" alt="Diogo Abílio flutuando, com luz saindo da cabeça" fetchpriority="high" decoding="async" />
      </div>
    </div>
  </div>
  <div class="container hero-text">
    <h1 class="h1 hero-title" id="hero-title"><span class="h1-line">${heroLine1}</span> <span class="h1-line">${heroLine2}</span></h1>
    <p class="hero-sub fade-in" style="--delay:1300ms">${heroSub}</p>
    <div class="hero-actions fade-in" style="--delay:1500ms">
      <div class="cta-col">
        <a class="btn btn-primary magnetic" href="${waLink()}" target="_blank" rel="noopener" data-wa="hero">Quero minha análise gratuita <span class="arr" aria-hidden="true">→</span></a>
        <p class="micro">Em vídeo e sem compromisso.</p>
      </div>
      <a class="link-u" href="#servicos">Ver meus trabalhos ↓</a>
    </div>
  </div>
</section>

<section class="logos" aria-labelledby="logos-title">
  <div class="container">
    <h2 class="label" id="logos-title">Empresas e marcas com quem trabalhei</h2>
  </div>
  <div class="marquee">
    <div class="marquee-track">
      <ul class="marquee-list">${logos.map(logoItem).join('')}</ul>
      <ul class="marquee-list" aria-hidden="true">${logos.map(logoItem).join('')}</ul>
    </div>
  </div>
</section>

<section class="section" id="servicos" aria-labelledby="servicos-title">
  <div class="container">
    <div class="section-head">
      <span class="label">Serviços</span>
      ${h2('servicos-title', [['Da primeira impressão à venda. ', false], ['Onde eu entro', true], ['.', false]])}
    </div>
    <div class="bento-services" data-stagger>
      ${services.map(serviceCard).join('\n      ')}
    </div>
  </div>
</section>

<section class="section" id="como-faco" aria-labelledby="como-title">
  <div class="container">
    <div class="section-head">
      <span class="label">Como eu trabalho</span>
      ${h2('como-title', [['Primeiro eu entendo. Depois eu ', false], ['implemento', true], ['.', false]])}
    </div>
    <div class="process">
      <div class="steps-list">
        <span class="steps-progress" aria-hidden="true"><span></span></span>
        <ol class="steps-ol">
        ${process.map(([n, t, p], i) => `<li class="pstep${i === 0 ? ' is-active' : ''}" data-step="${i}">
          <div class="step-ill-m card-base" data-loop aria-hidden="true">${ills[i]}</div>
          <span class="step-num">${n}</span><h3>${t}</h3><p>${p}</p>
        </li>`).join('\n        ')}
        </ol>
      </div>
      <div class="process-panel card-base" aria-hidden="true" data-loop>
        <div class="ill-stack">
          ${ills.map((svg, i) => `<div class="ill${i === 0 ? ' is-active' : ''}" data-ill="${i}">${svg}</div>`).join('\n          ')}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" id="sobre" aria-labelledby="sobre-title">
  <div class="container about-hero">
    <div class="about-visual reveal">
      <img class="about-photo" src="/images/sobre/diogo-cadeira-520.webp" srcset="/images/sobre/diogo-cadeira-520.webp 520w, /images/sobre/diogo-cadeira-900.webp 900w" sizes="(max-width: 860px) 90vw, 580px" width="520" height="770" alt="Diogo Abílio sentado numa cadeira de diretor, com uma caneca roxa na mão" loading="lazy" decoding="async" />
    </div>
    <div class="about-copy">
      <span class="label">Sobre mim</span>
      ${h2('sobre-title', [['Prazer, ', false], ['Diogo.', true]])}
      <div class="about-text">
        <p>Sou publicitário e designer. Nos meus <b class="hl-acc">+12 anos de experiência</b>, fui conectando áreas que hoje fazem parte do mesmo trabalho: comunicação, marketing e experiência digital. Gosto de criar, investigar e entender por que uma ideia merece sair do papel.</p>
        <p>Passei pela <b>Agência Moonflag</b>, pela <b>Valid</b> e pelo <b>G4 Educação</b>, trabalhando com design gráfico, marketing, experiência do usuário e páginas digitais. Essa trajetória ampliou meu repertório para olhar um projeto por diferentes perspectivas, da mensagem que chama atenção à experiência de quem chega para conhecer uma empresa.</p>
        <p>Hoje, trago esse olhar para os projetos em que me envolvo. Gosto de conversar, fazer perguntas e participar das escolhas, com espaço para propor e responsabilidade para colocar em prática. Posso entrar em uma entrega específica ou acompanhar um desafio mais amplo, sempre buscando entender onde meu trabalho pode contribuir.</p>
      </div>
      <p class="about-sign">Diogo Abílio <span aria-hidden="true">·</span> São Paulo</p>
    </div>
  </div>
</section>

${finalCta('cta-final')}
${services.filter((s) => s.case).map(caseDialog).join('\n')}
${services.filter((s) => s.gallery).map(adsDialog).join('\n')}`,
});

// ---------- service page ----------
const extLink = (href, text) => `<a class="btn btn-outline btn-sm" href="${href}" target="_blank" rel="noopener">${text} <span aria-hidden="true">↗</span><span class="sr-only"> (abre em nova aba)</span></a>`;
// Full-page preview: the whole page scrolls inside a browser frame (desktop) or a phone (mobile).
const pagePreview = (w, id) => `<div class="lp-preview" data-preview>
        <div class="lp-bar">
          <div class="lp-tabs" role="tablist" aria-label="Versão da página">
            <span class="lp-tabs-pill" aria-hidden="true"></span>
            <button type="button" role="tab" id="${id}-tab-d" aria-controls="${id}-d" aria-selected="true">Desktop</button>
            <button type="button" role="tab" id="${id}-tab-m" aria-controls="${id}-m" aria-selected="false" tabindex="-1">Celular</button>
          </div>
          <span class="lp-hint" aria-hidden="true">Role dentro da tela para ver a página inteira</span>
        </div>
        <div class="lp-panel" role="tabpanel" id="${id}-d" aria-labelledby="${id}-tab-d">
          <div class="lp-browser">
            <div class="browser-bar"><i></i><i></i><i></i><span class="browser-url">${esc(new URL(w.url).host)}</span></div>
            <div class="lp-scroll" tabindex="0" aria-label="Página inteira no desktop, role para ver" data-lenis-prevent>
              <img src="${w.preview.desktop.src}" srcset="${w.preview.desktop.srcset}" sizes="(max-width: 1240px) 92vw, 1120px" width="${w.preview.desktop.width}" height="${w.preview.desktop.height}" alt="Página inteira da ${esc(w.title)} no desktop" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
        <div class="lp-panel" role="tabpanel" id="${id}-m" aria-labelledby="${id}-tab-m" hidden>
          <div class="lp-phone">
            <div class="lp-scroll" tabindex="0" aria-label="Página inteira no celular, role para ver" data-lenis-prevent>
              <img src="${w.preview.mobile.src}" width="${w.preview.mobile.width}" height="${w.preview.mobile.height}" alt="Página inteira da ${esc(w.title)} no celular" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
      </div>`;

const work = (w, i) => `<article class="work reveal">
      <div class="work-head">
        <h3>${esc(w.title)}</h3>
        <span class="client">${esc(w.client)}</span>
        <p>${esc(w.summary)}</p>
        ${w.url || w.behance ? `<div class="work-actions">${w.url ? extLink(w.url, 'Ver o site no ar') : ''}${w.behance ? extLink(w.behance, 'Ver o case completo no Behance') : ''}</div>` : ''}
      </div>
      ${w.preview
        ? pagePreview(w, `pv-${i}`)
        : `<figure class="work-figure"><img src="${w.image.src}" srcset="${w.image.srcset}" sizes="(max-width: 1240px) 92vw, 1120px" width="${w.image.width}" height="${w.image.height}" alt="${esc(w.image.alt)}" loading="lazy" decoding="async" /></figure>`}
    </article>`;

// Ad gallery: the pieces fanned out like a hand of cards on the home card; any card
// opens the dialog on that piece, and the info panel follows the piece on screen.
const adImg = (g, i, w) => `${g.dir}/${pad2(i + 1)}-${w}.webp`;
const adSize = (it) => (it.ratio === '916' ? [1080, 1920] : [1080, 1350]);
const adsDeck = (g) => {
  const n = g.items.length;
  return `<div class="ads-deck">
        ${g.items.map((it, i) => { const [w, h] = adSize(it); return `<button class="ads-card" type="button" style="--k:${(i - (n - 1) / 2).toFixed(1)}" aria-haspopup="dialog" aria-controls="case-${g.id}" data-open-case data-start="${i}">
          <img src="${adImg(g, i, 480)}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async" />
          <span class="sr-only">Abrir o anúncio ${i + 1}: ${esc(it.angle)}</span>
        </button>`; }).join('\n        ')}
      </div>`;
};
// Home card cover: the deck alone, no client name (that lives in the dialog).
const adsCover = (g) => `<div class="mock mock-ads">
          ${adsDeck(g)}
          <span class="cfan-hint" aria-hidden="true">${expandIcon}Ver os ${g.items.length} anúncios</span>
        </div>`;
const adsDialog = (s) => {
  const g = s.gallery;
  const n = g.items.length;
  return `<dialog class="case case--ads" id="case-${g.id}" aria-labelledby="case-${g.id}-title" data-lenis-prevent>
  <div class="case-shell">
    <form method="dialog" class="case-close-form"><button class="case-close" aria-label="Fechar">${arrowIcon('M18 6L6 18M6 6l12 12')}</button></form>
    <div class="case-viewer">
      <div class="case-track" tabindex="0" role="region" aria-label="Anúncios">
        ${g.items.map((it, i) => { const [w, h] = adSize(it); return `<figure class="case-slide"><img class="r${it.ratio}" src="${adImg(g, i, 1080)}" srcset="${adImg(g, i, 480)} 480w, ${adImg(g, i, 1080)} 1080w" sizes="(max-width: 860px) 90vw, 560px" width="${w}" height="${h}" alt="Anúncio ${i + 1} de ${n}, ${esc(it.campaign)}: ${esc(it.angle)}" loading="lazy" decoding="async" /></figure>`; }).join('\n        ')}
      </div>
      <div class="case-bar">
        <span class="case-count" aria-live="polite"><b>01</b> / ${pad2(n)}</span>
        <div class="case-thumbs">
          ${g.items.map((it, i) => `<button type="button" data-go="${i}" aria-label="Ver anúncio ${i + 1}"${i ? '' : ' aria-current="true"'}><img src="${adImg(g, i, 480)}" alt="" width="36" height="45" loading="lazy" /></button>`).join('')}
        </div>
        <div class="case-arrows">
          <button type="button" class="case-prev" aria-label="Anúncio anterior" disabled>${arrowIcon('M15 18l-6-6 6-6')}</button>
          <button type="button" class="case-next" aria-label="Próximo anúncio">${arrowIcon('M9 18l6-6-6-6')}</button>
        </div>
      </div>
    </div>
    <div class="case-info">
      <span class="label ci" style="--i:0">${esc(g.kicker)}</span>
      <h2 class="case-title ci" style="--i:1" id="case-${g.id}-title">${esc(g.brand)}: ${esc(g.title)}</h2>
      <p class="case-lead ci" style="--i:2">${esc(g.lead)}</p>
      ${g.items.map((it, i) => `<section class="ad-panel ci" style="--i:3" data-panel="${i}"${i ? ' hidden' : ''}>
        <div class="ad-head"><span class="ad-num">${pad2(i + 1)} / ${pad2(n)}</span><span class="ad-camp">${esc(it.campaign)}</span></div>
        <h3 class="ad-angle">${esc(it.angle)}</h3>
        <p class="ad-text">${esc(it.text)}</p>
        <div class="case-grid">
          <dl class="case-facts">
            <div><dt>Cliente</dt><dd>${esc(g.facts[0][1])}</dd></div>
            <div><dt>Para quem fala</dt><dd>${esc(g.facts[1][1])}</dd></div>
            <div><dt>Produto</dt><dd>${esc(it.product)}</dd></div>
            <div><dt>Formato</dt><dd>${esc(it.format)}</dd></div>
          </dl>
          <div class="case-funnel">
            <span class="case-h">Etapa do funil</span>
            ${funnelSvg({ id: `${g.id}-${i}`, stage: it.stage })}
          </div>
        </div>
      </section>`).join('\n      ')}
      <div class="case-cta ci" style="--i:5">
        <a class="btn btn-primary" href="${waLink(g.waMessage)}" target="_blank" rel="noopener" data-wa="case-${g.id}">Quero criativos assim <span class="arr" aria-hidden="true">→</span></a>
      </div>
    </div>
  </div>
</dialog>`;
};

const servicePage = (s) => layout({
  title: `${s.seoTitle} · Diogo Abílio`,
  description: s.tagline,
  path: `/servicos/${s.slug}`,
  og: ogFor(s.slug),
  schema: serviceSchema(s),
  body: `<section class="svc-top" aria-labelledby="svc-title">
  <div class="hero-bg" aria-hidden="true"><div class="hero-wash"></div></div>
  <div class="container">
    <a class="back" href="/#servicos">← Voltar</a>
    <span class="label">${esc(s.label)}</span>
    <h1 class="h1" id="svc-title">${esc(s.name)}</h1>
    <p class="lead">${esc(s.tagline)}</p>
    <div class="svc-actions">
      <a class="btn btn-primary magnetic" href="${waLink(s.quoteMessage)}" target="_blank" rel="noopener" data-wa="servico-${s.slug}">${esc(s.cta)} <span class="arr" aria-hidden="true">→</span></a>
      <a class="link-u" href="${waLink(s.whatsappMessage)}" target="_blank" rel="noopener" data-wa="servico-${s.slug}-analise">Prefiro a análise grátis primeiro</a>
    </div>
  </div>
</section>

${s.works.length ? `<section class="section" style="padding-top:0" aria-labelledby="trabalho-title">
  <div class="container">
    <div class="section-head">
      ${h2('trabalho-title', [[s.works.length > 1 ? 'Os trabalhos' : 'O trabalho', false]])}
    </div>
    ${s.works.map(work).join('\n    ')}
  </div>
</section>
` : ''}
<section class="section" style="padding-top:0" aria-labelledby="recebe-title">
  <div class="container">
    <div class="section-head">
      ${h2('recebe-title', [['O que você recebe', false]])}
    </div>
    <ul class="receive" data-stagger>
      ${s.deliverables.map((d) => `<li class="reveal">${esc(d)}</li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="funciona-title">
  <div class="container">
    <div class="section-head">
      ${h2('funciona-title', [['Como funciona', false]])}
    </div>
    <ol class="how" data-stagger>
      ${s.steps.map((st, i) => `<li class="step reveal"><span class="step-num">0${i + 1}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></li>`).join('\n      ')}
    </ol>
    <p class="deadline">Prazo: ${esc(s.deadline)}</p>
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="faq-title">
  <div class="container">
    <div class="section-head">
      ${h2('faq-title', [['Perguntas rápidas', false]])}
    </div>
    <div class="faq reveal">
      ${s.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n      ')}
    </div>
  </div>
</section>

${finalCta(`servico-${s.slug}-cta`, s.whatsappMessage)}
`,
});

// ---------- write ----------
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });
cpSync(join(root, 'src/styles.css'), join(out, 'assets/styles.css'));
cpSync(join(root, 'src/main.js'), join(out, 'assets/main.js'));

writeFileSync(join(out, 'index.html'), home());
for (const s of services.filter(hasPage)) {
  mkdirSync(join(out, 'servicos', s.slug), { recursive: true });
  writeFileSync(join(out, 'servicos', s.slug, 'index.html'), servicePage(s));
}
// crawl files: everything is indexable; the sitemap lists the home and each service page
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', ...services.filter(hasPage).map((s) => `/servicos/${s.slug}`)];
writeFileSync(join(out, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${abs('/sitemap.xml')}
`);
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${abs(u)}</loc><lastmod>${today}</lastmod><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`);
console.log(`Built home + ${services.filter(hasPage).length} service pages → dist/`);
