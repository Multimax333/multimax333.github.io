// Builds the resume sheet DOM from resume.<lang>.json
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let proofLabel = 'PROOF';
function hot(card, inner, cls = '') {
  if (!card) return `<span class="${cls}">${inner}</span>`;
  return `<span class="hot ${cls}" data-card="${esc(card)}">${inner}<span class="tap">${esc(proofLabel)}</span></span>`;
}

function section(sec) {
  let body = '';
  switch (sec.type) {
    case 'text':
      body = sec.items.map((it) => `<p class="r-text">${hot(it.card, esc(it.text))}</p>`).join('');
      break;
    case 'jobs':
      body = sec.items.map((j) => {
        const head = `<div class="r-job-line"><div>${hot(j.card, `<span class="r-role">${esc(j.role)}</span><span class="r-org">${esc(j.org)}</span>`)}</div><span class="r-date">${esc(j.date)}</span></div>`;
        const sub = j.sub ? `<p class="r-sub"><span>${esc(j.sub)}</span><span>${esc(j.subdate || '')}</span></p>` : '';
        const desc = j.desc ? `<p class="r-desc">${esc(j.desc)}</p>` : '';
        const bullets = j.bullets ? `<ul class="r-bullets">${j.bullets.map((b) => `<li>${hot(b.card, esc(b.text))}</li>`).join('')}</ul>` : '';
        return `<div class="r-job">${head}${sub}${desc}${bullets}</div>`;
      }).join('');
      break;
    case 'list':
      body = `<ul class="r-list">${sec.items.map((it) => `<li>${hot(it.card, `${it.label ? `<b>${esc(it.label)}</b> ` : ''}${esc(it.text)}`)}</li>`).join('')}</ul>`;
      break;
    case 'edu':
      body = sec.items.map((it) => `<p class="r-edu">${hot(it.card, `<b>${esc(it.title)}</b>`)}<span>${esc(it.sub)}</span></p>`).join('');
      break;
  }
  return `<section class="r-section" id="sec-${esc(sec.id)}"><h3>${esc(sec.heading)}</h3>${body}</section>`;
}

export function renderResume(root, r) {
  proofLabel = (r.ui && r.ui.proof ? r.ui.proof : 'proof').toUpperCase();
  const byId = Object.fromEntries(r.sections.map((s) => [s.id, s]));
  const contact = r.contact.map((c) => c.href ? `<a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.text)}</a>` : `<span>${esc(c.text)}</span>`).join('<span class="sep">·</span>');

  const head = `
    <header class="r-head">
      <div class="r-photo ${r.photoCard ? 'hot' : ''}" ${r.photoCard ? `data-card="${esc(r.photoCard)}"` : ''}>
        <img src="assets/img/about/profile.webp" alt="Sahapat Jundum" width="112" height="112">
      </div>
      <div>
        <h1 class="r-name">${esc(r.name)}</h1>
        <p class="r-title ${r.titleCard ? 'hot' : ''}" ${r.titleCard ? `data-card="${esc(r.titleCard)}"` : ''}>${esc(r.title)}</p>
        <p class="r-contact">${contact}</p>
        <span class="r-badge">${esc(r.badge)}</span>
      </div>
    </header>`;

  const main = ['profile', 'experience', 'creative', 'side'].filter((k) => byId[k]).map((k) => section(byId[k])).join('');
  const cols = `
    <div class="r-cols">
      <div>${byId.skills ? section(byId.skills) : ''}</div>
      <div>${byId.tools ? section(byId.tools) : ''}</div>
      <div>${byId.education ? section(byId.education) : ''}${byId.languages ? section(byId.languages) : ''}</div>
    </div>`;

  root.innerHTML = head + main + cols;
}
