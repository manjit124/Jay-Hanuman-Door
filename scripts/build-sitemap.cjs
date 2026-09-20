/**
 * Build-time sitemap and robots generator.
 * Produces physical static XML and txt files for production hosting (Hostinger, Apache, LiteSpeed, Nginx, CDNs)
 * so that web servers never rewrite /sitemap.xml to /index.html.
 */
const fs = require('fs');
const path = require('path');

const CANONICAL_DOMAIN = 'https://jaihanumandoor.com';

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function loadDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  if (fs.existsSync(dbPath)) {
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
      console.warn('⚠️ Could not parse data/database.json, using defaults:', err.message);
    }
  }
  return { doors: [], articles: [] };
}

function generateSitemapXml() {
  const db = loadDatabase();
  const today = new Date().toISOString().split('T')[0];
  const urlEntries = [];

  // 1. Core Public Static Pages (Canonical URLs)
  const corePages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/catalog', priority: '0.9', changefreq: 'daily' },
    { path: '/calculator', priority: '0.9', changefreq: 'weekly' },
    { path: '/articles', priority: '0.8', changefreq: 'weekly' },
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/contact', priority: '0.7', changefreq: 'monthly' },
    { path: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
    { path: '/disclaimer', priority: '0.5', changefreq: 'yearly' },
  ];

  for (const page of corePages) {
    urlEntries.push({
      loc: `${CANONICAL_DOMAIN}${page.path}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  }

  // 2. Real dynamic published Articles from Database
  const articles = (db.articles || []).filter(
    (a) => a.published !== false && a.status !== 'draft'
  );

  for (const article of articles) {
    const slug = (article.slug && article.slug.trim()) || article.id;
    if (slug) {
      urlEntries.push({
        loc: `${CANONICAL_DOMAIN}/article/${encodeURIComponent(slug)}`,
        lastmod: formatDate(article.updatedAt || article.publishedAt || article.createdAt),
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  }

  // 3. Real dynamic active Doors (Products) from Database
  const doors = (db.doors || []).filter((d) => d.active !== false);

  for (const door of doors) {
    if (door.id) {
      urlEntries.push({
        loc: `${CANONICAL_DOMAIN}/door/${encodeURIComponent(door.id)}`,
        lastmod: formatDate(door.createdAt),
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  }

  // Construct XML
  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of urlEntries) {
    xmlLines.push('  <url>');
    xmlLines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    xmlLines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    xmlLines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    xmlLines.push(`    <priority>${entry.priority}</priority>`);
    xmlLines.push('  </url>');
  }

  xmlLines.push('</urlset>');
  return xmlLines.join('\n');
}

function generateRobotsTxt() {
  return [
    '# Robots.txt for Jai Hanuman Door',
    `# Canonical Production: ${CANONICAL_DOMAIN}`,
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# Disallow private and admin management sections',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    '',
    `Sitemap: ${CANONICAL_DOMAIN}/sitemap.xml`,
    '',
  ].join('\n');
}

function generateHtaccess() {
  return `# Apache / LiteSpeed Configuration for Jai Hanuman Door
# Ensures sitemap.xml and robots.txt are served directly as XML and plain text,
# and never rewritten to the React SPA index.html fallback.

<IfModule mod_mime.c>
  AddType application/xml .xml
  AddType text/plain .txt
</IfModule>

<IfModule mod_headers.c>
  <Files "sitemap.xml">
    Header set Content-Type "application/xml; charset=utf-8"
    Header set Cache-Control "public, max-age=3600, must-revalidate"
    Header set X-Robots-Tag "all"
    Header set X-Content-Type-Options "nosniff"
  </Files>
  <Files "robots.txt">
    Header set Content-Type "text/plain; charset=utf-8"
    Header set Cache-Control "public, max-age=86400, must-revalidate"
    Header set X-Content-Type-Options "nosniff"
  </Files>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # NEVER rewrite sitemap.xml or robots.txt to index.html
  RewriteRule ^sitemap\\.xml$ - [L]
  RewriteRule ^robots\\.txt$ - [L]

  # Direct file or directory matches - serve directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Don't rewrite API routes
  RewriteRule ^api/ - [L]

  # Everything else falls back to index.html for React SPA routing
  RewriteRule ^ index.html [L]
</IfModule>
`;
}

function main() {
  const xml = generateSitemapXml();
  const robots = generateRobotsTxt();
  const htaccess = generateHtaccess();

  // Target directories: public/ (source for Vite) and dist/ (production build output if exists)
  const targets = [
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'dist'),
  ];

  for (const dir of targets) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn(`Could not create ${dir}:`, err.message);
      }
    }

    if (fs.existsSync(dir)) {
      const sitemapPath = path.join(dir, 'sitemap.xml');
      const robotsPath = path.join(dir, 'robots.txt');
      const htaccessPath = path.join(dir, '.htaccess');

      fs.writeFileSync(sitemapPath, xml, 'utf8');
      fs.writeFileSync(robotsPath, robots, 'utf8');
      fs.writeFileSync(htaccessPath, htaccess, 'utf8');
      console.log(`✅ Generated SEO files in: ${dir}`);
    }
  }
}

main();
