// Vercel Analytics queue (script loads async from /_vercel/insights/script.js)
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

document.documentElement.classList.add('js');

// Track every WhatsApp click with its origin, and CV downloads
document.addEventListener('click', function (e) {
  var wa = e.target.closest('[data-wa]');
  if (wa) window.va('event', { name: 'WhatsApp Click', data: { origin: wa.dataset.wa, page: location.pathname } });
  var cv = e.target.closest('[data-cv]');
  if (cv) window.va('event', { name: 'CV Download', data: { origin: cv.dataset.cv, page: location.pathname } });
});

// Nav: transparent at top, solid after scrolling; mobile menu toggle
var nav = document.querySelector('.nav');
var toggle = document.querySelector('.nav-toggle');
function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
if (toggle) {
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Reveal on scroll: fade + 12px rise, 80ms stagger inside [data-stagger], once
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var items = document.querySelectorAll('.reveal');
document.querySelectorAll('[data-stagger]').forEach(function (group) {
  group.querySelectorAll(':scope > .reveal').forEach(function (el, i) { el.style.setProperty('--d', i * 80 + 'ms'); });
});
if (reduce || !('IntersectionObserver' in window)) {
  items.forEach(function (el) { el.classList.add('in'); });
} else {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
}
