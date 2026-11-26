import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { runFirecrawlTool } from './fc.ts';

interface RawCandidate {
  name: string;
  website: string;
  source_url: string;
  source_date: string;
  evidence_path: string;
  stage_hint: string;
  amount_hint: string;
  hq_hint: string;
  source_count: number;
  all_sources: string[];
}

interface UrlCacheEntry {
  url: string;
  outPath: string;
  mdPath: string;
  httpStatus: number;
  ok: boolean;
  error?: string;
}

const PHASE2_DIR = 'evidence/phase2';
const CACHE_PATH = `${PHASE2_DIR}/url_cache.json`;
const QUEUE_PATH = `${PHASE2_DIR}/phase2_queue.json`;

if (!fs.existsSync(PHASE2_DIR)) fs.mkdirSync(PHASE2_DIR, { recursive: true });

function buildQueue(): RawCandidate[] {
  if (fs.existsSync(QUEUE_PATH)) {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  }
  const raw: RawCandidate[] = JSON.parse(fs.readFileSync('evidence/phase1/candidates_raw.json', 'utf8'));

  // Priority order for Phase 2:
  // 1. In-window (2026-07-01..2026-11-24) excluding obvious Series B+ / commercial paper / unicorn lines (still keep others to verify!)
  // 2. Recent Nov 2026 press profiles/launches (Disrupt Africa, African-Startups, Techpoint)
  // 3. F6S Nigeria funded startups (2024-2026)
  // 4. F6S Nigeria founded 2025-2026 startups
  // 5. Liners active 2026 food delivery & Moonshot 2026 Nigerian startups
  // 6. H1 2026 (to inspect if any follow-on/later announcement or verify exclusion)
  const inWindow = raw.filter((c) => c.source_date >= '2026-07-01' && c.source_date <= '2026-11-24');
  const recentPressNotFound = raw.filter(
    (c) =>
      c.source_date === 'NOT_FOUND' &&
      !c.source_url.includes('f6s.com') &&
      !c.source_url.includes('moonshot-2026')
  );
  const f6sFunded = raw.filter(
    (c) => c.source_date === 'NOT_FOUND' && c.source_url.includes('f6s.com') && !!c.amount_hint
  );
  const f6sFounded2025_2026 = raw.filter(
    (c) => c.source_date === 'NOT_FOUND' && c.source_url.includes('f6s.com') && !c.amount_hint
  );
  const moonshot = raw.filter(
    (c) => c.source_date === 'NOT_FOUND' && c.source_url.includes('moonshot-2026')
  );
  const h1 = raw.filter((c) => c.source_date >= '2026-01-01' && c.source_date < '2026-07-01');

  const ordered = [
    ...inWindow,
    ...recentPressNotFound,
    ...f6sFunded,
    ...f6sFounded2025_2026,
    ...moonshot,
    ...h1,
  ];
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(ordered, null, 2));
  return ordered;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function urlHash(url: string): string {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeCached(
  url: string,
  label: string,
  cache: Record<string, UrlCacheEntry>
): Promise<UrlCacheEntry> {
  if (cache[url] && cache[url].ok && fs.existsSync(cache[url].outPath) && fs.statSync(cache[url].outPath).size > 10) {
    return cache[url];
  }
  const fname = `${slugify(label)}_${urlHash(url)}`;
  const outPath = `${PHASE2_DIR}/${fname}.json`;
  const mdPath = `${PHASE2_DIR}/${fname}.md`;

  let r = await runFirecrawlTool({
    tool: 'scrape',
    endpoint: '/scrape',
    method: 'POST',
    body: { url, formats: ['markdown', 'links'] },
    outPath,
    markdownOutPath: mdPath,
  });

  if (r.status === 429 || r.status === 502 || r.status === 503 || r.status === 504) {
    await sleep(12000);
    r = await runFirecrawlTool({
      tool: 'scrape',
      endpoint: '/scrape',
      method: 'POST',
      body: { url, formats: ['markdown', 'links'] },
      outPath,
      markdownOutPath: mdPath,
    });
  }

  await sleep(5300);

  const entry: UrlCacheEntry = {
    url,
    outPath,
    mdPath,
    httpStatus: r.status,
    ok: r.ok && r.json?.success !== false,
    error: r.ok ? undefined : r.json?.error || `HTTP ${r.status}`,
  };
  if (entry.ok) {
    cache[url] = entry;
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  }
  return entry;
}

async function main() {
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const startArg = process.argv.find((a) => a.startsWith('--start='));
  const sizeArg = process.argv.find((a) => a.startsWith('--size='));
  const extraUrlsArg = process.argv.find((a) => a.startsWith('--extra-urls='));

  const queue = buildQueue();
  const cache: Record<string, UrlCacheEntry> = fs.existsSync(CACHE_PATH)
    ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
    : {};

  if (extraUrlsArg) {
    // Format: --extra-urls=label1|url1,label2|url2
    const pairs = extraUrlsArg.replace('--extra-urls=', '').split(',').filter(Boolean);
    for (const p of pairs) {
      const [label, url] = p.split('|');
      if (!url) continue;
      const entry = await scrapeCached(url, label || 'extra', cache);
      console.log(`EXTRA | ${label} | ${url} | ok=${entry.ok} | ${entry.mdPath}`);
    }
    return;
  }

  const batchNum = batchArg ? parseInt(batchArg.split('=')[1], 10) : 1;
  const size = sizeArg ? parseInt(sizeArg.split('=')[1], 10) : 10;
  const start = startArg ? parseInt(startArg.split('=')[1], 10) : (batchNum - 1) * size;
  const slice = queue.slice(start, start + size);

  console.log(`=== Phase 2 Batch ${batchNum} (indices ${start}..${start + slice.length - 1} of ${queue.length}) ===`);

  for (let i = 0; i < slice.length; i++) {
    const c = slice[i];
    const entry = await scrapeCached(c.source_url, c.name, cache);
    const mdExists = fs.existsSync(entry.mdPath);
    const mdLen = mdExists ? fs.statSync(entry.mdPath).size : 0;
    console.log(
      `[${start + i + 1}] ${c.name} | date=${c.source_date} | ok=${entry.ok} | status=${entry.httpStatus} | mdBytes=${mdLen} | file=${entry.mdPath} | url=${c.source_url}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
