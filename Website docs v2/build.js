// Builds the Meridian Accountants site into ./dist for Netlify.
// Every blog post in content/posts becomes a real HTML page at /blog/<slug>/,
// so search engines and AI tools can read it without running JavaScript.
// Run locally with:  npm install && npm run build

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const SITE_URL = 'https://meridian-accountants.com';
const SITE_NAME = 'Meridian Accountants';
const AUTHOR = {
  name: 'Farid Nasri',
  credentials: 'ACA, Chartered Accountant',
};
// Social profiles: shown in every page footer and given to search engines (schema "sameAs").
const SOCIAL = [
  { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61594854459995' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/129244179/' },
];
const HOME_DESCRIPTION =
  'ICAEW regulated Chartered Accountants in Southampton offering bookkeeping, accounts, tax and advisory services for individuals and businesses.';

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const SKIP = new Set(['Website docs v2', 'plugins', '.indexnow.json', 'dist', 'node_modules', 'content', 'build.js', 'package.json', 'package-lock.json', 'netlify.toml', '.git']);

// ---------- helpers ----------

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function parseFrontmatter(raw) {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    val = val.replace(/^["']|["']$/g, '');
    data[key] = val;
  });
  return { data, body: match[2].trim() };
}

function isoDate(d) {
  const date = new Date(d);
  return isNaN(date) ? '' : date.toISOString().slice(0, 10);
}

function formatDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return d || '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Pulls question/answer pairs from a "## Frequently asked questions" (or "## FAQs")
// section, where each question is a ### heading, for FAQ structured data.
function extractFaqs(html) {
  const section = html.match(/<h2[^>]*>\s*(frequently asked questions|faqs?)\s*<\/h2>([\s\S]*?)(?=<h2|$)/i);
  if (!section) return [];
  const parts = section[2].split(/<h3[^>]*>/i).slice(1);
  return parts
    .map(p => {
      const [q, ...rest] = p.split(/<\/h3>/i);
      return { q: stripHtml(q), a: stripHtml(rest.join('')) };
    })
    .filter(f => f.q && f.a);
}

function stripScripts(html) {
  // Remove the old client-side loaders (marked.js and the GitHub fetch script).
  return html.replace(/<script[\s\S]*?<\/script>\s*/gi, '');
}

function setHead(html, headExtra, title) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  return html.replace(/<\/head>/i, `${headExtra}\n</head>`);
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

// ---------- load posts ----------

const posts = fs.existsSync(POSTS_DIR)
  ? fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(file => {
        const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
        const { data, body } = parseFrontmatter(raw);
        const base = file.replace(/\.md$/, '');
        const slug = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        const html = marked.parse(body);
        return {
          file,
          base,
          slug,
          url: `/blog/${slug}/`,
          title: data.title || slug,
          date: data.date || '',
          updated: data.updated || data.date || '',
          excerpt: data.excerpt || '',
          description: data.description || data.excerpt || stripHtml(html).slice(0, 155),
          image: data.image || '',
          html,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  : [];

// ---------- build ----------

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(ROOT, OUT);

// Home page: add a meta description and canonical link if missing.
const homePath = path.join(OUT, 'index.html');
let home = fs.readFileSync(homePath, 'utf8');
if (!/name="description"/i.test(home)) {
  home = home.replace(
    /<\/head>/i,
    `  <meta name="description" content="${esc(HOME_DESCRIPTION)}" />\n  <link rel="canonical" href="${SITE_URL}/" />\n` +
      jsonLd({
        '@context': 'https://schema.org',
        '@type': 'AccountingService',
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: HOME_DESCRIPTION,
        founder: { '@type': 'Person', name: AUTHOR.name },
        sameAs: SOCIAL.map(s => s.url),
        address: { '@type': 'PostalAddress', addressLocality: 'Southampton', addressCountry: 'GB' },
      }) +
      '\n</head>'
  );
  fs.writeFileSync(homePath, home);
}

// Home page: "Latest from the blog" section with the 3 newest posts, placed straight after the hero.
// It updates automatically whenever a post is added.
if (posts.length && home.includes('<!-- WHY US -->') && !home.includes('id="latest-posts"')) {
  const latest = posts.slice(0, 3).map(p => `
        <a class="lp-card" href="${p.url}">
          ${p.date ? `<div class="lp-date">${esc(formatDate(p.date))}</div>` : ''}
          <h3>${esc(p.title)}</h3>
          ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}
          <span class="lp-more">Read the guide &rarr;</span>
        </a>`).join('');
  const section = `<!-- LATEST POSTS -->
<section id="latest-posts">
  <style>
    #latest-posts { background: var(--cream-dark); padding: 56px 5vw 64px; border-top: 1px solid rgba(184,146,42,0.25); }
    .lp-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
    .lp-head .section-title { font-size: clamp(1.5rem, 2.6vw, 2rem); margin-bottom: 0; }
    .lp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
    .lp-card { display: flex; flex-direction: column; padding: 1.5rem 1.75rem; background: var(--cream); border: 1px solid rgba(184,146,42,0.3); text-decoration: none; transition: border-color 0.25s, transform 0.25s; }
    .lp-card:hover { border-color: var(--gold); transform: translateY(-2px); }
    .lp-date { font-family: 'Raleway', sans-serif; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.6rem; }
    .lp-card h3 { font-family: 'Cormorant Garamond', serif; font-size: 1.35rem; font-weight: 600; color: var(--gold-deep); line-height: 1.25; margin-bottom: 0.75rem; }
    .lp-card p { font-size: 0.97rem; color: var(--text-muted); line-height: 1.55; margin-bottom: 1.25rem; flex: 1; }
    .lp-more { font-family: 'Raleway', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold-deep); }
    .lp-all { display: inline-block; font-family: 'Raleway', sans-serif; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold-deep); text-decoration: none; }
    .lp-all:hover { color: var(--gold); }
  </style>
  <div class="section-inner">
    <div class="section-label">Insights &amp; Updates</div>
    <div class="lp-head">
      <h2 class="section-title">Latest from the Blog</h2>
      <a class="lp-all" href="/blog/">View all posts &rarr;</a>
    </div>
    <div class="lp-grid">${latest}
    </div>
  </div>
</section>

<!-- WHY US -->`;
  home = home.replace('<!-- WHY US -->', section);
  fs.writeFileSync(homePath, home);
}

// Post pages.
const postTemplate = stripScripts(fs.readFileSync(path.join(ROOT, 'blog', 'post.html'), 'utf8'))
  // Table styles for posts that include tables.
  .replace(
    /<\/style>/i,
    `    .post-body table { width: 100%; border-collapse: collapse; margin: 0 0 1.6rem; font-size: 1rem; }
    .post-body th, .post-body td { text-align: left; padding: 0.55rem 0.75rem; border-bottom: 1px solid rgba(184,146,42,0.3); }
    .post-body th { font-family: 'Raleway', sans-serif; font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gold-deep); }
    .post-byline { font-family: 'Raleway', sans-serif; font-size: 0.85rem; color: var(--text-muted); margin: -1.8rem 0 2.5rem; }
    .post-byline a { color: var(--gold-deep); }
    .post-body blockquote { border-left: 3px solid var(--gold); padding-left: 1rem; margin: 0 0 1.4rem; color: var(--text-muted); }
  </style>`
  );

for (const p of posts) {
  const canonical = `${SITE_URL}${p.url}`;
  const image = p.image ? (p.image.startsWith('http') ? p.image : `${SITE_URL}${p.image}`) : `${SITE_URL}/PHOTO-2026-06-11-18-07-32.jpg`;
  const faqs = extractFaqs(p.html);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: isoDate(p.date),
      dateModified: isoDate(p.updated),
      mainEntityOfPage: canonical,
      image,
      author: { '@type': 'Person', name: AUTHOR.name, jobTitle: 'Chartered Accountant', url: `${SITE_URL}/#about` },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/PHOTO-2026-06-11-18-07-32.jpg` }, sameAs: SOCIAL.map(s => s.url) },
    },
  ];
  if (faqs.length) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }

  const head = [
    `  <meta name="description" content="${esc(p.description)}" />`,
    `  <link rel="canonical" href="${canonical}" />`,
    `  <meta property="og:type" content="article" />`,
    `  <meta property="og:title" content="${esc(p.title)}" />`,
    `  <meta property="og:description" content="${esc(p.description)}" />`,
    `  <meta property="og:url" content="${canonical}" />`,
    `  <meta property="og:image" content="${esc(image)}" />`,
    `  <meta property="og:site_name" content="${SITE_NAME}" />`,
    `  <meta name="twitter:card" content="summary_large_image" />`,
    `  <meta property="article:published_time" content="${isoDate(p.date)}" />`,
    ...schema.map(s => '  ' + jsonLd(s)),
  ].join('\n');

  const updatedLine =
    p.updated && isoDate(p.updated) !== isoDate(p.date) ? ` &middot; Updated ${esc(formatDate(p.updated))}` : '';

  const article = `
  <article>
    ${p.date ? `<div class="post-date"><time datetime="${isoDate(p.date)}">${esc(formatDate(p.date))}</time></div>` : ''}
    <h1 class="post-title">${esc(p.title)}</h1>
    <p class="post-byline">By <a href="/#about">${esc(AUTHOR.name)}</a>, ${esc(AUTHOR.credentials)}${updatedLine}</p>
    <div class="post-body">${p.html}</div>
  </article>`;

  let page = setHead(postTemplate, head, `${p.title} | ${SITE_NAME}`);
  page = page.replace(/<div id="post-content">[\s\S]*?<\/div>/i, article);

  const dir = path.join(OUT, 'blog', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page);
}

// Blog listing page.
const listTemplate = stripScripts(fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8'));
const cards = posts.length
  ? posts
      .map(
        p => `
    <a class="post-card" href="${p.url}">
      ${p.date ? `<div class="post-date">${esc(formatDate(p.date))}</div>` : ''}
      <h2>${esc(p.title)}</h2>
      ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}
    </a>`
      )
      .join('')
  : '<p class="state-msg">No posts published yet &mdash; check back soon.</p>';

let list = setHead(
  listTemplate,
  `  <meta name="description" content="Practical, plain-English guidance on tax, accounts and running a limited company from Meridian Accountants, Chartered Accountants in Southampton." />\n  <link rel="canonical" href="${SITE_URL}/blog/" />`,
  `Blog | ${SITE_NAME}`
);
list = list.replace(/<div id="post-list">[\s\S]*?<\/div>/i, `<div id="post-list">${cards}\n  </div>`);
fs.writeFileSync(path.join(OUT, 'blog', 'index.html'), list);

// Old ?slug= links keep working: redirect them to the new clean addresses.
fs.rmSync(path.join(OUT, 'blog', 'post.html'), { force: true });
const redirects = posts.map(p => `/blog/post.html slug=${p.base} ${p.url} 301`);
redirects.push('/blog/post.html /blog/ 301');
fs.writeFileSync(path.join(OUT, '_redirects'), redirects.join('\n') + '\n');

// Sitemap and robots.txt.
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE_URL}/`, lastmod: today },
  { loc: `${SITE_URL}/blog/`, lastmod: posts[0] ? isoDate(posts[0].updated) : today },
  ...posts.map(p => ({ loc: `${SITE_URL}${p.url}`, lastmod: isoDate(p.updated) })),
];
fs.writeFileSync(
  path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n'
);
fs.writeFileSync(
  path.join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);

console.log(`Built ${posts.length} post(s) into dist/`);
posts.forEach(p => console.log(`  ${p.url}`));

// IndexNow: tells Bing (and Copilot, ChatGPT search, Yandex, etc.) about new or updated pages.
// The key file must be public at the site root; the Netlify plugin in plugins/indexnow sends the
// notification after each successful production deploy.
const INDEXNOW_KEY = '58c59e50816a8b46dcc96ccae3e5a68c';
fs.writeFileSync(path.join(OUT, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
const RECENT_DAYS = 3;
const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
const recent = posts.filter(p => {
  const t = new Date(p.updated || p.date).getTime();
  return !isNaN(t) && t >= cutoff;
});
const pingUrls = recent.length
  ? [`${SITE_URL}/`, `${SITE_URL}/blog/`, ...recent.map(p => `${SITE_URL}${p.url}`)]
  : [];
fs.writeFileSync(
  path.join(ROOT, '.indexnow.json'),
  JSON.stringify({ host: new URL(SITE_URL).host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList: pingUrls }, null, 2)
);
console.log(pingUrls.length ? `IndexNow: ${pingUrls.length} URL(s) queued` : 'IndexNow: no new or updated posts to submit');

// Add "Follow us" social links to the footer of every page (homepage and blog).
function addSocialFooter(file) {
  let html = fs.readFileSync(file, 'utf8');
  if (!SOCIAL.length || html.includes('class="social-links"') || !/<\/footer>/i.test(html)) return;
  const links = SOCIAL.map(s =>
    `<a href="${s.url}" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:none;font-family:'Raleway',sans-serif;font-size:0.8rem;letter-spacing:0.08em;text-transform:uppercase;margin:0 0.75rem;">Follow us on ${esc(s.name)} &rarr;</a>`
  ).join('');
  html = html.replace(/<\/footer>/i, `  <div class="social-links" style="margin-top:1rem;">${links}</div>\n</footer>`);
  fs.writeFileSync(file, html);
}
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'admin') walk(full); }
    else if (entry.name.endsWith('.html')) addSocialFooter(full);
  }
})(OUT);
