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

// English copy of the cards and dialogs, used only by the English résumé (/curriculo/en).
// content/servicos-en/<slug>.json holds just the translated fields; they are laid over
// the Portuguese file (objects merge, arrays of objects merge by index, the rest replaces).
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const overlay = (base, over) => {
  if (Array.isArray(base) && Array.isArray(over)) {
    return base.length && base.every(isObj) && over.every(isObj) ? base.map((b, i) => (over[i] ? overlay(b, over[i]) : b)) : over;
  }
  if (isObj(base) && isObj(over)) {
    const o = { ...base };
    for (const k of Object.keys(over)) o[k] = k in base ? overlay(base[k], over[k]) : over[k];
    return o;
  }
  return over;
};
const servicesEn = services.map((s) => {
  const f = join(root, 'content/servicos-en', `${s.slug}.json`);
  return existsSync(f) ? overlay(s, JSON.parse(readFileSync(f, 'utf8'))) : s;
});

// ---------- interface strings ----------
// The site is Portuguese; only the résumé also renders in English. Templates read the
// current language through T(); cvPage() switches LANG while it renders.
let LANG = 'pt';
const UI = {
  pt: {
    authorial: 'Projeto autoral',
    example: 'exemplo',
    stages: [['Topo', 'reconhecimento'], ['Meio', 'consideração'], ['Fundo', 'conversão']],
    stageBadge: (i) => `${['topo', 'meio', 'fundo'][i]} de funil`,
    thisPiece: ' (esta peça)',
    funnelAria: 'Funil de vendas',
    openCarousel: (b) => `Abrir o carrossel da ${b} e a estratégia por trás dele`,
    seeSlides: (n) => `Ver os ${n} slides`,
    openVideo: (b) => `Assistir ao vídeo da ${b} e ver a estratégia por trás dele`,
    watchSound: 'Assistir com som',
    slidesAria: 'Slides do carrossel',
    slideAlt: (i, n) => `Slide ${i} de ${n}.`,
    videoAria: (b, t) => `Vídeo ${b}: ${t}, com legendas na imagem`,
    close: 'Fechar',
    goSlide: (i) => `Ir para o slide ${i}`,
    prevSlide: 'Slide anterior',
    nextSlide: 'Próximo slide',
    funnelStage: 'Etapa do funil',
    strategy: 'A estratégia',
    sceneBy: 'Cena a cena',
    slideBy: 'Slide a slide',
    howMeasure: 'Como eu mediria',
    whatMeasure: 'O que a gente mede',
    metricsAria: 'Momento das métricas',
    caseCta: 'Quero um carrossel assim',
    cardLink: 'Ver como faço',
    openAd: (i, a) => `Abrir o anúncio ${i}: ${a}`,
    seeAds: (n) => `Ver os ${n} anúncios`,
    adsAria: 'Anúncios',
    adAlt: (i, n, c, a) => `Anúncio ${i} de ${n}, ${c}: ${a}`,
    viewAd: (i) => `Ver anúncio ${i}`,
    prevAd: 'Anúncio anterior',
    nextAd: 'Próximo anúncio',
    adFacts: ['Cliente', 'Para quem fala', 'Produto', 'Formato'],
    adsCta: 'Quero criativos assim',
  },
  en: {
    authorial: 'Personal project',
    example: 'example',
    stages: [['Top', 'awareness'], ['Middle', 'consideration'], ['Bottom', 'conversion']],
    stageBadge: (i) => `${['top', 'middle', 'bottom'][i]} of funnel`,
    thisPiece: ' (this piece)',
    funnelAria: 'Sales funnel',
    openCarousel: (b) => `Open the ${b} carousel and the strategy behind it`,
    seeSlides: (n) => `See all ${n} slides`,
    openVideo: (b) => `Watch the ${b} video and see the strategy behind it`,
    watchSound: 'Watch with sound',
    slidesAria: 'Carousel slides',
    slideAlt: (i, n) => `Slide ${i} of ${n}.`,
    videoAria: (b, t) => `${b} video: ${t}, with on-screen captions`,
    close: 'Close',
    goSlide: (i) => `Go to slide ${i}`,
    prevSlide: 'Previous slide',
    nextSlide: 'Next slide',
    funnelStage: 'Funnel stage',
    strategy: 'The strategy',
    sceneBy: 'Scene by scene',
    slideBy: 'Slide by slide',
    howMeasure: 'How I would measure it',
    whatMeasure: 'What we measure',
    metricsAria: 'When the metrics are read',
    caseCta: 'I want a carousel like this',
    cardLink: 'See how I do it',
    openAd: (i, a) => `Open ad ${i}: ${a}`,
    seeAds: (n) => `See all ${n} ads`,
    adsAria: 'Ads',
    adAlt: (i, n, c, a) => `Ad ${i} of ${n}, ${c}: ${a}`,
    viewAd: (i) => `View ad ${i}`,
    prevAd: 'Previous ad',
    nextAd: 'Next ad',
    adFacts: ['Client', 'Audience', 'Product', 'Format'],
    adsCta: 'I want ads like this',
  },
};
const T = () => UI[LANG];
// The résumé PDF in the current language.
const cvPdf = () => (LANG === 'en' ? '/cv-diogo-abilio-en.pdf' : config.cv);

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
  download: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>',
};

// ---------- shared pieces ----------
// `alternates` ({ pt, en } paths) marks a page that exists in both languages.
const layout = ({ title, description, path, og, body, home = false, schema, cv = false, alternates }) => `<!doctype html>
<html lang="${LANG === 'en' ? 'en' : 'pt-BR'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${abs(path)}" />
${alternates ? `<link rel="alternate" hreflang="pt-BR" href="${abs(alternates.pt)}" />
<link rel="alternate" hreflang="en" href="${abs(alternates.en)}" />
<link rel="alternate" hreflang="x-default" href="${abs(alternates.pt)}" />
` : ''}<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<meta name="theme-color" content="#0A0A0B" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="${LANG === 'en' ? 'en_US' : 'pt_BR'}" />
${alternates ? `<meta property="og:locale:alternate" content="${LANG === 'en' ? 'pt_BR' : 'en_US'}" />
` : ''}
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
<a class="skip-link" href="#conteudo">${LANG === 'en' ? 'Skip to content' : 'Pular para o conteúdo'}</a>
${cv ? cvNav() : nav()}
<main id="conteudo">
${body}
</main>
${footer()}
${cv
    ? `<a class="wa-float" href="${cvPdf()}" download data-cv="flutuante">${icon.download}${esc(cvStr[LANG].downloadShort)}</a>`
    : `<a class="wa-float" href="${waLink()}" target="_blank" rel="noopener" data-wa="flutuante">${icon.chat}Análise grátis</a>`}
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
      <a href="/curriculo">Currículo</a>
    </nav>
    <a class="btn btn-primary btn-sm" href="${waLink()}" target="_blank" rel="noopener" data-wa="nav">Análise grátis</a>
    <button class="nav-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu"><span></span></button>
  </div>
</header>`;

// Résumé page nav: same bar, links to its own sections, a PT/EN switch, CTA downloads the PDF.
const cvNav = () => {
  const s = cvStr[LANG];
  return `<header class="nav">
  <div class="container nav-inner">
    <a class="nav-logo" href="/">Diogo Abílio</a>
    <nav class="nav-links" id="menu" aria-label="${esc(s.navAria)}">
      <span class="nav-pill" aria-hidden="true"></span>
      ${s.nav.map(([id, label]) => `<a href="#${id}" data-spy="${id}">${esc(label)}</a>`).join('\n      ')}
    </nav>
    <div class="lang-switch" role="group" aria-label="${esc(s.langAria)}">
      <a href="${cvPath.pt}" hreflang="pt-BR" lang="pt-BR"${LANG === 'pt' ? ' aria-current="page"' : ''} data-lang="pt"><span aria-hidden="true">PT</span><span class="sr-only">Português</span></a>
      <a href="${cvPath.en}" hreflang="en" lang="en"${LANG === 'en' ? ' aria-current="page"' : ''} data-lang="en"><span aria-hidden="true">EN</span><span class="sr-only">English</span></a>
    </div>
    <a class="btn btn-primary btn-sm nav-cta" href="${cvPdf()}" download data-cv="nav">${esc(s.downloadShort)}</a>
    <button class="nav-toggle" type="button" aria-label="${esc(s.menu)}" aria-expanded="false" aria-controls="menu"><span></span></button>
  </div>
</header>`;
};

const footer = () => `<footer class="footer">
  <div class="container footer-inner">
    <span>Diogo Abílio · São Paulo · 2026</span>
    <div class="footer-links">
      ${LANG === 'en' ? '<a href="/curriculo/en">Résumé</a>' : '<a href="/curriculo">Currículo</a>'}
      <a href="${config.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
      <a href="${config.instagram}" target="_blank" rel="noopener">Instagram</a>
      <a href="mailto:${config.email}">${LANG === 'en' ? 'Email' : 'E-mail'}</a>
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
          ${main.authorial ? `<span class="badge badge--autoral">${T().authorial}</span>` : ''}
          <div class="show-phones" aria-hidden="true">
            ${s.phones.map((ph, i) => `<div class="show-phone show-phone--${i + 1}"><div class="show-screen"><img src="${ph.src}" alt="" width="${ph.width}" height="${ph.height}" loading="lazy" decoding="async" /></div></div>`).join('\n            ')}
          </div>
        </div>`;
  }
  if (s.mockup === 'fan') {
    return `<div class="mock mock-fan" data-loop aria-hidden="true"><div class="fan">${fanSvgs.join('')}</div><span class="badge">${T().example}</span></div>`;
  }
  if (s.mockup === 'phone') {
    const feed = [plainPost, adPost, plainPost, plainPost].join('');
    return `<div class="mock mock-phone" data-loop aria-hidden="true"><div class="phone"><div class="feed">${feed}${feed}</div></div><span class="badge">${T().example}</span></div>`;
  }
  if (s.mockup === 'timeline') {
    const bars = Array.from({ length: 48 }, (_, k) => `<span style="--k:${(k * 7) % 13}"></span>`).join('');
    return `<div class="mock mock-timeline" data-loop aria-hidden="true">
          <div class="timeline-wrap">
            <div class="frames">${frameSvgs.map((f) => `<div class="frame">${f}</div>`).join('')}</div>
            <div class="track">${bars}</div>
            <i class="playhead"></i>
          </div>
          <span class="badge">${T().example}</span>
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
const isVideo = (c) => c.type === 'video';
// one line per slide or scene; scenes carry their start time
const caseSteps = (c) => (isVideo(c) ? c.scenes.map(([t, text]) => ({ t, text })) : c.arc.map((text) => ({ text })));
const stageBadge = (c) => `<span class="badge">${esc(T().stageBadge(c.stage))}</span>`;

// Carousel cover: slide 1 in front, slides 2–5 tucked behind; they open into a fan on hover.
const carouselCover = (c) => `<div class="mock mock-carousel">
          <button class="carousel-open" type="button" aria-haspopup="dialog" aria-controls="case-${c.id}" data-open-case>
            <span class="sr-only">${esc(T().openCarousel(c.brand))}</span>
            <span class="cfan" aria-hidden="true">
              ${[5, 4, 3, 2, 1].map((n) => `<img src="${slide(c, n, 560)}" alt="" width="560" height="700" loading="lazy" decoding="async" data-n="${n}" />`).join('')}
            </span>
            <span class="cfan-hint" aria-hidden="true">${expandIcon}${esc(T().seeSlides(c.count))}</span>
          </button>
          ${stageBadge(c)}
          ${c.authorial ? `<span class="badge badge--autoral">${T().authorial}</span>` : ''}
        </div>`;

// Video cover: a plain vertical Reels screen with the muted highlight loop running.
const videoCover = (c) => `<div class="mock mock-video">
          <button class="carousel-open" type="button" aria-haspopup="dialog" aria-controls="case-${c.id}" data-open-case>
            <span class="sr-only">${esc(T().openVideo(c.brand))}</span>
            <span class="vphone" aria-hidden="true">
              <video class="vprev" muted loop playsinline preload="none" poster="${c.video.posterSmall}" data-src="${c.video.preview}"></video>
              <span class="vmute">${muteIcon}</span>
            </span>
            <span class="cfan-hint" aria-hidden="true">${playIcon}${esc(T().watchSound)}</span>
          </button>
          ${c.authorial ? `<span class="badge badge--autoral">${T().authorial}</span>` : ''}
          ${stageBadge(c)}
        </div>`;

// Funnel: three tapered layers, the active one lit; dots keep dropping into the top
// (new people arriving), a light sweeps across the active layer.
const funnelLayers = ['M6 34 H234 L210 84 H30 Z', 'M36 92 H204 L184 136 H56 Z', 'M62 144 H178 L162 184 H78 Z'];
const funnelSvg = (c) => {
  const label = T().stages.map(([t, sub], i) => `${t}, ${sub}${i === c.stage ? T().thisPiece : ''}`).join('; ');
  return `<svg class="funnel" viewBox="0 0 240 190" role="img" aria-label="${esc(T().funnelAria)}: ${esc(label)}">
            <defs>
              <linearGradient id="fg-${c.id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#CF97FF"/><stop offset=".5" stop-color="#A970FF"/><stop offset="1" stop-color="#7B2FF7"/></linearGradient>
              <linearGradient id="fs-${c.id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
              <clipPath id="fc-${c.id}"><path d="${funnelLayers[c.stage]}"/></clipPath>
            </defs>
            ${c.stage === 0 ? `<g class="funnel-drops">${[[40, 0], [78, 1.1], [112, .5], [146, 1.6], [180, .3], [204, 1.3], [96, 2]].map(([x, d]) => `<circle cx="${x}" cy="10" r="2.6" style="--d:${d}s"/>`).join('')}</g>` : ''}
            ${funnelLayers.map((d, i) => `<path class="fl${i === c.stage ? ' is-on' : ''}" d="${d}" style="--k:${i}"${i === c.stage ? ` fill="url(#fg-${c.id})"` : ''}/>`).join('')}
            <g clip-path="url(#fc-${c.id})"><rect class="funnel-sweep" x="-80" y="${[30, 88, 140][c.stage]}" width="70" height="60" fill="url(#fs-${c.id})"/></g>
            ${T().stages.map(([t, sub], i) => { const y = [58, 113, 163][i]; return `<g class="fl-text${i === c.stage ? ' is-on' : ''}" style="--k:${i}"><text x="120" y="${y}" text-anchor="middle" class="fl-t">${t}</text><text x="120" y="${y + 14}" text-anchor="middle" class="fl-s">${sub.toUpperCase()}</text></g>`; }).join('')}
          </svg>`;
};

const carouselViewer = (c, steps) => `<div class="case-track" tabindex="0" role="region" aria-label="${esc(T().slidesAria)}">
        ${steps.map((st, i) => `<figure class="case-slide"><img src="${slide(c, i + 1, 1122)}" srcset="${slide(c, i + 1, 560)} 560w, ${slide(c, i + 1, 1122)} 1122w" sizes="(max-width: 860px) 90vw, 560px" width="1122" height="1402" alt="${esc(T().slideAlt(i + 1, steps.length))} ${esc(st.text)}" loading="lazy" decoding="async" /></figure>`).join('\n        ')}
      </div>`;
const videoViewer = (c) => `<div class="case-track case-track--video">
        <figure class="case-slide"><video class="case-video" controls playsinline preload="none" poster="${c.video.poster}" aria-label="${esc(T().videoAria(c.brand, c.title))}">
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
    <form method="dialog" class="case-close-form"><button class="case-close" aria-label="${esc(T().close)}">${arrowIcon('M18 6L6 18M6 6l12 12')}</button></form>
    <div class="case-viewer">
      ${video ? videoViewer(c) : `${carouselViewer(c, steps)}
      <div class="case-bar">
        <span class="case-count" aria-live="polite"><b>01</b> / ${pad2(steps.length)}</span>
        <div class="case-thumbs">
          ${steps.map((st, i) => `<button type="button" data-go="${i}" aria-label="${esc(T().goSlide(i + 1))}"${i === 0 ? ' aria-current="true"' : ''}><img src="${slide(c, i + 1, 240)}" alt="" width="240" height="300" loading="lazy" decoding="async" /></button>`).join('')}
        </div>
        <div class="case-arrows">
          <button type="button" class="case-prev" aria-label="${esc(T().prevSlide)}" disabled>${arrowIcon('M15 18l-6-6 6-6')}</button>
          <button type="button" class="case-next" aria-label="${esc(T().nextSlide)}">${arrowIcon('M9 18l6-6-6-6')}</button>
        </div>
      </div>`}
    </div>
    <div class="case-info">
      <span class="label ci" style="--i:0">${esc(c.kicker)}</span>
      <h2 class="case-title ci" style="--i:1" id="case-${c.id}-title">${esc(c.brand)}: ${esc(c.title)}</h2>
      ${c.note ? `<p class="case-context ci" style="--i:1">${esc(c.note)}</p>` : ''}
      <p class="case-lead ci" style="--i:2">${esc(c.lead)}</p>

      <div class="case-grid ci" style="--i:3">
        <dl class="case-facts">
          ${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n          ')}
        </dl>
        <div class="case-funnel">
          <span class="case-h">${esc(T().funnelStage)}</span>
          ${funnelSvg(c)}
        </div>
      </div>

      <section class="case-block ci" style="--i:4">
        <h3 class="case-h">${esc(T().strategy)}</h3>
        <ol class="case-strategy">
          ${c.strategy.map(([t, p], i) => `<li><span class="n">${pad2(i + 1)}</span><div><b>${esc(t)}</b><p>${esc(p)}</p></div></li>`).join('\n          ')}
        </ol>
      </section>

      <section class="case-block ci" style="--i:5">
        <h3 class="case-h">${esc(video ? T().sceneBy : T().slideBy)}</h3>
        <ol class="case-arc">
          ${steps.map((st, i) => (video
            // scenes are read-only; the highlight follows playback
            ? `<li><span class="arc-row${i === 0 ? ' is-active' : ''}"><span class="n">${clock(st.t)}</span><span>${esc(st.text)}</span></span></li>`
            : `<li><button type="button" data-go="${i}"${i === 0 ? ' class="is-active"' : ''}><span class="n">${pad2(i + 1)}</span><span>${esc(st.text)}</span></button></li>`)).join('\n          ')}
        </ol>
      </section>

      <section class="case-block ci" style="--i:6">
        <h3 class="case-h">${esc(c.authorial ? T().howMeasure : T().whatMeasure)}</h3>
        <div class="case-tabs" role="tablist" aria-label="${esc(T().metricsAria)}">
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
        <a class="btn btn-primary" href="${waLink(c.waMessage)}" target="_blank" rel="noopener" data-wa="case-${c.id}">${esc(c.cta || T().caseCta)} <span class="arr" aria-hidden="true">→</span></a>
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
const cardLinkInner = () => `${esc(T().cardLink)} <span class="arr" aria-hidden="true">→</span>`;
// Cards with a case or a gallery open its dialog: the cover and the stretched
// "Ver como faço" button are all openers. The others link to their page.
const dialogId = (s) => `case-${(s.case || s.gallery).id}`;
const serviceCard = (s) => s.case || s.gallery
  ? `<article class="bcard bcard--${s.bento || 'small'} card-base spot reveal" data-card="${s.slug}">
        ${s.gallery ? adsCover(s.gallery) : isVideo(s.case) ? videoCover(s.case) : carouselCover(s.case)}
        ${cardBody(s, `<button class="card-link card-stretch" type="button" aria-haspopup="dialog" aria-controls="${dialogId(s)}" data-open-case>${cardLinkInner()}</button>`)}
      </article>`
  // the service pages are Portuguese only, so the English résumé sends this card to Behance
  : `<a class="bcard bcard--${s.bento || 'small'} card-base spot reveal" ${LANG === 'en' ? `href="${cv.behance}" target="_blank" rel="noopener"` : `href="/servicos/${s.slug}"`} data-card="${s.slug}">
        ${mockup(s)}
        ${cardBody(s, `<span class="card-link">${LANG === 'en' ? 'See more on Behance <span class="arr" aria-hidden="true">↗</span>' : cardLinkInner()}</span>`)}
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
        <p>Sou publicitário e designer. Nos meus <b class="hl-acc">+10 anos de experiência</b>, fui conectando áreas que hoje fazem parte do mesmo trabalho: comunicação, marketing e experiência digital. Gosto de criar, investigar e entender por que uma ideia merece sair do papel.</p>
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
const extLink = (href, text) => `<a class="btn btn-outline btn-sm" href="${href}" target="_blank" rel="noopener">${text} <span aria-hidden="true">↗</span><span class="sr-only"> ${LANG === 'en' ? '(opens in a new tab)' : '(abre em nova aba)'}</span></a>`;
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
        ${w.note ? `<p class="work-context">${esc(w.note)}</p>` : ''}
        ${w.result ? `<p class="work-result"><b>${esc(w.result.value)}</b><span>${esc(w.result.text)}</span></p>` : ''}
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
          <span class="sr-only">${esc(T().openAd(i + 1, it.angle))}</span>
        </button>`; }).join('\n        ')}
      </div>`;
};
// Home card cover: the deck alone, no client name (that lives in the dialog).
const adsCover = (g) => `<div class="mock mock-ads">
          ${adsDeck(g)}
          <span class="cfan-hint" aria-hidden="true">${expandIcon}${esc(T().seeAds(g.items.length))}</span>
        </div>`;
const adsDialog = (s) => {
  const g = s.gallery;
  const n = g.items.length;
  return `<dialog class="case case--ads" id="case-${g.id}" aria-labelledby="case-${g.id}-title" data-lenis-prevent>
  <div class="case-shell">
    <form method="dialog" class="case-close-form"><button class="case-close" aria-label="${esc(T().close)}">${arrowIcon('M18 6L6 18M6 6l12 12')}</button></form>
    <div class="case-viewer">
      <div class="case-track" tabindex="0" role="region" aria-label="${esc(T().adsAria)}">
        ${g.items.map((it, i) => { const [w, h] = adSize(it); return `<figure class="case-slide"><img class="r${it.ratio}" src="${adImg(g, i, 1080)}" srcset="${adImg(g, i, 480)} 480w, ${adImg(g, i, 1080)} 1080w" sizes="(max-width: 860px) 90vw, 560px" width="${w}" height="${h}" alt="${esc(T().adAlt(i + 1, n, it.campaign, it.angle))}" loading="lazy" decoding="async" /></figure>`; }).join('\n        ')}
      </div>
      <div class="case-bar">
        <span class="case-count" aria-live="polite"><b>01</b> / ${pad2(n)}</span>
        <div class="case-thumbs">
          ${g.items.map((it, i) => `<button type="button" data-go="${i}" aria-label="${esc(T().viewAd(i + 1))}"${i ? '' : ' aria-current="true"'}><img src="${adImg(g, i, 480)}" alt="" width="36" height="45" loading="lazy" /></button>`).join('')}
        </div>
        <div class="case-arrows">
          <button type="button" class="case-prev" aria-label="${esc(T().prevAd)}" disabled>${arrowIcon('M15 18l-6-6 6-6')}</button>
          <button type="button" class="case-next" aria-label="${esc(T().nextAd)}">${arrowIcon('M9 18l6-6-6-6')}</button>
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
            <div><dt>${esc(T().adFacts[0])}</dt><dd>${esc(g.facts[0][1])}</dd></div>
            <div><dt>${esc(T().adFacts[1])}</dt><dd>${esc(g.facts[1][1])}</dd></div>
            <div><dt>${esc(T().adFacts[2])}</dt><dd>${esc(it.product)}</dd></div>
            <div><dt>${esc(T().adFacts[3])}</dt><dd>${esc(it.format)}</dd></div>
          </dl>
          <div class="case-funnel">
            <span class="case-h">${esc(T().funnelStage)}</span>
            ${funnelSvg({ id: `${g.id}-${i}`, stage: it.stage })}
          </div>
        </div>
      </section>`).join('\n      ')}
      <div class="case-cta ci" style="--i:5">
        <a class="btn btn-primary" href="${waLink(g.waMessage)}" target="_blank" rel="noopener" data-wa="case-${g.id}">${esc(T().adsCta)} <span class="arr" aria-hidden="true">→</span></a>
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

// ---------- résumé page (/curriculo) ----------
// The site rewritten for recruiters: same look, content from the PDF résumé.
const cv = {
  role: 'Marketing focado em conversão',
  focus: ['Web design', 'Criativos', 'Copy', 'UX/UI', 'CRO'],
  summary: 'Mais de 10 anos unindo marketing, design e UX/UI para fazer gente decidir. Crio sites, landing pages, criativos para anúncios e textos que levam à ação, da estratégia à publicação. Leio os dados, ajusto o que trava a conversão e trabalho junto com growth, mídia, tecnologia e comercial.',
  goal: 'Posição de tempo integral em marketing focado em conversão, unindo web design, criativos, copy e UX/UI. Contratação CLT ou PJ.',
  meta: ['São Paulo, SP', '+10 anos de experiência', 'Tempo integral', 'CLT ou PJ'],
  behance: 'https://www.behance.net/diogoux',
  phone: '+55 11 98555-7297',
  stats: [
    ['+10', 'anos', 'entre design, marketing e UX/UI'],
    ['15%', 'a mais', 'na taxa de MQL em campanhas para público frio no G4 Educação'],
    ['50 mil', 'seguidores', 'no Instagram em menos de 1 mês, na K.Pitaliza'],
    ['8', 'pessoas', 'lideradas em copy, design e edição numa campanha nacional'],
  ],
  freelance: {
    intro: 'Desde o fim de 2025 atendo empresas como autônomo. Entre os principais clientes estão IQR Educação e LET’S.',
    jobs: [
      {
        company: 'IQR Educação / Guilherme Machado', logo: 'guilherme-machado', lw: 83, lh: 40,
        role: 'Design Strategist', period: 'set 2026 – nov 2026', type: 'Autônomo',
        bullets: [
          'Auditoria de design e marketing na empresa de Guilherme Machado, especialista do mercado imobiliário, com diagnóstico e implementação de materiais.',
          'Apresentações, estratégia e produção de criativos para conteúdo orgânico e mídia paga, incluindo campanhas de fundo de funil.',
          'Landing pages de alta conversão, com análise dos canais de aquisição e das etapas do funil para orientar materiais e conversão.',
        ],
      },
      {
        company: 'LET’S', logo: 'lets', lw: 75, lh: 24,
        role: 'Webflow Designer', period: 'dez 2025 – abr 2026', type: 'Autônomo',
        bullets: [
          'Criação e evolução de site, páginas de produto e landing pages para um SaaS B2B de logística, apoiando marketing, vendas e geração de demanda.',
          'Figma, Webflow, CMS, formulários e HubSpot para páginas escaláveis e fáceis de manter.',
        ],
      },
    ],
  },
  jobs: [
    {
      company: 'K.Pitaliza Tecnologia', initials: 'K.P',
      role: 'Coordenador de Marketing', period: 'jun 2025 – out 2025', type: 'CLT',
      bullets: [
        'Coordenação de campanha nacional com Claudia Leitte como embaixadora e liderança de 8 profissionais de copy, design e edição.',
        'Apoio ao crescimento do Instagram de zero a 50 mil seguidores em menos de 1 mês e à operação com mais de 300 afiliados ativos.',
      ],
    },
    {
      company: 'G4 Educação', logo: 'g4', lw: 86, lh: 34,
      role: 'Web Designer Pleno', period: 'abr 2024 – fev 2025', type: 'CLT',
      bullets: [
        'Páginas de produto, eventos e captação no time de Web Experience, em Martech/Growth, incluindo G4 Gestão e Estratégia, G4 Growth e G4 Sprints.',
        'Participação em campanhas para público frio que contribuíram para um aumento de 15% na taxa de MQL.',
      ],
    },
    {
      company: 'Valid', logo: 'valid', lw: 78, lh: 24,
      role: 'UX Designer / Analista de Marketing & Growth', period: 'dez 2021 – nov 2023', type: 'CLT',
      bullets: ['UX/UI, identidade e produtos digitais, campanhas e materiais para geração de leads e aquisição.'],
    },
  ],
  earlier: [
    ['Agência Moonflag', 'Designer Gráfico', 'fev – nov 2021'],
    ['Ituran Brasil', 'Assistente de Marketing', 'set 2018 – dez 2019'],
    ['CrediPronto', 'Estagiário de Marketing', 'nov 2015 – mai 2017'],
  ],
  skills: [
    { title: 'Web design e CRO', text: 'Do primeiro rascunho à página no ar, pensando em quem precisa decidir.', tags: ['Arquitetura da informação', 'Proposta de valor', 'CTAs', 'Formulários', 'Testes A/B', 'CMS', 'Design system', 'Responsividade'] },
    { title: 'UX/UI e interface', text: 'Interfaces claras, que a pessoa entende sem precisar pensar.', tags: ['Pesquisa e jornada', 'Wireframes', 'Protótipos', 'UI design', 'Usabilidade', 'Produtos digitais'] },
    { title: 'Copy e criativos', text: 'Texto e imagem trabalhando juntos para chamar atenção e levar à ação.', tags: ['Copywriting', 'Headlines e CTAs', 'Microcopy', 'Roteiros', 'Criativos para anúncios', 'Conteúdo para redes sociais'] },
    { title: 'Design e publicação', text: 'Ferramentas do dia a dia para desenhar, montar, publicar e manter páginas.', tags: ['Figma', 'Webflow', 'Relume', 'Vercel', 'Supabase', 'Pacote Adobe'] },
    { title: 'Dados e operação', text: 'Leio os números para saber onde a página perde gente.', tags: ['GA4', 'Amplitude', 'HubSpot', 'RD Station', 'Sheets'] },
    { title: 'IA aplicada', text: 'Para protótipos, criativos, variações e execução mais rápida. A estratégia continua comigo.', tags: ['Claude', 'Claude Code', 'ChatGPT', 'Lovable', 'Higgsfield'] },
  ],
  degree: ['Publicidade e Propaganda', 'FMU / FIAM-FAAM', '2014 – 2017'],
  courses: [
    ['Imersão UX Strategy', 'Mergo', '2025'],
    ['UX Design, Figma e Design System', 'Alura', ''],
    ['Web Analytics e BI', 'Lemonade School', ''],
    ['Pacote Adobe', 'Saga', ''],
  ],
};
// English résumé: same structure as `cv`, translated for international recruiters.
const cvEn = {
  role: 'Conversion-focused marketing',
  focus: ['Web design', 'Ad creatives', 'Copywriting', 'UX/UI', 'CRO'],
  summary: '10+ years combining marketing, design and UX/UI to help people decide. I build websites, landing pages, ad creatives and copy that drive action, from strategy to launch. I read the data, fix what holds conversion back and work closely with growth, media, tech and sales teams.',
  goal: 'A full-time role in conversion-focused marketing, combining web design, ad creatives, copywriting and UX/UI. Open to employee (CLT) or contractor (PJ) arrangements.',
  meta: ['São Paulo, Brazil', '10+ years of experience', 'Full-time', 'Employee or contractor'],
  behance: cv.behance,
  phone: cv.phone,
  stats: [
    ['10+', 'years', 'across design, marketing and UX/UI'],
    ['15%', 'higher', 'MQL rate in cold-audience campaigns at G4 Educação'],
    ['50K', 'followers', 'on Instagram in under a month at K.Pitaliza'],
    ['8', 'people', 'led across copy, design and editing in a national campaign'],
  ],
  freelance: {
    intro: 'Since late 2025 I have worked independently with companies. Key clients include IQR Educação and LET’S.',
    jobs: [
      {
        ...cv.freelance.jobs[0],
        role: 'Design Strategist', period: 'Sep 2026 – Nov 2026', type: 'Freelance',
        bullets: [
          'Design and marketing audit for the company of Guilherme Machado, a real estate market expert, from diagnosis to rolling out new materials.',
          'Presentations, strategy and creative production for organic content and paid media, including bottom-of-funnel campaigns.',
          'High-converting landing pages, guided by an analysis of acquisition channels and each stage of the funnel.',
        ],
      },
      {
        ...cv.freelance.jobs[1],
        role: 'Webflow Designer', period: 'Dec 2025 – Apr 2026', type: 'Freelance',
        bullets: [
          'Built and evolved the website, product pages and landing pages for a B2B logistics SaaS, supporting marketing, sales and demand generation.',
          'Figma, Webflow, CMS, forms and HubSpot for pages that scale and are easy to maintain.',
        ],
      },
    ],
  },
  jobs: [
    {
      ...cv.jobs[0],
      role: 'Marketing Coordinator', period: 'Jun 2025 – Oct 2025', type: 'Full-time',
      bullets: [
        'Coordinated a national campaign with singer Claudia Leitte as brand ambassador, leading 8 professionals across copy, design and editing.',
        'Helped grow Instagram from zero to 50K followers in under a month and supported an operation with 300+ active affiliates.',
      ],
    },
    {
      ...cv.jobs[1],
      role: 'Web Designer (mid-level)', period: 'Apr 2024 – Feb 2025', type: 'Full-time',
      bullets: [
        'Product, event and lead-capture pages in the Web Experience team (Martech/Growth), including G4 Gestão e Estratégia, G4 Growth and G4 Sprints.',
        'Contributed to cold-audience campaigns that drove a 15% increase in MQL rate.',
      ],
    },
    {
      ...cv.jobs[2],
      role: 'UX Designer / Marketing & Growth Analyst', period: 'Dec 2021 – Nov 2023', type: 'Full-time',
      bullets: ['UX/UI, brand identity and digital products, plus campaigns and materials for lead generation and acquisition.'],
    },
  ],
  earlier: [
    ['Agência Moonflag', 'Graphic Designer', 'Feb – Nov 2021'],
    ['Ituran Brasil', 'Marketing Assistant', 'Sep 2018 – Dec 2019'],
    ['CrediPronto', 'Marketing Intern', 'Nov 2015 – May 2017'],
  ],
  skills: [
    { title: 'Web design & CRO', text: 'From first sketch to live page, designed for the person who has to decide.', tags: ['Information architecture', 'Value proposition', 'CTAs', 'Forms', 'A/B testing', 'CMS', 'Design systems', 'Responsive design'] },
    { title: 'UX/UI & interface', text: 'Clear interfaces that people understand without having to think.', tags: ['Research & journeys', 'Wireframes', 'Prototypes', 'UI design', 'Usability', 'Digital products'] },
    { title: 'Copy & creatives', text: 'Words and visuals working together to grab attention and drive action.', tags: ['Copywriting', 'Headlines & CTAs', 'Microcopy', 'Scripts', 'Ad creatives', 'Social media content'] },
    { title: 'Design & publishing', text: 'Everyday tools to design, build, publish and maintain pages.', tags: ['Figma', 'Webflow', 'Relume', 'Vercel', 'Supabase', 'Adobe Suite'] },
    { title: 'Data & operations', text: 'I read the numbers to find where a page loses people.', tags: ['GA4', 'Amplitude', 'HubSpot', 'RD Station', 'Sheets'] },
    { title: 'Applied AI', text: 'For prototypes, creatives, variations and faster execution. The strategy stays with me.', tags: ['Claude', 'Claude Code', 'ChatGPT', 'Lovable', 'Higgsfield'] },
  ],
  degree: ['Bachelor’s in Advertising', 'FMU / FIAM-FAAM', '2014 – 2017'],
  courses: [
    ['UX Strategy Immersion', 'Mergo', '2025'],
    ['UX Design, Figma and Design Systems', 'Alura', ''],
    ['Web Analytics and BI', 'Lemonade School', ''],
    ['Adobe Suite', 'Saga', ''],
  ],
};
const cvData = { pt: cv, en: cvEn };
const cvPath = { pt: '/curriculo', en: '/curriculo/en' };

// Interface text of the résumé page in each language. h1 and h2 are [text, italic?] segments.
const cvStr = {
  pt: {
    title: (d) => `Diogo Abílio · Currículo | ${d.role}`,
    description: (d) => `Diogo Abílio, ${d.role.toLowerCase()} em São Paulo: ${d.focus.join(', ')}. Mais de 10 anos criando sites, landing pages, criativos e copy para conversão. Disponível para CLT ou PJ.`,
    schemaName: 'Currículo',
    navAria: 'Currículo',
    langAria: 'Idioma',
    menu: 'Abrir menu',
    nav: [['experiencia', 'Experiência'], ['trabalhos', 'Trabalhos'], ['competencias', 'Competências'], ['formacao', 'Formação']],
    downloadShort: 'Baixar currículo',
    downloadTop: 'Baixar currículo em PDF',
    open: 'Currículo · aberto a vagas',
    h1: [['Marketing focado em ', false], ['conversão', true]],
    quick: 'Resumo rápido',
    goal: 'Objetivo',
    photoAlt: 'Diogo Abílio sentado numa cadeira de diretor, com uma caneca roxa na mão',
    statsAria: 'Resultados em números',
    logos: 'Empresas e marcas com quem trabalhei',
    expLabel: 'Experiência',
    expH2: [['Onde eu já ', false], ['coloquei a mão', true], ['.', false]],
    freelanceH: 'Atuação autônoma',
    freelancePeriod: '2025 – atual',
    companiesH: 'Experiência em empresas',
    earlier: 'Anteriores',
    workLabel: 'Portfólio',
    workH2: [['Alguns trabalhos, ', false], ['na prática', true], ['.', false]],
    workLead: (link) => `Clique para ver cada peça e a estratégia por trás dela. Mais cases no ${link}.`,
    skillsLabel: 'Competências e ferramentas',
    skillsH2: [['O que eu trago ', false], ['para o time', true], ['.', false]],
    aboutLabel: 'Como eu trabalho',
    aboutH2: [['Primeiro eu entendo. Depois eu ', false], ['implemento', true], ['.', false]],
    about: [
      'Sou publicitário e designer. Fui conectando áreas que hoje fazem parte do mesmo trabalho: <b class="hl-acc">comunicação, marketing e experiência digital</b>.',
      'Antes de desenhar, olho os números e procuro o ponto em que a pessoa desiste. Depois coloco no ar, acompanho os dados e ajusto. Gosto de conversar, fazer perguntas e participar das escolhas, com espaço para propor e responsabilidade para colocar em prática.',
    ],
    eduLabel: 'Formação e certificações',
    eduH2: [['Base e ', false], ['estudo contínuo', true], ['.', false]],
    degree: 'Graduação',
    ctaH2: [['Tem uma vaga com a ', false], ['minha cara', true], ['?', false]],
    ctaLead: 'Vamos conversar. Me chama no WhatsApp que eu respondo rápido.',
    ctaWa: 'Falar comigo no WhatsApp',
    ctaPdf: 'Baixar PDF',
    email: 'E-mail',
    wa: 'Oi Diogo, vi seu currículo no site e quero conversar sobre uma vaga',
    mailSubject: 'Vaga: marketing focado em conversão',
  },
  en: {
    title: (d) => `Diogo Abílio · Résumé | ${d.role}`,
    description: (d) => `Diogo Abílio, ${d.role.toLowerCase()} based in São Paulo, Brazil: ${d.focus.join(', ')}. 10+ years building websites, landing pages, ad creatives and copy that convert.`,
    schemaName: 'Résumé',
    navAria: 'Résumé',
    langAria: 'Language',
    menu: 'Open menu',
    nav: [['experiencia', 'Experience'], ['trabalhos', 'Work'], ['competencias', 'Skills'], ['formacao', 'Education']],
    downloadShort: 'Download résumé',
    downloadTop: 'Download résumé (PDF)',
    open: 'Résumé · open to work',
    h1: [['Conversion-focused ', false], ['marketing', true]],
    quick: 'Quick summary',
    goal: 'Goal',
    photoAlt: 'Diogo Abílio sitting in a director’s chair, holding a purple mug',
    statsAria: 'Results in numbers',
    logos: 'Companies and brands I’ve worked with',
    expLabel: 'Experience',
    expH2: [['Where I’ve ', false], ['made an impact', true], ['.', false]],
    freelanceH: 'Independent work',
    freelancePeriod: '2025 – present',
    companiesH: 'In-house experience',
    earlier: 'Earlier',
    workLabel: 'Portfolio',
    workH2: [['Selected work, ', false], ['in practice', true], ['.', false]],
    workLead: (link) => `Click each piece to see it and the strategy behind it. The pieces themselves are in Portuguese. More case studies on ${link}.`,
    skillsLabel: 'Skills & tools',
    skillsH2: [['What I bring ', false], ['to the team', true], ['.', false]],
    aboutLabel: 'How I work',
    aboutH2: [['First I understand. Then I ', false], ['ship', true], ['.', false]],
    about: [
      'I’m an advertising professional and designer. Over the years I’ve connected areas that are now part of the same job: <b class="hl-acc">communication, marketing and digital experience</b>.',
      'Before designing, I look at the numbers and find the point where people give up. Then I launch, follow the data and adjust. I like to talk, ask questions and take part in decisions, with room to propose ideas and the ownership to make them happen.',
    ],
    eduLabel: 'Education & certifications',
    eduH2: [['Foundation and ', false], ['continuous learning', true], ['.', false]],
    degree: 'Degree',
    ctaH2: [['Got a role that ', false], ['fits me', true], ['?', false]],
    ctaLead: 'Let’s talk. Message me on WhatsApp and I’ll get back to you quickly.',
    ctaWa: 'Message me on WhatsApp',
    ctaPdf: 'Download PDF',
    email: 'Email',
    wa: 'Hi Diogo, I saw your résumé on your website and would like to talk about a role',
    mailSubject: 'Role: conversion-focused marketing',
  },
};
const cvMail = (s) => `mailto:${config.email}?subject=${encodeURIComponent(s.mailSubject)}`;

const jobLogo = (j) => (j.logo
  ? `<img src="/images/logos/${j.logo}.webp" alt="" width="${j.lw}" height="${j.lh}" loading="lazy" decoding="async" />`
  : `<span class="cv-initials">${esc(j.initials)}</span>`);
const jobItem = (j) => `<li class="cv-job reveal">
          <div class="cv-job-side">
            <span class="cv-logo" aria-hidden="true">${jobLogo(j)}</span>
            <span class="cv-period">${esc(j.period)}</span>
            <span class="cv-type">${esc(j.type)}</span>
          </div>
          <div class="cv-job-main">
            <h3>${esc(j.role)}</h3>
            <p class="cv-company">${esc(j.company)}</p>
            <ul class="cv-bullets">
              ${j.bullets.map((b) => `<li>${esc(b)}</li>`).join('\n              ')}
            </ul>
          </div>
        </li>`;

const cvSchema = (d, s, lang) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      ...person(),
      jobTitle: d.role,
      description: d.summary,
      knowsAbout: lang === 'en'
        ? ['Conversion marketing', 'Web design', 'CRO', 'UX/UI', 'Copywriting', 'Ad creatives', 'Landing pages', 'Design systems', 'Figma', 'GA4', 'Growth marketing']
        : ['Marketing de conversão', 'Web design', 'CRO', 'UX/UI', 'Copywriting', 'Criativos para anúncios', 'Landing pages', 'Design system', 'Figma', 'GA4', 'Growth marketing'],
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'FMU / FIAM-FAAM' },
      sameAs: [config.linkedin, config.instagram, d.behance],
    },
    { '@type': 'ProfilePage', '@id': abs(`${cvPath[lang]}#page`), url: abs(cvPath[lang]), name: `Diogo Abílio · ${s.schemaName} · ${d.role}`, inLanguage: lang === 'en' ? 'en' : 'pt-BR', mainEntity: { '@id': personId } },
  ],
});

// Renders the résumé in one language; templates shared with the home (cards, dialogs)
// follow LANG, which is switched for the duration of the render.
const cvPage = (lang = 'pt') => {
  const prev = LANG;
  LANG = lang;
  const d = cvData[lang];
  const s = cvStr[lang];
  const svc = lang === 'en' ? servicesEn : services;
  const html = layout({
    title: s.title(d),
    description: s.description(d),
    path: cvPath[lang],
    alternates: cvPath,
    og: '/og/home.png',
    schema: cvSchema(d, s, lang),
    cv: true,
    body: `<section class="svc-top cv-top" aria-labelledby="cv-title">
  <div class="hero-bg" aria-hidden="true"><div class="hero-wash"></div></div>
  <div class="container cv-top-grid">
    <div class="cv-top-copy">
      <span class="label cv-open"><i aria-hidden="true"></i>${esc(s.open)}</span>
      <p class="cv-name">Diogo Miranda Abílio</p>
      <h1 class="h1" id="cv-title">${esc(s.h1[0][0])}<em class="serif grad-text">${esc(s.h1[1][0])}</em></h1>
      <ul class="cv-focus">${d.focus.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <p class="lead">${esc(d.summary)}</p>
      <div class="svc-actions cv-actions">
        <a class="btn btn-primary magnetic" href="${cvPdf()}" download data-cv="topo">${icon.download}${esc(s.downloadTop)}</a>
        ${extLink(config.linkedin, 'LinkedIn')}
        ${extLink(d.behance, 'Behance')}
      </div>
      <aside class="cv-card card-base" aria-label="${esc(s.quick)}">
        <p class="cv-goal"><b>${esc(s.goal)}</b>${esc(d.goal)}</p>
        <ul class="cv-meta">${d.meta.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
        <p class="cv-contact"><a href="${waLink(s.wa)}" target="_blank" rel="noopener" data-wa="cv-card">WhatsApp ${esc(d.phone)}</a><a href="${cvMail(s)}">${esc(config.email)}</a></p>
      </aside>
    </div>
    <figure class="cv-figure">
      <img class="cv-photo" src="/images/sobre/diogo-cadeira-520.webp" srcset="/images/sobre/diogo-cadeira-520.webp 520w, /images/sobre/diogo-cadeira-900.webp 900w" sizes="(max-width: 960px) 70vw, 460px" width="520" height="770" alt="${esc(s.photoAlt)}" decoding="async" fetchpriority="high" />
    </figure>
  </div>
</section>

<section class="cv-stats-wrap" aria-label="${esc(s.statsAria)}">
  <div class="container">
    <ul class="cv-stats" data-stagger>
      ${d.stats.map(([n, unit, text]) => `<li class="reveal"><b>${esc(n)}</b><span class="cv-unit">${esc(unit)}</span><span>${esc(text)}</span></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="logos" aria-labelledby="logos-title">
  <div class="container">
    <h2 class="label" id="logos-title">${esc(s.logos)}</h2>
  </div>
  <div class="marquee">
    <div class="marquee-track">
      <ul class="marquee-list">${logos.map(logoItem).join('')}</ul>
      <ul class="marquee-list" aria-hidden="true">${logos.map(logoItem).join('')}</ul>
    </div>
  </div>
</section>

<section class="section" id="experiencia" aria-labelledby="exp-title">
  <div class="container">
    <div class="section-head">
      <span class="label">${esc(s.expLabel)}</span>
      ${h2('exp-title', s.expH2)}
    </div>

    <div class="cv-group">
      <div class="cv-group-head">
        <h3>${esc(s.freelanceH)}</h3><span class="cv-period">${esc(s.freelancePeriod)}</span>
        <p>${esc(d.freelance.intro)}</p>
      </div>
      <ol class="cv-jobs">
        ${d.freelance.jobs.map(jobItem).join('\n        ')}
      </ol>
    </div>

    <div class="cv-group">
      <div class="cv-group-head">
        <h3>${esc(s.companiesH)}</h3>
      </div>
      <ol class="cv-jobs">
        ${d.jobs.map(jobItem).join('\n        ')}
      </ol>
      <div class="cv-earlier reveal">
        <span class="case-h">${esc(s.earlier)}</span>
        <ul>${d.earlier.map(([c, r, p]) => `<li><b>${esc(c)}</b><span>${esc(r)}</span><span class="cv-period">${esc(p)}</span></li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>

<section class="section" id="trabalhos" aria-labelledby="trab-title">
  <div class="container">
    <div class="section-head">
      <span class="label">${esc(s.workLabel)}</span>
      ${h2('trab-title', s.workH2)}
      <p class="lead cv-head-lead">${s.workLead(`<a class="link-u" href="${d.behance}" target="_blank" rel="noopener">Behance</a>`)}</p>
    </div>
    <div class="bento-services" data-stagger>
      ${svc.map(serviceCard).join('\n      ')}
    </div>
  </div>
</section>

<section class="section" id="competencias" aria-labelledby="comp-title">
  <div class="container">
    <div class="section-head">
      <span class="label">${esc(s.skillsLabel)}</span>
      ${h2('comp-title', s.skillsH2)}
    </div>
    <div class="cv-skills" data-stagger>
      ${d.skills.map((k) => `<article class="cv-skill card-base spot reveal">
        <h3>${esc(k.title)}</h3>
        <p>${esc(k.text)}</p>
        <ul class="cv-tags">${k.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section" id="sobre" aria-labelledby="sobre-title">
  <div class="container cv-about">
    <div class="section-head">
      <span class="label">${esc(s.aboutLabel)}</span>
      ${h2('sobre-title', s.aboutH2)}
    </div>
    <div class="about-text reveal">
      ${s.about.map((p) => `<p>${p}</p>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section" id="formacao" aria-labelledby="form-title">
  <div class="container">
    <div class="section-head">
      <span class="label">${esc(s.eduLabel)}</span>
      ${h2('form-title', s.eduH2)}
    </div>
    <div class="cv-edu">
      <article class="cv-degree card-base reveal">
        <span class="case-h">${esc(s.degree)}</span>
        <h3>${esc(d.degree[0])}</h3>
        <p>${esc(d.degree[1])} <span aria-hidden="true">·</span> ${esc(d.degree[2])}</p>
      </article>
      <ul class="cv-courses" data-stagger>
        ${d.courses.map(([t, school, y]) => `<li class="reveal"><b>${esc(t)}</b><span>${esc(school)}${y ? ` · ${esc(y)}` : ''}</span></li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>

<section class="section" id="cta-final" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-block reveal">
      ${h2('cta-title', s.ctaH2)}
      <p class="lead">${esc(s.ctaLead)}</p>
      <div class="cv-cta-actions">
        <a class="btn btn-primary magnetic" href="${waLink(s.wa)}" target="_blank" rel="noopener" data-wa="cv-cta">${esc(s.ctaWa)} <span class="arr" aria-hidden="true">→</span></a>
        <a class="btn btn-outline" href="${cvPdf()}" download data-cv="cta">${icon.download}${esc(s.ctaPdf)}</a>
      </div>
      <p class="cta-contacts">
        <a href="${cvMail(s)}">${esc(s.email)}</a>
        <span aria-hidden="true">·</span>
        <a href="${config.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
        <span aria-hidden="true">·</span>
        <a href="${d.behance}" target="_blank" rel="noopener">Behance</a>
      </p>
    </div>
  </div>
</section>
${svc.filter((x) => x.case).map(caseDialog).join('\n')}
${svc.filter((x) => x.gallery).map(adsDialog).join('\n')}`,
  });
  LANG = prev;
  return html;
};

// ---------- write ----------
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });
cpSync(join(root, 'src/styles.css'), join(out, 'assets/styles.css'));
cpSync(join(root, 'src/main.js'), join(out, 'assets/main.js'));

writeFileSync(join(out, 'index.html'), home());
mkdirSync(join(out, 'curriculo'), { recursive: true });
writeFileSync(join(out, 'curriculo', 'index.html'), cvPage('pt'));
mkdirSync(join(out, 'curriculo', 'en'), { recursive: true });
writeFileSync(join(out, 'curriculo', 'en', 'index.html'), cvPage('en'));
for (const s of services.filter(hasPage)) {
  mkdirSync(join(out, 'servicos', s.slug), { recursive: true });
  writeFileSync(join(out, 'servicos', s.slug, 'index.html'), servicePage(s));
}
// crawl files: everything is indexable; the sitemap lists the home and each service page
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/curriculo', '/curriculo/en', ...services.filter(hasPage).map((s) => `/servicos/${s.slug}`)];
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
