#!/usr/bin/env node
/* ============================================================
   NORDWISE — build.js
   Genera la web completa en /public a partir de /content.
   No necesitas tocar este archivo para editar la web:
   todo el contenido vive en /content (archivos .md).
   Uso:  node build.js   (o doble clic en build.command)
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT  = path.join(ROOT, 'public');
const SITE = 'https://nordwise.net';
const YEAR = new Date().getFullYear();

/* ── Utilidades ──────────────────────────────────────────── */
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
/* Títulos: "línea uno | línea dos" → salto de línea */
const title2html = s => String(s ?? '').split('|').map(t => inline(t.trim())).join('<br>');

/* ── Markdown → HTML (subconjunto suficiente) ────────────── */
function md(src) {
  const lines = String(src ?? '').replace(/\r/g, '').split('\n');
  let html = [], i = 0;
  const flushP = buf => { if (buf.length) { html.push('<p>' + inline(buf.join(' ')) + '</p>'); buf.length = 0; } };
  let p = [];
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { flushP(p); i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { flushP(p); const h = m[1].length + 1; html.push(`<h${h}>${inline(m[2])}</h${h}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { flushP(p); html.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(l)) {
      flushP(p); const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      html.push('<blockquote>' + md(q.join('\n')) + '</blockquote>'); continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      flushP(p); const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      html.push('<ul>' + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ul>'); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      flushP(p); const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i++; }
      html.push('<ol>' + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>'); continue;
    }
    if (/^\s*\|.*\|\s*$/.test(l)) {
      flushP(p); const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      let out = '<div class="table-wrap"><table>';
      rows.forEach((r, ri) => {
        if (/^\s*\|[\s:-]+\|\s*$/.test(r)) return;
        const tag = ri === 0 ? 'th' : 'td';
        out += '<tr>' + cells(r).map(c => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>';
      });
      html.push(out + '</table></div>'); continue;
    }
    p.push(l.trim()); i++;
  }
  flushP(p);
  return html.join('\n');
}

/* ── Frontmatter (subconjunto YAML) ──────────────────────── */
function parseFile(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {}; let curList = null, curObj = null;
  for (const line of m[1].split('\n')) {
    if (/^\s*(#|$)/.test(line)) continue;
    let mm;
    if ((mm = line.match(/^\s+-\s+(.*)$/)) && curList) {
      const rest = mm[1];
      const kv = rest.match(/^([a-z][a-z0-9_]*):\s*(.*)$/);
      if (kv) { curObj = {}; curObj[kv[1]] = kv[2]; curList.push(curObj); }
      else { curObj = null; curList.push(rest); }
      continue;
    }
    if ((mm = line.match(/^\s+([a-z][a-z0-9_]*):\s*(.*)$/)) && curObj) { curObj[mm[1]] = mm[2]; continue; }
    if ((mm = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/))) {
      const k = mm[1], v = mm[2];
      if (v === '') { curList = []; data[k] = curList; curObj = null; }
      else { data[k] = v; curList = null; curObj = null; }
    }
  }
  return { data, body: m[2] || '' };
}

/* ── Carga de contenido ──────────────────────────────────── */
function loadDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map(f => ({ file: path.join(dir, f), ...parseFile(path.join(dir, f)) }));
}

const CFG = {};
for (const lang of ['es', 'en']) {
  CFG[lang] = parseFile(path.join(ROOT, 'content/config', lang + '.md')).data;
}

const pages = [];
for (const lang of ['es', 'en']) {
  for (const p of loadDir(path.join(ROOT, 'content', lang))) {
    if (!p.data.url) { console.warn('⚠ Sin url:, se omite → ' + p.file); continue; }
    p.lang = lang; pages.push(p);
  }
}
const posts = [];
for (const lang of ['es', 'en']) {
  for (const p of loadDir(path.join(ROOT, 'content/blog', lang))) {
    if (!p.data.slug || !p.data.title) { console.warn('⚠ Post sin slug/title, se omite → ' + p.file); continue; }
    p.lang = lang;
    p.data.url = (lang === 'en' ? '/en/blog/' : '/blog/') + p.data.slug + '/';
    p.data.layout = 'post';
    p.data.ref = p.data.ref || ('post-' + p.data.slug);
    posts.push(p);
  }
}
posts.sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));
const all = pages.concat(posts);

/* Emparejado ES↔EN por "ref:" para hreflang y selector de idioma */
function altOf(p) {
  if (!p.data.ref) return null;
  return all.find(x => x.data.ref === p.data.ref && x.lang !== p.lang) || null;
}

/* ── Helpers de UI ───────────────────────────────────────── */
const split3 = s => String(s).split('|').map(x => x.trim());
const fmtDate = (d, lang) => {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};
const readMins = body => Math.max(1, Math.round(String(body).split(/\s+/).length / 200));

function eyebrow(txt, center) {
  return txt ? `<div class="eyebrow${center ? ' center' : ''}">${inline(txt)}</div>` : '';
}
function sectionHead(tag, title, lead) {
  let h = '<div class="sec-head">' + eyebrow(tag, true);
  if (title) h += `<h2>${title2html(title)}</h2>`;
  if (lead) h += `<p class="sec-lead">${inline(lead)}</p>`;
  return h + '</div>';
}

/* ── Bloques de página ───────────────────────────────────── */
function navHtml(p, cfg) {
  const alt = altOf(p);
  const langHref = alt ? alt.data.url : (p.lang === 'es' ? '/en/' : '/');
  const langLabel = p.lang === 'es' ? 'EN' : 'ES';
  const items = (cfg.nav || []).map(n => {
    const [label, href] = split3(n);
    const here = p.data.url === href || (href !== '/' && href !== '/en/' && p.data.url.startsWith(href));
    return `<a href="${href}"${here ? ' class="on" aria-current="page"' : ''}>${esc(label)}</a>`;
  }).join('');
  return `
<header class="nw-nav" id="nav">
  <a class="nw-logo" href="${p.lang === 'en' ? '/en/' : '/'}" aria-label="Nordwise">Nord<span>wise</span></a>
  <nav class="nw-links" id="nav-links">${items}</nav>
  <div class="nw-nav-right">
    <a class="nw-lang" href="${langHref}" title="${p.lang === 'es' ? 'English version' : 'Versión en español'}">${langLabel}</a>
    <a class="btn-p btn-nav" href="${cfg.form_url}" target="_blank" rel="noopener">${esc(cfg.nav_cta)}</a>
    <button class="nw-burger" id="burger" aria-label="Menú" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</header>`;
}

function heroHtml(p, cfg) {
  const d = p.data;
  if (!d.hero_title) return '';
  const home = d.layout === 'home';
  const cta1 = d.hero_cta ? `<a class="btn-p btn-big" href="${d.hero_cta_href || cfg.form_url}" ${d.hero_cta_href ? '' : 'target="_blank" rel="noopener"'}>${esc(d.hero_cta)} <span class="arr">→</span></a>` : '';
  const cta2 = d.hero_cta2 ? `<a class="btn-o btn-big" href="${d.hero_cta2_href || '#contenido'}">${esc(d.hero_cta2)}</a>` : '';
  let panel = '';
  if (home && Array.isArray(d.panel)) {
    const rows = d.panel.map(r => {
      const [lbl, val, state] = split3(r);
      const dot = state ? `<span class="dot ok"></span> ` : '';
      return `<div class="panel-row"><span class="lbl">${esc(lbl)}</span><span class="val">${dot}${esc(val)}</span></div>`;
    }).join('');
    panel = `
    <div class="hero-panel reveal" aria-hidden="true">
      <div class="panel-top"><span class="panel-tag">${esc(d.panel_tag || '')}</span><span class="panel-badge">${esc(d.panel_badge || '')}</span></div>
      <div class="panel-big">${esc(d.panel_big || '')}<small>${esc(d.panel_big_note || '')}</small></div>
      ${rows}
    </div>`;
  }
  return `
<section class="hero${home ? ' hero-home' : ' hero-inner'}">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${eyebrow(d.hero_tag)}
      <h1>${title2html(d.hero_title)}</h1>
      ${d.hero_desc ? `<p class="hero-desc">${inline(d.hero_desc)}</p>` : ''}
      ${(cta1 || cta2) ? `<div class="hero-ctas">${cta1}${cta2}</div>` : ''}
      ${d.hero_micro ? `<div class="hero-micro">${esc(d.hero_micro)}</div>` : ''}
    </div>
    ${panel}
  </div>
</section>`;
}

function cardsHtml(d, cfg) {
  if (!Array.isArray(d.cards)) return '';
  const cells = d.cards.map(c => {
    const inner = `
      ${c.tag ? `<div class="card-tag">${esc(c.tag)}</div>` : ''}
      <h3>${inline(c.title || '')}</h3>
      <p>${inline(c.desc || '')}</p>
      ${c.price ? `<div class="card-price">${esc(c.price)}</div>` : ''}
      ${c.href ? `<span class="card-more">${esc(d.cards_more || cfg.ui_more)} <span class="arr">→</span></span>` : ''}`;
    return c.href
      ? `<a class="card card-link reveal" href="${c.href}">${inner}</a>`
      : `<div class="card reveal">${inner}</div>`;
  }).join('');
  return `
<section class="section" id="contenido">
  <div class="wrap">
    ${sectionHead(d.cards_tag, d.cards_title, d.cards_lead)}
    <div class="grid grid-${Math.min(d.cards.length, 4) > 3 ? '2' : String(Math.min(d.cards.length, 3))}">${cells}</div>
  </div>
</section>`;
}

function statsHtml(d) {
  if (!Array.isArray(d.stats)) return '';
  const cells = d.stats.map(s => {
    const [n, label] = split3(s);
    return `<div class="stat reveal"><div class="stat-n">${esc(n)}</div><div class="stat-l">${esc(label)}</div></div>`;
  }).join('');
  return `<section class="stats-band"><div class="wrap stats-grid">${cells}</div></section>`;
}

function aboutHtml(d, cfg) {
  if (!d.about_title) return '';
  const pillars = Array.isArray(d.pillars) ? d.pillars.map(x =>
    `<div class="pillar reveal"><h3>${inline(x.title)}</h3><p>${inline(x.desc)}</p></div>`).join('') : '';
  return `
<section class="section section-alt">
  <div class="wrap about-grid">
    <div class="about-copy">
      ${eyebrow(d.about_tag)}
      <h2>${title2html(d.about_title)}</h2>
      ${d.about_p1 ? `<p>${inline(d.about_p1)}</p>` : ''}
      ${d.about_p2 ? `<p>${inline(d.about_p2)}</p>` : ''}
      ${d.about_cta ? `<a class="btn-o" href="${cfg.form_url}" target="_blank" rel="noopener">${esc(d.about_cta)} <span class="arr">→</span></a>` : ''}
    </div>
    <div class="pillars">${pillars}</div>
  </div>
</section>`;
}

function whatHtml(d) {
  if (!d.what_title && !d.what_desc) return '';
  return `
<section class="section" id="contenido">
  <div class="wrap wrap-narrow">
    ${eyebrow(d.what_tag)}
    ${d.what_title ? `<h2>${title2html(d.what_title)}</h2>` : ''}
    ${d.what_desc ? `<p class="what-desc">${inline(d.what_desc)}</p>` : ''}
    ${d.what_desc2 ? `<p class="what-desc">${inline(d.what_desc2)}</p>` : ''}
  </div>
</section>`;
}

function listSection(tag, title, items, cls) {
  if (!Array.isArray(items) || !items.length) return '';
  const lis = items.map(x => `<li class="reveal"><span class="tick" aria-hidden="true">✓</span>${inline(x)}</li>`).join('');
  return `
<section class="section ${cls || ''}">
  <div class="wrap wrap-narrow">
    ${sectionHead(tag, title)}
    <ul class="checklist">${lis}</ul>
  </div>
</section>`;
}

function priceHtml(d, cfg) {
  if (!d.price_value) return '';
  return `
<section class="section section-alt">
  <div class="wrap wrap-narrow">
    ${sectionHead(d.price_tag, d.price_title)}
    <div class="price-box reveal">
      ${d.price_badge ? `<div class="price-badge">${esc(d.price_badge)}</div>` : ''}
      <div class="price-value">${esc(d.price_value)}</div>
      ${d.price_note ? `<p class="price-note">${inline(d.price_note)}</p>` : ''}
      <a class="btn-p btn-big" href="${cfg.form_url}" target="_blank" rel="noopener">${esc(d.price_cta || cfg.cta_btn_form)} <span class="arr">→</span></a>
    </div>
  </div>
</section>`;
}

function stepsHtml(d) {
  if (!Array.isArray(d.steps)) return '';
  const cells = d.steps.map((s, i) =>
    `<div class="step reveal"><div class="step-n">${String(i + 1).padStart(2, '0')}</div><h3>${inline(s.title)}</h3><p>${inline(s.desc)}</p></div>`).join('');
  return `
<section class="section">
  <div class="wrap">
    ${sectionHead(d.steps_tag, d.steps_title)}
    <div class="steps">${cells}</div>
  </div>
</section>`;
}

function faqHtml(d) {
  if (!Array.isArray(d.faq) || !d.faq.length) return '';
  const items = d.faq.map(f => `
    <div class="faq-item">
      <button class="faq-q" aria-expanded="false">${inline(f.q)}<span class="faq-ico" aria-hidden="true"></span></button>
      <div class="faq-a"><p>${inline(f.a)}</p></div>
    </div>`).join('');
  return `
<section class="section section-alt" id="faq">
  <div class="wrap wrap-narrow">
    ${sectionHead(d.faq_tag, d.faq_title)}
    <div class="faq-wrap">${items}</div>
  </div>
</section>`;
}

function testiHtml(d) {
  if (!Array.isArray(d.testimonials) || !d.testimonials.length) return '';
  const cards = d.testimonials.map(t => `
    <figure class="testi reveal">
      <blockquote>${inline(t.text)}</blockquote>
      <figcaption><strong>${esc(t.name)}</strong><span>${esc(t.role || '')}</span></figcaption>
    </figure>`).join('');
  return `
<section class="section">
  <div class="wrap">
    ${sectionHead(d.testi_tag, d.testi_title)}
    ${d.testi_note ? `<p class="privacy-badge">🛡 ${inline(d.testi_note)}</p>` : ''}
    <div class="grid grid-3">${cards}</div>
  </div>
</section>`;
}

function proseHtml(p) {
  if (!p.body || !p.body.trim()) return '';
  return `
<section class="section">
  <div class="wrap wrap-prose prose">${md(p.body)}</div>
</section>`;
}

function ctaHtml(d, cfg) {
  if (d.cta === 'none') return '';
  return `
<section class="section cta-final">
  <div class="wrap wrap-narrow center">
    ${eyebrow(d.cta_tag || cfg.cta_tag, true)}
    <h2>${title2html(d.cta_title || cfg.cta_title)}</h2>
    <p class="sec-lead">${inline(d.cta_desc || cfg.cta_desc)}</p>
    <div class="hero-ctas center">
      <a class="btn-p btn-big" href="${cfg.form_url}" target="_blank" rel="noopener">${esc(d.cta_btn || cfg.cta_btn_form)} <span class="arr">→</span></a>
      <a class="btn-o btn-big" href="${cfg.wa_url}" target="_blank" rel="noopener">${esc(cfg.cta_btn_wa)}</a>
    </div>
  </div>
</section>`;
}

function footerHtml(p, cfg) {
  let cols = '';
  for (let i = 1; i <= 6; i++) {
    const t = cfg['footer_col' + i + '_title'], links = cfg['footer_col' + i];
    if (!t || !Array.isArray(links)) continue;
    cols += `<div class="f-col"><h4>${esc(t)}</h4>${links.map(l => {
      const [label, href] = split3(l);
      return `<a href="${href}">${esc(label)}</a>`;
    }).join('')}</div>`;
  }
  return `
<footer class="nw-footer">
  <div class="wrap f-grid">
    <div class="f-brand">
      <a class="nw-logo" href="${p.lang === 'en' ? '/en/' : '/'}">Nord<span>wise</span></a>
      <p>${esc(cfg.footer_tagline)}</p>
      <a class="f-mail" href="mailto:${cfg.email}">${esc(cfg.email)}</a>
    </div>
    ${cols}
  </div>
  <div class="wrap f-bottom"><span>© ${YEAR} Nordwise LLC. ${esc(cfg.footer_rights)}</span></div>
</footer>`;
}

/* ── Blog ────────────────────────────────────────────────── */
function blogIndexHtml(p, cfg) {
  const list = posts.filter(x => x.lang === p.lang);
  if (!list.length) return `<section class="section"><div class="wrap wrap-narrow center"><p class="sec-lead">${esc(cfg.blog_empty)}</p></div></section>`;
  const cards = list.map(x => `
    <a class="post-card reveal" href="${x.data.url}">
      <div class="post-meta"><span>${fmtDate(x.data.date, p.lang)}</span><span>·</span><span>${readMins(x.body)} ${esc(cfg.ui_min)}</span></div>
      <h3>${inline(x.data.title)}</h3>
      <p>${inline(x.data.description || '')}</p>
      <span class="card-more">${esc(cfg.ui_more)} <span class="arr">→</span></span>
    </a>`).join('');
  return `<section class="section" id="contenido"><div class="wrap"><div class="grid grid-3">${cards}</div></div></section>`;
}

function postHtml(p, cfg) {
  const d = p.data;
  const tags = Array.isArray(d.tags) ? `<div class="post-tags">${d.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : '';
  return `
<article class="post">
  <header class="hero hero-inner">
    <div class="hero-bg" aria-hidden="true"></div>
    <div class="wrap wrap-prose">
      <a class="post-back" href="${p.lang === 'en' ? '/en/blog/' : '/blog/'}">← ${esc(cfg.ui_back_blog)}</a>
      ${eyebrow('Blog · ' + fmtDate(d.date, p.lang))}
      <h1>${title2html(d.title)}</h1>
      ${d.description ? `<p class="hero-desc">${inline(d.description)}</p>` : ''}
      <div class="post-meta"><span>${esc(d.author || 'Nordwise')}</span><span>·</span><span>${readMins(p.body)} ${esc(cfg.ui_min)}</span></div>
    </div>
  </header>
  <div class="wrap wrap-prose prose post-body">${md(p.body)}${tags}</div>
</article>`;
}

/* ── <head> + JSON-LD ────────────────────────────────────── */
function headHtml(p, cfg) {
  const d = p.data, alt = altOf(p);
  const url = SITE + d.url;
  const ld = [];
  if (d.layout === 'home') {
    ld.push({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Nordwise LLC', url: SITE, email: cfg.email, logo: SITE + '/static/img/favicon.svg', sameAs: [] });
    ld.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Nordwise', url: SITE, inLanguage: p.lang });
  }
  if (Array.isArray(d.faq) && d.faq.length) {
    ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: d.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  }
  if (d.layout === 'post') {
    ld.push({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: d.title, description: d.description || '', datePublished: d.date, dateModified: d.updated || d.date, inLanguage: p.lang, author: { '@type': 'Organization', name: 'Nordwise' }, publisher: { '@type': 'Organization', name: 'Nordwise LLC' }, mainEntityOfPage: url });
  }
  if (d.layout === 'service' && d.title) {
    ld.push({ '@context': 'https://schema.org', '@type': 'Service', name: d.title, description: d.description || '', provider: { '@type': 'Organization', name: 'Nordwise LLC', url: SITE }, areaServed: 'Worldwide' });
  }
  const hreflang = alt ? `
  <link rel="alternate" hreflang="${p.lang}" href="${url}">
  <link rel="alternate" hreflang="${alt.lang}" href="${SITE + alt.data.url}">
  <link rel="alternate" hreflang="x-default" href="${p.lang === 'es' ? url : SITE + alt.data.url}">` : '';
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.description || '')}">
<link rel="canonical" href="${url}">${hreflang}
<meta property="og:type" content="${d.layout === 'post' ? 'article' : 'website'}">
<meta property="og:title" content="${esc(d.title)}">
<meta property="og:description" content="${esc(d.description || '')}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Nordwise">
<meta property="og:locale" content="${p.lang === 'es' ? 'es_ES' : 'en_US'}">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/svg+xml" href="/static/img/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;600;700;800&family=Figtree:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/css/style.css">
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}`;
}

/* ── Ensamblado de página ────────────────────────────────── */
function renderPage(p) {
  const cfg = CFG[p.lang], d = p.data;
  let main = '';
  if (d.layout === 'post') {
    main = postHtml(p, cfg) + ctaHtml(d, cfg);
  } else {
    main = heroHtml(p, cfg);
    if (d.layout === 'blog') main += blogIndexHtml(p, cfg);
    main += whatHtml(d)
      + cardsHtml(d, cfg)
      + statsHtml(d)
      + aboutHtml(d, cfg)
      + listSection(d.includes_tag, d.includes_title, d.includes, '')
      + listSection(d.why_tag, d.why_title, d.why_points, 'section-alt')
      + listSection(d.req_tag, d.req_title, d.req_items, '')
      + stepsHtml(d)
      + priceHtml(d, cfg)
      + testiHtml(d)
      + faqHtml(d)
      + proseHtml(p)
      + ctaHtml(d, cfg);
  }
  return `<!DOCTYPE html>
<html lang="${p.lang}" data-page="${d.ref || ''}">
<head>
${headHtml(p, cfg)}
</head>
<body>
${navHtml(p, cfg)}
<main>${main}</main>
${footerHtml(p, cfg)}
<script src="/static/js/main.js" defer></script>
</body>
</html>`;
}

/* ── Escritura ───────────────────────────────────────────── */
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (e) { /* algunos sistemas bloquean el borrado; se sobreescribe */ }
fs.mkdirSync(OUT, { recursive: true });

function writePage(url, html) {
  const dir = path.join(OUT, url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}
for (const p of all) writePage(p.data.url, renderPage(p));

/* assets (copia manual, compatible con cualquier sistema de archivos) */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.writeFileSync(d, fs.readFileSync(s));
  }
}
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'static'));

/* sitemap.xml */
const smUrls = all.map(p => {
  const alt = altOf(p);
  const alts = alt ? `
    <xhtml:link rel="alternate" hreflang="${p.lang}" href="${SITE + p.data.url}"/>
    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${SITE + alt.data.url}"/>` : '';
  return `  <url><loc>${SITE + p.data.url}</loc>${alts}
  </url>`;
}).join('\n');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${smUrls}
</urlset>
`);

/* robots.txt */
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

/* 404 */
fs.writeFileSync(path.join(OUT, '404.html'), `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>404 — Nordwise</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="/static/css/style.css"></head>
<body class="page-404"><main class="err-wrap"><div class="eyebrow">Error 404</div>
<h1>Esta página no existe.</h1><p>Puede que el enlace haya cambiado. / This page does not exist.</p>
<div class="hero-ctas"><a class="btn-p" href="/">← Inicio</a><a class="btn-o" href="/en/">English home</a></div>
</main></body></html>`);

console.log(`✔ ${all.length} páginas generadas en /public (${pages.length} páginas + ${posts.length} posts)`);
