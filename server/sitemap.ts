import { getDb } from './db.ts';

const CANONICAL_DOMAIN = 'https://jaihanumandoor.com';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

/**
 * Generates standard W3C / Sitemaps.org XML sitemap string
 * for Google Search Console and other web crawlers.
 */
export function generateSitemapXml(): string {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const urlEntries: SitemapUrlEntry[] = [];

  // 1. Core Public Static Pages (Canonical URLs)
  const corePages: Array<{
    path: string;
    priority: string;
    changefreq: SitemapUrlEntry['changefreq'];
  }> = [
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
  const xmlLines: string[] = [
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

/**
 * Generates standard plain-text robots.txt directing search engine bots
 * to the canonical sitemap and protecting administrative routes.
 */
export function generateRobotsTxt(): string {
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
