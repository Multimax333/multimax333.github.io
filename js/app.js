// Interactive resume: renders the sheet from JSON, floats proof cards on hover,
// opens a popup (desktop) / bottom sheet (mobile) with the work.
import { renderResume } from './resume.js';
import { Cards } from './cards.js';
import { Popup } from './popup.js';

const VERSION = '2026-11-11d'; // bump when data/*.json changes
const state = { lang: 'en', resume: null, cards: null };
const $ = (s, r = document) => r.querySelector(s);
const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

function t(v) { return typeof v === 'string' ? v : (v?.[state.lang] ?? v?.en ?? ''); }

async function setLang(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
  state.resume = await loadJSON(`data/resume.${lang}.json?v=${VERSION}`);
  renderResume($('#sheet'), state.resume, state.cards);
  $('#langToggle').textContent = state.resume.ui.lang;
  $('#downloadBtn').textContent = state.resume.ui.download;
  $('#downloadBtn').href = `assets/pdf/Sahapat_Jundum_CV.pdf?v=${VERSION}`;
  cards.setContext({ lang, ui: state.resume.ui, t });
  popup.setContext({ lang, ui: state.resume.ui, t });
  wireHotLines();
}

let cards, popup;

function wireHotLines() {
  const hots = document.querySelectorAll('.hot');
  hots.forEach((el, i) => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    const id = el.dataset.card;
    const def = state.cards[id];
    if (!def) return;
    el.dataset.color = def.color || 'mkt';
    el.classList.add('pulse');
    el.style.animationDelay = `${i * 60}ms`;

    el.addEventListener('mouseenter', () => { if (!isMobile()) cards.show(el, id); });
    el.addEventListener('mouseleave', () => { if (!isMobile()) cards.scheduleHide(); });
    el.addEventListener('focus', () => { if (!isMobile()) cards.show(el, id); });
    el.addEventListener('blur', () => { if (!isMobile()) cards.scheduleHide(); });
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (isMobile()) { popup.open(id); return; }
      if (def.type === 'icons' || def.type === 'tags') { cards.pin(el, id); return; }
      // desktop: click on line pins; second click opens
      if (cards.isPinned(el)) popup.open(id); else cards.pin(el, id);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (def.type === 'project') popup.open(id); else cards.pin(el, id); }
    });
  });
}

function showHint() {
  let seen = false;
  try { seen = localStorage.getItem('hintSeen') === '1'; } catch {}
  if (seen) return;
  const h = $('#hint');
  h.textContent = isMobile() ? state.resume.ui.hintMobile : state.resume.ui.hint;
  h.hidden = false;
  setTimeout(() => { h.hidden = true; try { localStorage.setItem('hintSeen', '1'); } catch {} }, 4500);
}

function openFromHash() {
  const id = location.hash.replace('#', '');
  if (id && state.cards[id] && state.cards[id].type === 'project') popup.open(id, { silent: true });
}

// mascot: eyes follow pointer a little
function wireMascot() {
  const m = $('#mascot'); if (!m) return;
  const eyes = m.querySelector('.m-eyes');
  window.addEventListener('pointermove', (e) => {
    const r = m.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + 60)) / 500));
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + 44)) / 400));
    eyes.style.transform = `translate(${dx * 3}px, ${dy * 2.5}px)`;
  }, { passive: true });
}

(async function init() {
  state.cards = await loadJSON(`data/cards.json?v=${VERSION}`);
  cards = new Cards({ el: $('#card'), connector: $('#connector'), path: $('#connectorPath'), defs: state.cards, onOpen: (id) => popup.open(id), mascot: $('#mascot'), sheet: $('#sheet') });
  popup = new Popup({ el: $('#popup'), backdrop: $('#popupBackdrop'), defs: state.cards, onClose: () => cards.hideNow() });

  let lang = 'en';
  try { lang = localStorage.getItem('lang') || (navigator.language.startsWith('th') ? 'th' : 'en'); } catch {}
  await setLang(lang);

  $('#langToggle').addEventListener('click', () => setLang(state.lang === 'en' ? 'th' : 'en'));
  window.addEventListener('hashchange', openFromHash);
  window.addEventListener('resize', () => cards.reposition());
  window.addEventListener('scroll', () => cards.reposition(), { passive: true });
  document.addEventListener('click', (e) => { if (!e.target.closest('.hot') && !e.target.closest('.card')) cards.unpin(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#popup').hidden) { cards.unpin(); cards.hideNow(); } });

  wireMascot();
  showHint();
  openFromHash();
})();
