// Popup (desktop modal) / bottom sheet (mobile) that shows the full proof
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Popup {
  constructor({ el, backdrop, defs, onClose }) {
    Object.assign(this, { el, backdrop, defs, onClose });
    this.ctx = { lang: 'en', ui: {}, t: (v) => v };
    this.body = el.querySelector('#popupBody');
    el.querySelector('#popupClose').addEventListener('click', () => this.close());
    backdrop.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) this.close(); });
    // swipe down to close (mobile)
    let y0 = null;
    el.addEventListener('touchstart', (e) => { if (this.body.scrollTop === 0) y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchmove', (e) => { if (y0 !== null && e.touches[0].clientY - y0 > 90) { y0 = null; this.close(); } }, { passive: true });
    el.addEventListener('touchend', () => { y0 = null; });
  }
  setContext(ctx) { this.ctx = ctx; if (!this.el.hidden && this.currentId) this.open(this.currentId, { silent: true }); }

  open(id, { silent } = {}) {
    const d = this.defs[id]; if (!d || d.type !== 'project') return;
    const t = this.ctx.t;
    this.currentId = id;
    this.el.dataset.color = d.color || 'mkt';
    this.el.querySelector('#popupTitle').textContent = t(d.title);
    this.el.querySelector('#popupTag').textContent = t(d.tag);
    this.body.innerHTML = d.popup.map((b, i) => this.block(b, i)).join('');
    this.wire();
    this.el.hidden = false; this.backdrop.hidden = false;
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (!silent) history.replaceState(null, '', `#${id}`);
    this.el.querySelector('#popupClose').focus({ preventScroll: true });
  }
  close() {
    this.el.hidden = true; this.backdrop.hidden = true;
    this.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.body.innerHTML = '';
    this.currentId = null;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    this.onClose?.();
  }

  h(v) { return v ? `<h3 class="pb-h">${esc(this.ctx.t(v))}</h3>` : ''; }

  block(b, i) {
    const t = this.ctx.t;
    switch (b.type) {
      case 'text': return `<div>${this.h(b.heading)}<p class="pb-text">${esc(t(b.body))}</p></div>`;
      case 'note': return `<p class="note">${esc(t(b.body))}</p>`;
      case 'gallery':
        return `<div class="gal" data-gal="${i}">
          <div class="gal-main"><img src="${esc(b.images[0].src)}" alt="${esc(t(b.images[0].cap))}">
            ${b.images.length > 1 ? `<button class="gal-nav prev" type="button" aria-label="Previous">‹</button><button class="gal-nav next" type="button" aria-label="Next">›</button>` : ''}
          </div>
          <p class="gal-cap">${esc(t(b.images[0].cap))}</p>
          ${b.images.length > 1 ? `<div class="gal-thumbs">${b.images.map((im, k) => `<button type="button" data-k="${k}" class="${k === 0 ? 'is-on' : ''}"><img src="${esc(im.src.replace('.webp', '.thumb.webp'))}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>`;
      case 'grid':
        return `<div>${this.h(b.heading)}<div class="grid" style="--cols:${b.cols || 3}">${b.images.map((s) => `<img src="${esc(s)}" alt="" loading="lazy">`).join('')}</div></div>`;
      case 'tabs':
        return `<div data-tabs>${this.h(b.heading)}<div class="tabs-bar">${b.tabs.map((tb, k) => `<button type="button" data-k="${k}" class="${k === 0 ? 'is-on' : ''}">${esc(t(tb.label))}</button>`).join('')}</div><div class="tabs-img"><img src="${esc(b.tabs[0].src)}" alt=""></div></div>`;
      case 'video':
        return `<div>${this.h(b.cap)}<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(b.youtube)}?rel=0" title="Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></div>`;
      case 'iframe':
        return `<div><div class="embed"><iframe src="${esc(b.src)}" title="Embed" loading="lazy" allowfullscreen allow="xr-spatial-tracking; gyroscope; accelerometer"></iframe></div>
          ${b.link ? `<div class="embed-link"><a class="btn" href="${esc(b.link)}" target="_blank" rel="noopener">${esc(t(b.label))} ↗</a></div>` : ''}</div>`;
      case 'compare':
        return `<div>${this.h(b.heading)}<div class="cmp" style="--x:50%">
          <img class="before" src="${esc(b.before)}" alt=""><img class="after" src="${esc(b.after)}" alt="">
          <div class="cmp-handle"></div>
          <span class="cmp-label l">${esc(t(b.labels.before))}</span><span class="cmp-label r">${esc(t(b.labels.after))}</span>
        </div></div>`;
      case 'steps':
        return `<div>${this.h(b.heading)}<div class="steps">${b.steps.map((s) => `<div class="step">${esc(t(s))}</div>`).join('')}</div></div>`;
      case 'framework':
        return `<div class="fw"><img src="${esc(b.image)}" alt=""><ol>${b.points.map((p) => `<li><span class="k">${esc(p.k)}</span><span>${esc(t(p))}</span></li>`).join('')}</ol></div>`;
      case 'links':
        return `<div class="links">${b.links.map((l) => `<a class="btn ${l.pending ? 'pending' : ''}" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(t(l.label))}${l.pending ? ' · soon' : ' ↗'}</a>`).join('')}</div>`;
      default: return '';
    }
  }

  wire() {
    // galleries
    this.body.querySelectorAll('.gal').forEach((g) => {
      const def = this.defs[this.currentId].popup[+g.dataset.gal];
      const img = g.querySelector('.gal-main img'); const cap = g.querySelector('.gal-cap');
      const thumbs = [...g.querySelectorAll('.gal-thumbs button')];
      let k = 0;
      const go = (n) => {
        k = (n + def.images.length) % def.images.length;
        img.src = def.images[k].src; img.alt = this.ctx.t(def.images[k].cap); cap.textContent = this.ctx.t(def.images[k].cap);
        thumbs.forEach((b, i) => b.classList.toggle('is-on', i === k));
        thumbs[k]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      };
      g.querySelector('.prev')?.addEventListener('click', () => go(k - 1));
      g.querySelector('.next')?.addEventListener('click', () => go(k + 1));
      thumbs.forEach((b) => b.addEventListener('click', () => go(+b.dataset.k)));
      g.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(k - 1); if (e.key === 'ArrowRight') go(k + 1); });
    });
    // tabs
    this.body.querySelectorAll('[data-tabs]').forEach((w, idx) => {
      const blocks = this.defs[this.currentId].popup.filter((b) => b.type === 'tabs');
      const def = blocks[idx]; const img = w.querySelector('.tabs-img img');
      w.querySelectorAll('.tabs-bar button').forEach((b) => b.addEventListener('click', () => {
        w.querySelectorAll('.tabs-bar button').forEach((x) => x.classList.remove('is-on')); b.classList.add('is-on');
        img.src = def.tabs[+b.dataset.k].src;
      }));
    });
    // compare sliders
    this.body.querySelectorAll('.cmp').forEach((c) => {
      const set = (clientX) => { const r = c.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width)); c.style.setProperty('--x', `${x * 100}%`); };
      let down = false;
      c.addEventListener('pointerdown', (e) => { down = true; c.setPointerCapture(e.pointerId); set(e.clientX); });
      c.addEventListener('pointermove', (e) => { if (down) set(e.clientX); });
      c.addEventListener('pointerup', () => { down = false; });
      c.addEventListener('pointercancel', () => { down = false; });
    });
  }
}
