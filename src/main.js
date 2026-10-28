// Site behaviour: analytics events, nav, smooth scroll (Lenis), reveals (Motion),
// hero parallax, magnetic buttons, spotlight cards, marquee fill, sticky process,
// counters and the floating WhatsApp button. Everything degrades to the final
// state under prefers-reduced-motion.
(function () {
  var M = window.Motion || {};
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  // inView helper: Motion's inView when available, IntersectionObserver otherwise
  function inView(target, cb, opts) {
    opts = opts || {};
    // Motion passes the IntersectionObserverEntry (v11) or the element (v12+)
    if (M.inView) return M.inView(target, function (a) { return cb(a && a.nodeType ? a : a.target); }, { amount: opts.amount || 0, margin: opts.margin || '0px 0px -10% 0px' });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { var leave = cb(e.target); if (typeof leave !== 'function') io.unobserve(e.target); else e.target.__leave = leave; }
        else if (e.target.__leave) { e.target.__leave(); e.target.__leave = null; }
      });
    }, { rootMargin: opts.margin || '0px 0px -10% 0px' });
    $$(target).forEach(function (el) { io.observe(el); });
  }

  // ---------- analytics ----------
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  document.addEventListener('click', function (e) {
    var wa = e.target.closest('[data-wa]');
    if (wa) window.va('event', { name: 'WhatsApp Click', data: { origin: wa.dataset.wa, page: location.pathname } });
    var cv = e.target.closest('[data-cv]');
    if (cv) window.va('event', { name: 'CV Download', data: { origin: cv.dataset.cv, page: location.pathname } });
  });

  // ---------- smooth scroll (desktop, motion allowed) ----------
  if (!reduce && finePointer) {
    var s = document.createElement('script');
    s.src = '/assets/vendor/lenis-1.1.20.min.js';
    s.onload = function () {
      if (!window.Lenis) return;
      var lenis = new window.Lenis({ autoRaf: true, anchors: { offset: -88 } });
      window.__lenis = lenis;
    };
    document.head.appendChild(s);
  }

  // ---------- nav ----------
  var nav = $('.nav');
  var toggle = $('.nav-toggle');
  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('.nav-links a', nav).forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }
  // sliding pill under the link of the section in view
  var pill = $('.nav-pill');
  var spyLinks = $$('[data-spy]');
  function movePill(link) {
    spyLinks.forEach(function (l) { l.classList.toggle('is-active', l === link); });
    if (!pill) return;
    if (!link) { pill.classList.remove('is-on'); return; }
    pill.style.width = link.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + link.offsetLeft + 'px)';
    pill.classList.add('is-on');
  }
  var spySections = spyLinks.map(function (l) { return document.getElementById(l.dataset.spy); }).filter(Boolean);
  if (spySections.length) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var current = null;
      spySections.forEach(function (sec) { if (visible[sec.id]) current = sec.id; });
      movePill(current ? $('[data-spy="' + current + '"]') : null);
    }, { rootMargin: '-45% 0px -50% 0px' });
    spySections.forEach(function (sec) { spy.observe(sec); });
  }

  // ---------- reveals ----------
  $$('[data-stagger]').forEach(function (group) {
    $$(':scope > .reveal', group).forEach(function (el, i) { el.style.setProperty('--d', i * 80 + 'ms'); });
  });
  // H2: give each word the index of the line it sits on, then reveal by line
  function markLines(h) {
    var tops = [];
    $$('.wi', h).forEach(function (wi) {
      var top = wi.parentNode.offsetTop;
      var line = tops.indexOf(top);
      if (line === -1) { tops.push(top); line = tops.length - 1; }
      wi.style.setProperty('--line', line);
    });
  }
  var splits = $$('.split');
  splits.forEach(markLines);
  if (reduce) {
    $$('.reveal, .split').forEach(function (el) { el.classList.add('in'); });
  } else {
    inView('.reveal', function (el) { el.classList.add('in'); });
    inView('.split', function (el) { el.classList.add('in'); });
  }

  // ---------- pause loops off screen ----------
  var loopIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('paused', !e.isIntersecting); });
  });
  $$('[data-loop]').forEach(function (el) { el.classList.add('paused'); loopIO.observe(el); });

  // ---------- hero parallax ----------
  var hero = $('.hero');
  if (hero && finePointer && !reduce) {
    var raf = 0, px = 0, py = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(function () {
        hero.style.setProperty('--px', px.toFixed(3));
        hero.style.setProperty('--py', py.toFixed(3));
        raf = 0;
      });
    });
    hero.addEventListener('pointerleave', function () { hero.style.setProperty('--px', 0); hero.style.setProperty('--py', 0); });
  }

  // ---------- magnetic buttons (up to 6px) ----------
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.transform = 'translate(' + (x * 6).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  // ---------- spotlight: glow + lit border follow the cursor ----------
  if (finePointer) {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.spot');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // ---------- browser mockup: scroll distance for the full-page print ----------
  $$('.browser--front').forEach(function (b) {
    var page = $('.browser-page', b), view = $('.browser-view', b);
    function set() { b.style.setProperty('--scroll-y', Math.min(0, view.clientHeight - page.offsetHeight) + 'px'); }
    $$('img', page).forEach(function (img) { if (!img.complete) img.addEventListener('load', set); });
    set();
    window.addEventListener('resize', set);
  });

  // ---------- video timeline: playhead travels the full track ----------
  $$('.timeline-wrap').forEach(function (t) {
    function set() { t.style.setProperty('--tl-w', (t.clientWidth - 2) + 'px'); }
    set(); window.addEventListener('resize', set);
  });

  // ---------- marquee: each copy must be wider than the viewport ----------
  var track = $('.marquee-track');
  if (track && !reduce) {
    var lists = $$('.marquee-list', track);
    var base = $$('li', lists[0]).map(function (li) { return li.textContent; });
    function fill() {
      while (lists[0].scrollWidth < window.innerWidth + 200) {
        lists.forEach(function (l) {
          base.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; li.className = 'dup'; li.setAttribute('aria-hidden', 'true'); l.appendChild(li); });
        });
      }
    }
    fill();
    window.addEventListener('resize', fill);
  }

  // ---------- process: active step, progress bar, timer ----------
  var steps = $$('.pstep');
  var ills = $$('.ill');
  var progress = $('.steps-progress');
  var desktop = window.matchMedia('(min-width: 961px)');
  function activate(i) {
    steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    ills.forEach(function (il, k) {
      il.classList.toggle('is-active', k === i);
      il.classList.toggle('paused', k !== i);
    });
    if (i === 2) runTimer($('.ill[data-ill="2"] .ill-timer'));
  }
  if (steps.length) {
    var stepIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) activate(+e.target.dataset.step); });
    }, { rootMargin: '-48% 0px -48% 0px' });
    steps.forEach(function (s) { stepIO.observe(s); });
    var list = $('.steps-list');
    function updateProgress() {
      if (!desktop.matches) return;
      var r = list.getBoundingClientRect();
      var p = (window.innerHeight * 0.5 - r.top) / r.height;
      progress.style.setProperty('--progress', Math.max(0, Math.min(1, p)).toFixed(3));
    }
    if (M.scroll && !reduce) M.scroll(updateProgress);
    else { window.addEventListener('scroll', updateProgress, { passive: true }); }
    updateProgress();
    // mobile: each inline illustration runs while on screen, timer included
    inView('.step-ill-m', function (el) { runTimer($('.ill-timer', el)); return function () {}; });
  }
  function runTimer(el) {
    if (!el || reduce || el.__running) return;
    el.__running = true;
    var start = performance.now();
    function tick(now) {
      var t = ((now - start) % 6000) / 6000;          // follows the 6s fly-in loop
      var secs = Math.round(Math.min(1, t / 0.35) * 120);
      el.textContent = '0' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      if (el.closest('.paused')) { el.__running = false; return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- about: counters and sliding dot on career ----------
  $$('[data-count]').forEach(function (el) {
    var to = +el.dataset.count, suffix = el.dataset.suffix || '';
    if (reduce) return;
    el.textContent = '0' + suffix;
    inView(el, function () {
      if (M.animate) M.animate(0, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: function (v) { el.textContent = Math.round(v) + suffix; } });
      else el.textContent = to + suffix;
    });
  });
  var dot = $('.career-dot');
  if (dot) {
    var items = $$('.career li');
    function moveDot(li) { dot.style.setProperty('--dot-y', (li.offsetTop + 24) + 'px'); }
    items.forEach(function (li) { li.addEventListener('pointerenter', function () { moveDot(li); }); li.addEventListener('focus', function () { moveDot(li); }); });
    if (items[0]) moveDot(items[0]);
  }

  // ---------- video case cover: muted highlight loop plays only while on screen ----------
  $$('.vprev').forEach(function (v) {
    if (reduce) return;            // keep the poster
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) {
        if (!v.src) { v.src = v.dataset.src; }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else v.pause();
    }, { rootMargin: '100px' }).observe(v);
  });

  // tabs with a sliding pill (--tab on the tablist); arrow keys move between tabs
  function tabset(tablist, onSelect) {
    var tabs = $$('[role="tab"]', tablist);
    function select(t, focus) {
      tabs.forEach(function (x, k) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
        if (on) tablist.style.setProperty('--tab', k);
      });
      if (focus) t.focus();
      if (onSelect) onSelect(t);
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault(); e.stopPropagation();
        select(tabs[(k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      });
    });
    return { tabs: tabs, select: select };
  }

  // ---------- full-page preview (service page): desktop / phone, each scrolls on its own ----------
  $$('[data-preview]').forEach(function (pv) {
    var ts = tabset($('[role="tablist"]', pv), function (t) {
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      var sc = $('.lp-scroll', panel); if (sc) sc.scrollTop = 0;
    });
    // phones see the phone version first: the desktop print is too small to read there
    if (window.matchMedia('(max-width: 860px)').matches) ts.select(ts.tabs[1]);
  });

  // ---------- case dialog: carousel (swipeable slides) or video (scenes), synced with the list ----------
  // A dialog can have several openers (card cover, a button on the service page); it is set up once.
  var caseOpen = {};
  $$('[data-open-case]').forEach(function (opener) {
    var id = opener.getAttribute('aria-controls');
    if (!(id in caseOpen)) caseOpen[id] = setupCase(document.getElementById(id));
    if (caseOpen[id]) opener.addEventListener('click', caseOpen[id]);
  });
  function setupCase(dlg) {
    if (!dlg || typeof dlg.showModal !== 'function') return null;
    var track = $('.case-track', dlg);
    var video = $('.case-video', dlg);
    var times = video ? dlg.dataset.times.split(',').map(Number) : null;
    var total = video ? times.length : $$('.case-slide', dlg).length;
    var thumbs = $$('.case-thumbs [data-go]', dlg);
    var arc = $$('.case-arc [data-go], .case-arc .arc-row', dlg);
    var count = $('.case-count b', dlg);
    var prev = $('.case-prev', dlg), next = $('.case-next', dlg);
    var current = -1;

    function update(i) {
      if (i === current) return;
      current = i;
      if (count) count.textContent = String(i + 1).padStart(2, '0');
      thumbs.forEach(function (t, k) { if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
      arc.forEach(function (a, k) { a.classList.toggle('is-active', k === i); });
      if (prev) { prev.disabled = i === 0; next.disabled = i === total - 1; }
    }
    // video: jump to the scene start and keep playing; carousel: scroll to the slide
    function go(i, instant) {
      i = Math.max(0, Math.min(total - 1, i));
      if (video) {
        if (!instant) { video.currentTime = times[i] + 0.05; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      } else track.scrollTo({ left: i * track.clientWidth, behavior: instant || reduce ? 'auto' : 'smooth' });
      update(i);
    }
    if (video) {
      video.addEventListener('timeupdate', function () {
        var i = 0;
        times.forEach(function (t, k) { if (video.currentTime >= t) i = k; });
        update(i);
      });
    } else {
      var ticking = 0;
      track.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = requestAnimationFrame(function () { ticking = 0; update(Math.round(track.scrollLeft / track.clientWidth)); });
      }, { passive: true });
    }
    $$('[data-go]', dlg).forEach(function (b) { b.addEventListener('click', function () { go(+b.dataset.go); }); });
    if (prev) {
      prev.addEventListener('click', function () { go(current - 1); });
      next.addEventListener('click', function () { go(current + 1); });
    }
    dlg.addEventListener('keydown', function (e) {
      if (video) return;   // video: the player's own keys only
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    });
    // click on the backdrop closes
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      root.classList.remove('modal-open');
      if (video) video.pause();
      if (window.__lenis) window.__lenis.start();
    });
    if (!video) window.addEventListener('resize', function () { if (dlg.open) go(current, true); });

    // metric tabs (now / months later)
    var metricTabs = tabset($('[role="tablist"]', dlg));

    return function open() {
      if (window.__lenis) window.__lenis.stop();
      root.classList.add('modal-open');
      dlg.showModal();
      current = -1;
      go(0, true);
      if (video) {
        video.currentTime = 0;
        var p = video.play(); if (p && p.catch) p.catch(function () {});
      }
      if (metricTabs.tabs[0]) metricTabs.select(metricTabs.tabs[0]);
      $$('.case-shell, .case-info', dlg).forEach(function (el) { el.scrollTop = 0; });
      window.va('event', { name: 'Case Open', data: { case: dlg.id } });
    };
  }

  // ---------- floating WhatsApp (mobile): after the hero, gone at the final CTA ----------
  var wa = $('.wa-float');
  var heroEl = $('.hero, .svc-top'), cta = $('#cta-final');
  if (wa && heroEl) {
    var pastHero = false, atCta = false;
    function sync() { wa.classList.toggle('is-visible', pastHero && !atCta); }
    new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; sync(); }).observe(heroEl);
    if (cta) new IntersectionObserver(function (e) { atCta = e[0].isIntersecting; sync(); }).observe(cta);
  }
})();
