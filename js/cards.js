// Floating proof card + connector line (desktop only)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function iconChip(ic) {
  const img = ic.src
    ? `<img src="${esc(ic.src)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('initials');this.parentNode.style.background='#1E2A24';this.parentNode.textContent='${esc(ic.name.slice(0, 2))}'">`
    : '';
  const cls = ic.src ? '' : 'initials';
  const style = ic.src ? '' : `style="background:${esc(ic.bg || '#1E2A24')};--fg:${esc(ic.fg || '#fff')}"`;
  return `<div class="icon-chip"><div class="icon-img ${cls}" ${style}>${img || esc(ic.initials || ic.name.slice(0, 2))}</div><div class="icon-name">${esc(ic.name)}</div></div>`;
}

export class Cards {
  constructor({ el, connector, path, defs, onOpen, mascot, sheet }) {
    Object.assign(this, { el, connector, path, defs, onOpen, mascot, sheet });
    this.ctx = { lang: 'en', ui: {}, t: (v) => v };
    this.current = null; this.anchor = null; this.pinned = null; this.hideTimer = null;
    el.addEventListener('mouseenter', () => this.cancelHide());
    el.addEventListener('mouseleave', () => { if (!this.pinned) this.scheduleHide(); });
  }
  setContext(ctx) { this.ctx = ctx; if (this.current) this.render(this.current); }

  render(id) {
    const d = this.defs[id]; const t = this.ctx.t;
    this.el.dataset.color = d.color || 'mkt';
    this.el.classList.toggle('is-icons', d.type === 'icons');
    if (d.type === 'icons') {
      this.el.innerHTML = `<div class="icon-row">${d.icons.map((i) => iconChip(i)).join('')}</div>`;
    } else if (d.type === 'tags') {
      this.el.innerHTML = `<p class="card-title" style="margin-top:0">${esc(t(d.title))}</p><div class="tag-row">${d.tags.map((tg, i) => `<button class="tag-btn" data-i="${i}" style="--tb:var(--${esc(tg.color)})">${esc(t(tg.label))}</button>`).join('')}</div>`;
      this.el.querySelectorAll('.tag-btn').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.toggleFilter(d.tags[+b.dataset.i], b); }));
    } else {
      const fit = d.thumbFit === 'contain' ? 'contain' : '';
      const bg = d.thumbBg ? `style="background:${esc(d.thumbBg)}"` : '';
      this.el.innerHTML = `
        <div class="card-thumb ${fit}" ${bg}><img src="${esc(d.thumb)}" alt="" loading="lazy"><span class="card-tag">${esc(this.ctx.ui.proof || 'proof')}</span></div>
        <p class="card-title">${esc(t(d.title))}</p>
        <p class="card-sub">${esc(t(d.tag))}</p>
        <p class="card-blurb">${esc(t(d.blurb))}</p>
        <button class="btn card-open" type="button">${esc(this.ctx.ui.open || 'Open')} ↗</button>`;
      this.el.querySelector('.card-open').addEventListener('click', (e) => { e.stopPropagation(); this.onOpen(id); });
      this.el.querySelector('.card-thumb').addEventListener('click', (e) => { e.stopPropagation(); this.onOpen(id); });
    }
  }

  toggleFilter(tag, btn) {
    const on = btn.classList.toggle('is-on');
    this.el.querySelectorAll('.tag-btn').forEach((b) => { if (b !== btn) b.classList.remove('is-on'); });
    this.sheet.classList.toggle('is-filtering', on);
    this.sheet.querySelectorAll('.hot').forEach((h) => h.classList.toggle('is-lit', on && tag.targets.includes(h.dataset.card)));
  }

  show(anchor, id) {
    this.cancelHide();
    if (this.pinned && this.pinned !== anchor) return; // pinned card stays
    if (this.current !== id) { this.render(id); this.current = id; }
    document.querySelectorAll('.hot.is-active').forEach((h) => h.classList.remove('is-active'));
    anchor.classList.add('is-active');
    this.anchor = anchor;
    this.el.style.setProperty('--tilt', `${((id.length % 3) - 1) * 1.2}deg`);
    this.el.setAttribute('aria-hidden', 'false');
    this.el.classList.add('is-visible');
    this.connector.classList.add('is-visible');
    this.mascot?.classList.add('is-look');
    this.position();
  }

  position() {
    if (!this.anchor) return;
    const d = this.defs[this.current];
    const a = this.anchor.getBoundingClientRect();
    const s = this.sheet.getBoundingClientRect();
    const sx = window.scrollX, sy = window.scrollY;
    const cw = this.el.offsetWidth, ch = this.el.offsetHeight;
    const gap = 36;
    const leftGutter = s.left, rightGutter = window.innerWidth - s.right;
    let side = d.side || 'right';
    if (side === 'right' && rightGutter < cw + gap && leftGutter >= cw + gap) side = 'left';
    if (side === 'left' && leftGutter < cw + gap && rightGutter >= cw + gap) side = 'right';
    const fits = (side === 'left' ? leftGutter : rightGutter) >= cw + gap;

    let x = side === 'left' ? s.left - cw - gap : s.right + gap;
    if (!fits) x = side === 'left' ? Math.max(8, a.left - 40) : Math.min(window.innerWidth - cw - 8, a.right - cw + 40);
    let y = a.top + a.height / 2 - ch / 2;
    y = Math.max(72, Math.min(window.innerHeight - ch - 12, y));
    if (!fits) y = a.bottom + 12;

    this.el.style.left = `${x + sx}px`;
    this.el.style.top = `${y + sy}px`;
    this.el.dataset.side = side;

    // connector from line edge to card edge
    const ax = side === 'left' ? a.left : a.right;
    const ay = a.top + a.height / 2;
    const cx = side === 'left' ? x + cw : x;
    const cy = y + ch / 2;
    const bend = (cx - ax) * 0.5;
    this.path.setAttribute('d', `M${ax + sx},${ay + sy} C${ax + bend + sx},${ay + sy} ${cx - bend + sx},${cy + sy} ${cx + sx},${cy + sy}`);
    this.connector.style.setProperty('--c', `var(--${d.color || 'mkt'})`);
    this.connector.style.height = `${document.documentElement.scrollHeight}px`;
  }
  reposition() { if (this.el.classList.contains('is-visible')) this.position(); }

  scheduleHide() { if (this.pinned) return; this.cancelHide(); this.hideTimer = setTimeout(() => this.hideNow(), 200); }
  cancelHide() { clearTimeout(this.hideTimer); this.hideTimer = null; }
  hideNow() {
    if (this.pinned) return;
    this.el.classList.remove('is-visible'); this.el.setAttribute('aria-hidden', 'true');
    this.connector.classList.remove('is-visible');
    this.mascot?.classList.remove('is-look');
    document.querySelectorAll('.hot.is-active').forEach((h) => h.classList.remove('is-active'));
    this.anchor = null;
  }
  pin(anchor, id) {
    if (this.pinned === anchor) { this.unpin(); return; }
    this.unpin();
    this.pinned = anchor; anchor.classList.add('is-pinned');
    this.show(anchor, id);
  }
  unpin() {
    if (!this.pinned) return;
    this.pinned.classList.remove('is-pinned'); this.pinned = null;
    this.sheet.classList.remove('is-filtering');
    this.sheet.querySelectorAll('.is-lit').forEach((h) => h.classList.remove('is-lit'));
    this.hideNow();
  }
  isPinned(anchor) { return this.pinned === anchor; }
}
