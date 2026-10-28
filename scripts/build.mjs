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
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8.3 5 2.7 5 5.8"/></svg>',
  growth: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M15 6h5v5"/></svg>',
  ticket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>',
};

// ---------- shared pieces ----------
const layout = ({ title, description, path, og, body, home = false }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
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
<link rel="preconnect" href="https://fonts.googleapis.com" />
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
      <a href="${config.cv}" download data-cv="footer">Baixar CV</a>
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
      <p class="lead">Eu gravo um vídeo curto mostrando o que está te custando venda. De graça, sem compromisso.</p>
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
    const images = s.works.filter((w) => w.image).map((w) => w.image);
    return `<div class="mock mock-browser">
          ${images[1] ? browserFrame([images[1]], s.mockupUrl, 'browser--back') : ''}
          ${browserFrame(s.print ? [s.print] : images, s.mockupUrl, 'browser--front')}
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
        <a class="link-u" href="/servicos/${s.slug}">Ver o serviço completo</a>
      </div>
    </div>
  </div>
</dialog>`;
};

const cardBody = (s, link) => `<div class="bcard-body">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.tagline)}</p>
          ${link}
        </div>`;
const cardLinkInner = 'Ver como faço <span class="arr" aria-hidden="true">→</span>';
// Cards with a case hold a button (opens the dialog) and a link, so the card
// itself can't be one big <a>: the link stretches over the card instead.
const serviceCard = (s) => s.case
  ? `<article class="bcard bcard--${s.bento || 'small'} card-base spot reveal" data-card="${s.slug}">
        <span class="price-chip">${esc(s.price)}</span>
        ${isVideo(s.case) ? videoCover(s.case) : carouselCover(s.case)}
        ${cardBody(s, `<a class="card-link card-stretch" href="/servicos/${s.slug}">${cardLinkInner}</a>`)}
      </article>`
  : `<a class="bcard bcard--${s.bento || 'small'} card-base spot reveal" href="/servicos/${s.slug}" data-card="${s.slug}">
        <span class="price-chip">${esc(s.price)}</span>
        ${mockup(s)}
        ${cardBody(s, `<span class="card-link">${cardLinkInner}</span>`)}
      </a>`;

// ---------- process illustrations ----------
const ills = [
  // 01 wireframe + magnifier + annotations
  `<svg viewBox="0 0 440 320" class="ill-anim" aria-hidden="true">
    <rect class="svg-block" x="70" y="20" width="300" height="280" rx="12"/>
    <rect class="svg-soft" x="90" y="40" width="70" height="8" rx="4"/><rect class="svg-soft" x="300" y="37" width="50" height="14" rx="7"/>
    <rect class="svg-soft" x="90" y="72" width="180" height="14" rx="4"/><rect class="svg-soft" x="90" y="92" width="130" height="14" rx="4"/>
    <rect class="svg-soft" x="90" y="118" width="200" height="6" rx="3"/><rect class="svg-soft" x="90" y="130" width="160" height="6" rx="3"/>
    <rect x="90" y="150" width="76" height="20" rx="10" fill="rgba(139,61,255,.35)"/>
    <rect class="svg-line" x="90" y="196" width="80" height="80" rx="8"/><rect class="svg-line" x="180" y="196" width="80" height="80" rx="8"/><rect class="svg-line" x="270" y="196" width="80" height="80" rx="8"/>
    <g class="note note-1"><path class="svg-acc-line" d="M160 79 L66 52"/><circle class="svg-acc" cx="160" cy="79" r="4"/><rect class="svg-block" x="4" y="34" width="62" height="34" rx="8"/><rect class="svg-soft" x="13" y="45" width="40" height="4" rx="2"/><rect class="svg-soft" x="13" y="54" width="28" height="4" rx="2"/></g>
    <g class="note note-2"><path class="svg-acc-line" d="M125 160 L66 182"/><circle class="svg-acc" cx="125" cy="160" r="4"/><rect class="svg-block" x="4" y="166" width="62" height="34" rx="8"/><rect class="svg-soft" x="13" y="177" width="40" height="4" rx="2"/><rect class="svg-soft" x="13" y="186" width="28" height="4" rx="2"/></g>
    <g class="note note-3"><path class="svg-acc-line" d="M310 236 L374 262"/><circle class="svg-acc" cx="310" cy="236" r="4"/><rect class="svg-block" x="374" y="246" width="62" height="34" rx="8"/><rect class="svg-soft" x="383" y="257" width="40" height="4" rx="2"/><rect class="svg-soft" x="383" y="266" width="28" height="4" rx="2"/></g>
    <g transform="translate(220 160)"><g class="mag"><circle r="24" fill="rgba(255,255,255,.05)" stroke="#F3F1ED" stroke-width="1.5"/><path d="M17 17 L34 34" stroke="#F3F1ED" stroke-width="3" stroke-linecap="round"/></g></g>
  </svg>`,
  // 02 flow that piles up before WhatsApp
  `<svg viewBox="0 0 440 320" class="ill-anim" aria-hidden="true">
    <path class="svg-line" d="M60 150 H390"/>
    ${[60, 170, 280, 390].map((x, i) => `<circle class="svg-block" cx="${x}" cy="150" r="22"/><text class="svg-text" x="${x}" y="200" text-anchor="middle">${['anúncio', 'página', 'WhatsApp', 'venda'][i]}</text>`).join('')}
    <rect class="svg-soft" x="50" y="140" width="20" height="14" rx="3"/>
    <rect class="svg-soft" x="160" y="140" width="20" height="20" rx="3"/>
    <path d="M272 146 a8 8 0 1 1 3 12 l-6 3 2-5 a8 8 0 0 1 1-10z" fill="none" stroke="#9B978F" stroke-width="1.5"/>
    <path d="M382 150 l5 5 10-11" fill="none" stroke="#9B978F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${[0, 1, 2, 3, 4].map((k) => `<circle class="svg-acc flow-dot" cx="60" cy="${150 + [-2, 3, -4, 1, 4][k]}" r="4" style="--k:${k};--stop:${[196, 204, 190, 200, 186][k]}px"/>`).join('')}
    <circle cx="280" cy="150" r="30" fill="none" stroke="#A970FF" stroke-width="1.5" class="node-alert"/>
    <g class="node-alert"><path d="M280 88 L292 108 H268 Z" fill="none" stroke="#A970FF" stroke-width="1.5" stroke-linejoin="round"/><path d="M280 96 v6" stroke="#A970FF" stroke-width="1.5" stroke-linecap="round"/><circle cx="280" cy="105" r="1" fill="#A970FF"/></g>
  </svg>`,
  // 03 blocks fly into a page grid + sparkle + timer
  `<svg viewBox="0 0 440 320" class="ill-anim" aria-hidden="true">
    <rect class="svg-line" x="70" y="20" width="300" height="270" rx="12" stroke-dasharray="4 5"/>
    ${[
      [90, 40, 260, 16, -120, -60, -12], [90, 70, 160, 74, -160, 40, 8], [262, 70, 88, 74, 140, -50, 14],
      [90, 160, 80, 64, -120, 140, -10], [180, 160, 80, 64, 20, 160, 12], [270, 160, 80, 64, 150, 120, -14], [90, 240, 96, 24, -100, 120, 6],
    ].map(([x, y, w, h, fx, fy, fr], k) => `<rect class="${k === 1 || k === 6 ? '' : 'svg-block '}fly" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${k === 1 ? 'fill="rgba(139,61,255,.35)" stroke="#A970FF"' : k === 6 ? 'fill="#8B3DFF"' : ''} style="--k:${k};--fx:${fx}px;--fy:${fy}px;--fr:${fr}deg"/>`).join('\n    ')}
    <g transform="translate(392 34)"><path class="svg-acc sparkle" d="M0 -14 C2 -4 4 -2 14 0 C4 2 2 4 0 14 C-2 4 -4 2 -14 0 C-4 -2 -2 -4 0 -14Z"/></g>
    <text class="svg-text-ink ill-timer" x="370" y="312" text-anchor="end">02:00</text>
  </svg>`,
  // 04 A/B test, B wins
  `<svg viewBox="0 0 440 320" class="ill-anim" aria-hidden="true">
    <path class="svg-acc-line trend" d="M10 290 C 90 270, 120 230, 180 210 S 300 120, 430 40" opacity=".45"/>
    <rect class="svg-block" x="60" y="40" width="140" height="150" rx="12"/><rect class="svg-block" x="240" y="40" width="140" height="150" rx="12"/>
    <text class="svg-text-ink" x="76" y="66">A</text><text class="svg-text-ink" x="256" y="66">B</text>
    <rect class="svg-soft" x="76" y="82" width="100" height="10" rx="3"/><rect class="svg-soft" x="76" y="100" width="70" height="6" rx="3"/><rect class="svg-soft" x="76" y="150" width="60" height="18" rx="9"/>
    <rect class="svg-soft" x="256" y="82" width="100" height="10" rx="3"/><rect class="svg-soft" x="256" y="100" width="70" height="6" rx="3"/><rect x="256" y="150" width="60" height="18" rx="9" fill="rgba(139,61,255,.45)"/>
    <path class="svg-line" d="M60 290 H380"/>
    <rect class="bar bar-a" x="95" y="232" width="70" height="58" rx="4" fill="rgba(255,255,255,.18)"/>
    <rect class="bar bar-b" x="275" y="200" width="70" height="90" rx="4" fill="#A970FF"/>
    <g class="win"><rect x="240" y="40" width="140" height="150" rx="12" fill="none" stroke="#A970FF" stroke-width="1.5"/><circle cx="366" cy="54" r="11" fill="#A970FF"/><path d="M361 54 l3.5 3.5 6.5-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
  </svg>`,
];

// ---------- home ----------
const logos = ['G4 Educação', "LET'S", 'Valid', 'K.Pitaliza', 'Agência Moonflag', 'Ituran'];
const career = [
  ["LET'S", 'Webflow Designer', '2025 a 2026'],
  ['K.Pitaliza Tecnologia', 'Coordenador de Marketing', '2025'],
  ['G4 Educação', 'Web Designer Pleno', '2024 a 2025'],
  ['Valid', 'UX Designer e Analista de Marketing & Growth', '2021 a 2023'],
  ['Agência Moonflag', 'Designer Gráfico', '2021'],
  ['Ituran Brasil', 'Assistente de Marketing', '2018 a 2019'],
];
const process = [
  ['01', 'Entendo antes de desenhar', 'Olho seu negócio, seus números e seu cliente antes de abrir qualquer tela.'],
  ['02', 'Acho o que trava', 'Descubro em que ponto o cliente desiste de comprar.'],
  ['03', 'Produzo rápido com IA', 'Uso IA para acelerar a produção, não para pensar por mim.'],
  ['04', 'Testo e ajusto', 'Coloco no ar, olho os dados e melhoro.'],
];

// Hero headline: two balanced lines, words rise in order after the photo floats in.
const heroWord = (w, i) => `<span class="w"><span class="wi" style="--i:${i}">${w}</span></span>`;
const heroWords = (words, start) => words.map((w, k) => heroWord(w, start + k)).join(' ');
const heroLine1 = `${heroWords(['Me', 'deixe', 'destravar', 'a'], 0)} ${heroWord('<span class="grad">criatividade</span>', 4)}`;
const heroLucrar = heroWord('<em class="lucrar hl">lucrar<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14 C 50 4, 120 4, 196 10"/></svg></em>', 11);
const heroLine2 = `${heroWords(['da', 'sua', 'empresa', 'e', 'fazer', 'você'], 5)} ${heroLucrar} ${heroWords(['com', 'isso.'], 12)}`;
const heroSub = 'Primeiro, eu entendo seu negócio e onde seu marketing pode ir além. Depois, penso e coloco em prática o que faz sentido agora: vídeos, conteúdos, campanhas ou um site que ajude você a vender mais.';

const home = () => layout({
  title: 'Diogo Abílio · Design e marketing que vendem',
  description: heroSub,
  path: '/',
  og: '/og/home.png',
  home: true,
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
    <h2 class="label" id="logos-title">Empresas por onde passei</h2>
  </div>
  <div class="marquee">
    <div class="marquee-track">
      <ul class="marquee-list">${logos.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <ul class="marquee-list" aria-hidden="true">${logos.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    </div>
  </div>
</section>

<section class="section" id="servicos" aria-labelledby="servicos-title">
  <div class="container">
    <div class="section-head">
      <span class="label">Serviços</span>
      ${h2('servicos-title', [['O que eu faço, e como fica ', false], ['na prática', true], ['.', false]])}
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
      ${h2('como-title', [['Primeiro eu entendo. Depois eu ', false], ['desenho', true], ['.', false]])}
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
  <div class="container bento-about" data-stagger>
    <div class="b-about card-base spot reveal">
      <span class="label">Sobre</span>
      ${h2('sobre-title', [['Prazer, Diogo.', false]])}
      <p class="lead">Sou publicitário e designer, com [X] anos entre agência, startup e escola de negócios. No G4 Educação, fiz páginas de produto e de lançamento. Hoje atendo empresas direto, sem intermediário.</p>
    </div>
    <div class="b-num b-n1 card-base spot reveal"><span class="b-icon">${icon.people}</span><span class="num-val" data-count="8">8</span><span class="num-cap">pessoas lideradas em campanha nacional</span></div>
    <div class="b-num b-n2 card-base spot reveal"><span class="b-icon">${icon.growth}</span><span class="num-val" data-count="50" data-suffix="K">50K</span><span class="num-cap">seguidores em menos de 1 mês</span></div>
    <div class="b-num b-n3 card-base spot reveal"><span class="b-icon">${icon.ticket}</span><span class="num-val" data-count="1" data-suffix="ª">1ª</span><span class="num-cap">turma do G4 Sprints lotada antes do lançamento</span></div>
    <div class="b-edu card-base spot reveal">
      <h3>Publicidade e Propaganda (FMU)</h3>
      <ul class="chips"><li>UX</li><li>Design System</li><li>Web Analytics</li></ul>
    </div>
    <div class="b-career card-base spot reveal">
      <h3 class="sr-only">Trajetória</h3>
      <div class="career-wrap">
        <span class="career-dot" aria-hidden="true"></span>
        <ul class="career">
        ${career.map(([c, r, y]) => `<li tabindex="0"><div class="career-row"><span class="co">${esc(c)}</span><span class="yrs">${y}</span></div><div class="career-role"><span>${esc(r)}</span></div></li>`).join('\n        ')}
        </ul>
      </div>
    </div>
    <a class="b-cv card-base spot reveal" href="${config.cv}" download data-cv="sobre">
      <span class="doc" aria-hidden="true"><span class="doc-sheet doc-sheet--back"></span><span class="doc-sheet doc-sheet--front"><i></i><i></i><i></i><i></i><i></i></span></span>
      <span class="link-u">Baixar CV completo ↓</span>
    </a>
  </div>
</section>

${finalCta('cta-final')}
${services.filter((s) => s.case).map(caseDialog).join('\n')}`,
});

// ---------- service page ----------
const work = (w) => `<article class="work reveal">
      <div class="work-head">
        <h3>${esc(w.title)}</h3>
        <span class="client">${esc(w.client)}</span>
        <p>${esc(w.summary)}</p>
      </div>
      <div class="work-body">
        <figure class="work-figure">
          ${w.image
            ? `<img src="${w.image.src}" srcset="${w.image.srcset}" sizes="(max-width: 860px) 92vw, 780px" width="${w.image.width}" height="${w.image.height}" alt="${esc(w.image.alt)}" loading="lazy" decoding="async" />`
            : pending()}
          ${w.notes.map((n, i) => `<span class="marker" style="left:${n.x}%;top:${n.y}%" aria-hidden="true">${i + 1}</span>`).join('')}
        </figure>
        <div class="why">
          <span class="label">Por que fiz assim</span>
          <ol>
            ${w.notes.map((n, i) => `<li><span class="n" aria-hidden="true">${i + 1}</span><span>${esc(n.text)}</span></li>`).join('\n            ')}
          </ol>
        </div>
      </div>
    </article>`;

const servicePage = (s) => layout({
  title: `${s.name} · Diogo Abílio`,
  description: s.tagline,
  path: `/servicos/${s.slug}`,
  og: ogFor(s.slug),
  body: `<section class="svc-top" aria-labelledby="svc-title">
  <div class="hero-bg" aria-hidden="true"><div class="hero-wash"></div></div>
  <div class="container">
    <a class="back" href="/#servicos">← Voltar</a>
    <h1 class="h1" id="svc-title">${esc(s.name)}</h1>
    <p class="lead">${esc(s.tagline)}</p>
    <span class="price">${esc(s.price)}</span>
    <a class="btn btn-primary magnetic" href="${waLink(s.whatsappMessage)}" target="_blank" rel="noopener" data-wa="servico-${s.slug}">Me mostra onde estou perdendo venda <span class="arr" aria-hidden="true">→</span></a>
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="trabalho-title">
  <div class="container">
    <div class="section-head">
      ${h2('trabalho-title', [['O trabalho', false]])}
    </div>
    ${s.works.map(work).join('\n    ')}
  </div>
</section>

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

${finalCta(`servico-${s.slug}-cta`, s.whatsappMessage)}`,
});

// ---------- write ----------
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });
cpSync(join(root, 'src/styles.css'), join(out, 'assets/styles.css'));
cpSync(join(root, 'src/main.js'), join(out, 'assets/main.js'));

writeFileSync(join(out, 'index.html'), home());
for (const s of services) {
  mkdirSync(join(out, 'servicos', s.slug), { recursive: true });
  writeFileSync(join(out, 'servicos', s.slug, 'index.html'), servicePage(s));
}
console.log(`Built home + ${services.length} service pages → dist/`);
