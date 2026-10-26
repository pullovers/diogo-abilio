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

// ---------- shared pieces ----------
const layout = ({ title, description, path, og, body }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${abs(path)}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<meta name="theme-color" content="#F5F2ED" />
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
<link rel="stylesheet" href="/assets/styles.css" />
<script>document.documentElement.classList.add('js')</script>
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
</body>
</html>
`;

const nav = () => `<header class="nav">
  <div class="container nav-inner">
    <a class="nav-logo" href="/">Diogo Abílio</a>
    <nav class="nav-links" id="menu" aria-label="Principal">
      <a href="/#servicos">Serviços</a>
      <a href="/#como-faco">Como faço</a>
      <a href="/#sobre">Sobre</a>
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

const finalCta = (origin, message) => `<section class="section" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-block reveal">
      <h2 class="h2" id="cta-title">Me mostra o que você tem <em class="serif accent">hoje</em>.</h2>
      <p class="lead">Eu gravo um vídeo curto mostrando o que está te custando venda. De graça, sem compromisso.</p>
      <a class="btn btn-primary" href="${waLink(message)}" target="_blank" rel="noopener" data-wa="${origin}">Quero minha análise grátis <span class="arr" aria-hidden="true">→</span></a>
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

const serviceCard = (s) => `<a class="service-card reveal" href="/servicos/${s.slug}" data-card="${s.slug}">
        <div class="card-media">${s.cardImage
          ? `<img src="${s.cardImage.src}" srcset="${s.cardImage.srcset}" sizes="(max-width: 760px) 92vw, 560px" alt="${esc(s.cardImage.alt)}" loading="lazy" decoding="async" width="800" height="600" style="object-position:${s.cardImage.position || 'center'}" />`
          : pending()}</div>
        <div class="card-body">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.tagline)}</p>
          <div class="card-foot">
            <span class="price">${esc(s.price)}</span>
            <span class="card-link">Ver como faço <span class="arr" aria-hidden="true">→</span></span>
          </div>
        </div>
      </a>`;

const home = () => layout({
  title: 'Diogo Abílio · Design e marketing que vendem',
  description: 'Eu crio suas páginas, posts e vídeos. Mas, antes de abrir qualquer tela, eu entendo seu negócio e por que o cliente ainda não comprou.',
  path: '/',
  og: '/og/home.png',
  body: `<section class="hero" aria-labelledby="hero-title">
  <div class="container hero-grid">
    <div class="hero-text">
      <p class="status"><span class="status-dot" aria-hidden="true"></span>Agenda aberta · 5 análises grátis por mês</p>
      <p class="eyebrow">Oi, eu sou o Diogo.</p>
      <h1 class="h1" id="hero-title">Bonito é fácil. Difícil é bonito que <em class="serif accent">vende</em>.</h1>
      <p class="hero-sub">Eu crio suas páginas, posts e vídeos. Mas, antes de abrir qualquer tela, eu entendo seu negócio e por que o cliente ainda não comprou.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="${waLink()}" target="_blank" rel="noopener" data-wa="hero">Me mostra onde estou perdendo venda <span class="arr" aria-hidden="true">→</span></a>
        <p class="micro">Análise gratuita, em vídeo, sem compromisso.</p>
        <a class="link-u" href="#servicos">Ou veja meus trabalhos ↓</a>
      </div>
    </div>
    <div class="hero-media">
      <figure class="photo-card">
        <img src="/img/foto-diogo-800.webp" srcset="/img/foto-diogo-480.webp 480w, /img/foto-diogo-800.webp 800w" sizes="(max-width: 860px) 92vw, 400px" width="800" height="1000" alt="Foto de Diogo Abílio" fetchpriority="high" decoding="async" />
        <figcaption class="photo-tag">São Paulo · atendimento remoto</figcaption>
      </figure>
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
    <div class="section-head reveal">
      <span class="label">Serviços</span>
      <h2 class="h2" id="servicos-title">O que eu faço, e como fica <em class="serif">na prática</em>.</h2>
    </div>
    <div class="services-grid" data-stagger>
      ${services.map(serviceCard).join('\n      ')}
    </div>
  </div>
</section>

<section class="section" id="como-faco" aria-labelledby="como-title">
  <div class="container">
    <div class="section-head reveal">
      <span class="label">Como eu trabalho</span>
      <h2 class="h2" id="como-title">Primeiro eu entendo. Depois eu <em class="serif">desenho</em>.</h2>
    </div>
    <ol class="steps" data-stagger>
      ${process.map(([n, t, p]) => `<li class="step reveal"><span class="step-num">${n}</span><h3>${t}</h3><p>${p}</p></li>`).join('\n      ')}
    </ol>
  </div>
</section>

<section class="section" id="sobre" aria-labelledby="sobre-title">
  <div class="container about-grid">
    <div class="about-text reveal">
      <span class="label">Sobre</span>
      <h2 class="h2" id="sobre-title">Prazer, Diogo.</h2>
      <p class="lead">Sou publicitário e designer, com [X] anos entre agência, startup e escola de negócios. No G4 Educação, fiz páginas de produto e de lançamento. Hoje atendo empresas direto, sem intermediário.</p>
      <ul class="numbers">
        <li><span class="num-val">8</span><span class="num-cap">pessoas lideradas em campanha nacional</span></li>
        <li><span class="num-val">50K</span><span class="num-cap">seguidores em menos de 1 mês</span></li>
        <li><span class="num-val">1ª</span><span class="num-cap">turma do G4 Sprints lotada antes do lançamento</span></li>
      </ul>
    </div>
    <div class="reveal">
      <h3 class="sr-only">Trajetória</h3>
      <ul class="career">
        ${career.map(([c, r, y]) => `<li><span class="co">${esc(c)}</span><span class="role">${esc(r)}</span><span class="yrs">${y}</span></li>`).join('\n        ')}
      </ul>
      <p class="edu">Publicidade e Propaganda (FMU) + cursos de UX, Design System e Web Analytics</p>
      <a class="link-u cv-link" href="${config.cv}" download data-cv="sobre">Baixar CV completo ↓</a>
    </div>
  </div>
</section>

${finalCta('cta-final')}`,
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
  <div class="container">
    <a class="back" href="/#servicos">← Voltar</a>
    <h1 class="h1" id="svc-title">${esc(s.name)}</h1>
    <p class="lead">${esc(s.tagline)}</p>
    <span class="price">${esc(s.price)}</span>
    <a class="btn btn-primary" href="${waLink(s.whatsappMessage)}" target="_blank" rel="noopener" data-wa="servico-${s.slug}">Me mostra onde estou perdendo venda <span class="arr" aria-hidden="true">→</span></a>
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="trabalho-title">
  <div class="container">
    <div class="section-head">
      <h2 class="h2" id="trabalho-title">O trabalho</h2>
    </div>
    ${s.works.map(work).join('\n    ')}
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="recebe-title">
  <div class="container">
    <div class="section-head reveal">
      <h2 class="h2" id="recebe-title">O que você recebe</h2>
    </div>
    <ul class="receive" data-stagger>
      ${s.deliverables.map((d) => `<li class="reveal">${esc(d)}</li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="funciona-title">
  <div class="container">
    <div class="section-head reveal">
      <h2 class="h2" id="funciona-title">Como funciona</h2>
    </div>
    <ol class="how" data-stagger>
      ${s.steps.map((st, i) => `<li class="step reveal"><span class="step-num">0${i + 1}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></li>`).join('\n      ')}
    </ol>
    <p class="deadline">Prazo: ${esc(s.deadline)}</p>
  </div>
</section>

<section class="section" style="padding-top:0" aria-labelledby="faq-title">
  <div class="container">
    <div class="section-head reveal">
      <h2 class="h2" id="faq-title">Perguntas rápidas</h2>
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
