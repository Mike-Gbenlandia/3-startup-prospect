import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runFirecrawlTool } from './fc.ts';

const RETRIEVAL_DATE = '2026-11-27';
const MIN_FC_DELAY_MS = 6600;
const MIN_IG_DELAY_MS = 5200;

let lastFcCallAt = 0;
let lastIgCallAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFc() {
  const elapsed = Date.now() - lastFcCallAt;
  if (lastFcCallAt > 0 && elapsed < MIN_FC_DELAY_MS) {
    await sleep(MIN_FC_DELAY_MS - elapsed);
  }
  lastFcCallAt = Date.now();
}

async function waitIg() {
  const elapsed = Date.now() - lastIgCallAt;
  if (lastIgCallAt > 0 && elapsed < MIN_IG_DELAY_MS) {
    await sleep(MIN_IG_DELAY_MS - elapsed);
  }
  lastIgCallAt = Date.now();
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function escapeCsv(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function updateQueueStatus(
  slug: string,
  updates: { funding_status?: string; audit_status?: string; tier?: string }
) {
  const raw = fs.readFileSync('state/queue.csv', 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  const slugIdx = header.indexOf('slug');
  const tierIdx = header.indexOf('tier');
  const fsIdx = header.indexOf('funding_status');
  const asIdx = header.indexOf('audit_status');
  const updIdx = header.indexOf('updated_at');

  const now = new Date().toISOString();
  const newLines = [lines[0]];
  let found = false;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[slugIdx] === slug) {
      found = true;
      if (updates.tier !== undefined) cols[tierIdx] = updates.tier;
      if (updates.funding_status !== undefined) cols[fsIdx] = updates.funding_status;
      if (updates.audit_status !== undefined) cols[asIdx] = updates.audit_status;
      cols[updIdx] = now;
    }
    newLines.push(cols.map(escapeCsv).join(','));
  }
  if (!found) throw new Error(`Slug ${slug} not found in state/queue.csv`);
  fs.writeFileSync('state/queue.csv', newLines.join('\n') + '\n', 'utf8');
}

export function updateProgress(mutator: (p: any) => void) {
  const p = JSON.parse(fs.readFileSync('state/progress.json', 'utf8'));
  mutator(p);
  p.last_updated = new Date().toISOString();

  // Recompute counts from queue.csv
  const raw = fs.readFileSync('state/queue.csv', 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const fCnt: Record<string, number> = {};
  const aCnt: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    fCnt[cols[3]] = (fCnt[cols[3]] || 0) + 1;
    aCnt[cols[4]] = (aCnt[cols[4]] || 0) + 1;
  }
  p.counts = {
    funding: fCnt,
    audit: aCnt,
    total_candidates: lines.length - 1,
  };

  fs.writeFileSync('state/progress.json', JSON.stringify(p, null, 2) + '\n', 'utf8');
  fs.writeFileSync('progress.json', JSON.stringify(p, null, 2) + '\n', 'utf8');
}

function getBaseHost(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeUrl(raw: string, baseUrl: string): string | null {
  try {
    const u = new URL(raw, baseUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function classifyInternalLinks(links: string[], baseUrl: string) {
  const baseHost = getBaseHost(baseUrl);
  const normBase = baseUrl.replace(/\/+$/, '');
  const seen = new Set<string>([normBase, normBase + '/']);

  const picked: Record<'about' | 'team' | 'blog' | 'careers', string | null> = {
    about: null,
    team: null,
    blog: null,
    careers: null,
  };
  const socialLinks: { instagram: string[]; linkedin: string[]; twitter: string[] } = {
    instagram: [],
    linkedin: [],
    twitter: [],
  };

  const candidates: Record<'about' | 'team' | 'blog' | 'careers', { url: string; score: number }[]> = {
    about: [],
    team: [],
    blog: [],
    careers: [],
  };

  const addCandidate = (kind: 'about' | 'team' | 'blog' | 'careers', url: string, score: number) => {
    if (!candidates[kind].some((c) => c.url === url)) {
      candidates[kind].push({ url, score });
    }
  };

  for (const raw of links) {
    const abs = normalizeUrl(raw, baseUrl);
    if (!abs) continue;
    const u = new URL(abs);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const p = u.pathname.toLowerCase();

    if (host.includes('instagram.com')) {
      const segs = u.pathname.split('/').filter(Boolean);
      if (
        segs.length >= 1 &&
        !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'share', 'tv'].includes(segs[0].toLowerCase())
      ) {
        const cleanIg = `https://www.instagram.com/${segs[0]}/`;
        if (!socialLinks.instagram.includes(cleanIg)) socialLinks.instagram.push(cleanIg);
      }
      continue;
    }
    if (host.includes('linkedin.com')) {
      if (!socialLinks.linkedin.includes(abs)) socialLinks.linkedin.push(abs);
      continue;
    }
    if (host.includes('twitter.com') || host === 'x.com') {
      if (!socialLinks.twitter.includes(abs)) socialLinks.twitter.push(abs);
      continue;
    }

    if (host !== baseHost && !host.endsWith('.' + baseHost)) continue;
    const clean = `${u.origin}${u.pathname}`.replace(/\/+$/, '') || u.origin;
    if (seen.has(clean) || seen.has(clean + '/')) continue;
    if (/\.(pdf|png|jpe?g|svg|webp|mp4|zip)$/i.test(p)) continue;

    const depth = p.split('/').filter(Boolean).length;
    if (/^\/(about|abouts|about-us|company|who-we-are|our-story)(\/|$)/.test(p)) {
      addCandidate('about', clean, depth === 1 ? 100 : 80);
    } else if (p.includes('about')) {
      addCandidate('about', clean, 40);
    }

    if (/^\/(team|teams|our-team|leadership|people|founders)(\/|$)/.test(p)) {
      addCandidate('team', clean, depth === 1 ? 100 : 80);
    } else if (p.includes('team') || p.includes('leadership')) {
      addCandidate('team', clean, 40);
    }

    if (/^\/(blog|blogs|articles)(\/|$)/.test(p)) {
      addCandidate('blog', clean, depth === 1 ? 120 : 90);
    } else if (/^\/(insights|journal|resources|stories|updates)(\/|$)/.test(p)) {
      addCandidate('blog', clean, depth === 1 ? 100 : 75);
    } else if (/^\/(news|newsroom|press|media)(\/|$)/.test(p)) {
      addCandidate('blog', clean, depth === 1 ? 70 : 50);
    } else if (p.includes('blog')) {
      addCandidate('blog', clean, 60);
    } else if (p.includes('news') || p.includes('insight') || p.includes('journal')) {
      addCandidate('blog', clean, 35);
    }

    if (/^\/(careers|career|jobs|join-us|work-with-us|hiring|openings)(\/|$)/.test(p)) {
      addCandidate('careers', clean, depth === 1 ? 100 : 80);
    } else if (p.includes('career') || p.includes('jobs')) {
      addCandidate('careers', clean, 40);
    }
  }

  for (const kind of ['about', 'team', 'blog', 'careers'] as const) {
    candidates[kind].sort((a, b) => b.score - a.score);
    picked[kind] = candidates[kind][0]?.url || null;
  }

  return { picked, socialLinks };
}

function extractIgLinksFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+\/?/gi) || [];
  const out: string[] = [];
  for (const m of matches) {
    try {
      const u = new URL(m);
      const segs = u.pathname.split('/').filter(Boolean);
      if (
        segs.length >= 1 &&
        !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'share', 'tv'].includes(segs[0].toLowerCase())
      ) {
        const clean = `https://www.instagram.com/${segs[0]}/`;
        if (!out.includes(clean)) out.push(clean);
      }
    } catch {}
  }
  return out;
}

const IG_INTERACT_CODE = `
await page.waitForTimeout(2500);
const title = await page.title();
const url = page.url();
const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 3000) : '');
const domData = await page.evaluate(() => {
  const anchors = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]'));
  const posts = anchors.slice(0, 12).map((a) => {
    const href = a.getAttribute('href') || '';
    const img = a.querySelector('img');
    const imgAlt = img ? (img.getAttribute('alt') || '') : '';
    const svgs = Array.from(a.querySelectorAll('svg')).map((s) => s.getAttribute('aria-label') || s.getAttribute('title') || '');
    const isPinned = svgs.some((x) => /pinned/i.test(x)) || /pinned/i.test(a.innerHTML);
    const isReel = href.includes('/reel/') || svgs.some((x) => /reel|clip|video/i.test(x));
    const isCarousel = svgs.some((x) => /carousel|multiple/i.test(x));
    return { href, imgAlt, svgs, isPinned, isReel, isCarousel };
  });
  const extLinks = Array.from(document.querySelectorAll('header a[href], main a[href]'))
    .map((a) => a.getAttribute('href') || '')
    .filter((h) => h.startsWith('http') && !h.includes('instagram.com'));
  const loginWall = /\\/accounts\\/login/i.test(location.href) || /Log into Instagram|Log in to see photos/i.test(document.body?.innerText || '');
  return { posts, extLinks: Array.from(new Set(extLinks)).slice(0, 10), loginWall };
});
const buf = await page.screenshot({ fullPage: false });
JSON.stringify({ title, url, bodyText, domData, screenshotBase64: buf.toString('base64') });
`.trim();

export async function runInstagramAudit(slug: string, igUrl: string, evidenceDir = 'evidence/phase3', allowRetry = true) {
  const suffix = allowRetry ? '' : '_retry';
  const scrapeJsonPath = `${evidenceDir}/${slug}_ig_scrape${suffix}.json`;
  const scrapeMdPath = `${evidenceDir}/${slug}_ig_scrape${suffix}.md`;
  const interactPath = `${evidenceDir}/${slug}_ig_interact${suffix}.json`;
  const stopPath = `${evidenceDir}/${slug}_ig_stop${suffix}.json`;
  const screenshotPath = `screenshots/${slug}_instagram.png`;

  updateProgress((p) => {
    p.current = { slug, step: `3c_ig_scrape${suffix}`, open_session_ids: p.current?.open_session_ids || [] };
  });

  await waitIg();
  await waitFc();
  const scrapeRes = await runFirecrawlTool({
    tool: 'scrape',
    endpoint: '/scrape',
    method: 'POST',
    body: { url: igUrl, formats: ['markdown'], waitFor: 3000 },
    outPath: scrapeJsonPath,
    markdownOutPath: scrapeMdPath,
  });

  const scrapeId = scrapeRes.scrapeId;
  const mdText = String(scrapeRes.json?.data?.markdown || '');
  let interactParsed: any = null;
  let blocked = false;
  let blockReason = '';

  if (!scrapeRes.ok || !scrapeId) {
    return {
      ok: false,
      blocked: true,
      blockReason: `IG scrape failed HTTP ${scrapeRes.status}: ${scrapeRes.json?.error || 'no scrapeId'}`,
      evidencePaths: [scrapeJsonPath],
      screenshotPath: null,
      mdText,
      interactParsed: null,
    };
  }

  updateProgress((p) => {
    const ids = new Set<string>(p.current?.open_session_ids || []);
    ids.add(scrapeId);
    p.current = { slug, step: `3d_ig_interact${suffix}`, open_session_ids: Array.from(ids) };
  });

  try {
    await waitFc();
    const interactRes = await runFirecrawlTool({
      tool: 'interact',
      endpoint: `/scrape/${scrapeId}/interact`,
      method: 'POST',
      body: { language: 'node', timeout: 30, code: IG_INTERACT_CODE },
      outPath: interactPath,
      scrapeIdOverride: scrapeId,
    });

    if (interactRes.ok && interactRes.json?.result) {
      try {
        interactParsed = JSON.parse(interactRes.json.result);
      } catch {
        interactParsed = { rawResult: interactRes.json.result };
      }
      if (interactParsed?.screenshotBase64) {
        if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots', { recursive: true });
        fs.writeFileSync(screenshotPath, Buffer.from(interactParsed.screenshotBase64, 'base64'));
        delete interactParsed.screenshotBase64;
      }
      const domLoginWall = Boolean(interactParsed?.domData?.loginWall);
      const postCount = (interactParsed?.domData?.posts || []).length;
      const mdHasPosts = /## Recent posts/i.test(mdText) || /instagram\.com\/p\//i.test(mdText);
      if (domLoginWall && postCount === 0 && !mdHasPosts) {
        blocked = true;
        blockReason = 'BLOCKED_LOGIN_WALL';
      }
    } else {
      blocked = true;
      blockReason = `IG interact error: ${interactRes.json?.error || interactRes.json?.stderr || 'no result'}`;
    }
  } finally {
    await waitFc();
    await runFirecrawlTool({
      tool: 'interact_stop',
      endpoint: `/scrape/${scrapeId}/interact`,
      method: 'DELETE',
      outPath: stopPath,
      scrapeIdOverride: scrapeId,
    });
    updateProgress((p) => {
      const ids = (p.current?.open_session_ids || []).filter((x: string) => x !== scrapeId);
      p.current = { slug, step: `3d_ig_stopped${suffix}`, open_session_ids: ids };
    });
  }

  if (blocked && blockReason === 'BLOCKED_LOGIN_WALL' && allowRetry) {
    console.error(`[ig] ${slug} hit login wall; waiting 60s before single retry per PROMPT.md...`);
    await sleep(60500);
    return runInstagramAudit(slug, igUrl, evidenceDir, false);
  }

  return {
    ok: !blocked,
    blocked,
    blockReason,
    evidencePaths: [scrapeJsonPath, ...(fs.existsSync(scrapeMdPath) ? [scrapeMdPath] : []), interactPath, stopPath],
    screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : null,
    mdText,
    interactParsed,
  };
}

export async function auditOneStartup(slugArg: string, phaseLabel: string) {
  const pool: any[] = JSON.parse(fs.readFileSync('evidence/phase2/verified_pool.json', 'utf8'));
  const entry = pool.find((x) => slugify(x.name) === slugArg);
  if (!entry) throw new Error(`Startup slug '${slugArg}' not found in verified_pool.json`);

  const prog = JSON.parse(fs.readFileSync('state/progress.json', 'utf8'));
  if (prog.current?.open_session_ids?.length > 0) {
    throw new Error(`Refusing to start while open_session_ids is non-empty: ${JSON.stringify(prog.current.open_session_ids)}`);
  }

  updateQueueStatus(slugArg, { audit_status: 'IN_PROGRESS' });
  updateProgress((p) => {
    p.phase = phaseLabel;
    p.phase_status = 'IN_PROGRESS';
    p.current = { slug: slugArg, step: '3a_site_scrape', open_session_ids: [] };
    p.next_action = `Finish auditing ${slugArg} and inspect evidence/screenshot before marking DONE.`;
  });

  const evidenceDir = phaseLabel === 'PHASE_4' ? 'evidence/phase4' : 'evidence/phase3';
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const evidencePaths: string[] = [...(entry.evidence_paths || [])];
  const scrapedPages: Record<string, { url: string; status: number; ok: boolean; mdPath?: string; jsonPath: string }> = {};
  const allLinks: string[] = [];
  const allMdTexts: string[] = [];
  let searchCandidates: any[] = [];

  let website = entry.website;
  if (!website || website === 'NOT_FOUND') {
    await waitFc();
    const searchOut = `${evidenceDir}/${slugArg}_site_search.json`;
    const sr = await runFirecrawlTool({
      tool: 'search',
      endpoint: '/search',
      method: 'POST',
      body: { query: `"${entry.name}" Nigeria official website`, limit: 5 },
      outPath: searchOut,
    });
    evidencePaths.push(searchOut);
    const web = sr.json?.data?.web || [];
    searchCandidates = web.map((w: any) => ({ url: w.url, title: w.title, description: w.description }));
    const excludedRe = /(linkedin\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|f6s\.com|crunchbase\.com|tracxn\.com|pitchbook\.com|thecondia\.com|techeconomy\.ng|techinafrica\.com|techtrendafrica\.com|vc4a\.com|wellfound\.com|techcabal\.com|techpoint\.africa|disruptafrica\.com|benjamindada\.com|weetracker\.com|techbuild\.africa|nairametrics\.com|guardian\.ng|punchng\.com|thisdaylive\.com|vanguardngr\.com|thesun\.ng|legit\.ng|businessday\.ng|pulse\.ng|dailytrust\.com|thenationonlineng\.net|tribuneonlineng\.com|ripplesnigeria\.com|businessinsider\.com|startupnews\.africa|msmeafricaonline\.com|innovation-village\.com|startuplist\.africa|trysignalbase\.com|fireround\.dev|african-startups\.com|play\.google\.com|apps\.apple\.com|medium\.com|substack\.com|wikipedia\.org|zoominfo\.com|rocketreach\.co|apollo\.io|signalhire\.com|ng-check\.com|b2bhint\.com|dnb\.com|github\.com|ycombinator\.com|antler\.co|techstars\.com|wefunder\.com|dealroom\.co|trustpilot\.com|lekeelekee\.com|blockbuild\.africa|climateaction\.africa|ubuntuadvisorygroup\.com|cchub\.africa|tadamon\.community|weforum\.org|empowerafrica\.com|africanbusiness\.magazine|howwemadeitinafrica\.com)/i;
    const candidate = web.find((w: any) => w.url && !excludedRe.test(w.url));
    if (candidate?.url) {
      website = candidate.url;
    }
  }

  if (website && website !== 'NOT_FOUND') {
    const homeJson = `${evidenceDir}/${slugArg}_home.json`;
    const homeMd = `${evidenceDir}/${slugArg}_home.md`;
    await waitFc();
    const hr = await runFirecrawlTool({
      tool: 'scrape',
      endpoint: '/scrape',
      method: 'POST',
      body: { url: website, formats: ['markdown', 'links'], onlyMainContent: false },
      outPath: homeJson,
      markdownOutPath: homeMd,
    });
    evidencePaths.push(homeJson);
    if (fs.existsSync(homeMd)) evidencePaths.push(homeMd);
    const md = String(hr.json?.data?.markdown || '');
    const links: string[] = Array.isArray(hr.json?.data?.links) ? hr.json.data.links : [];
    const httpOk = hr.ok && (hr.json?.data?.metadata?.statusCode || 200) < 400;
    scrapedPages.home = { url: website, status: hr.json?.data?.metadata?.statusCode || hr.status, ok: httpOk, mdPath: homeMd, jsonPath: homeJson };
    allLinks.push(...links);
    allMdTexts.push(md);

    const { picked } = classifyInternalLinks(links, hr.json?.data?.metadata?.url || website);
    for (const kind of ['about', 'team', 'blog', 'careers'] as const) {
      const target = picked[kind];
      if (!target) continue;
      // Skip if already scraped under another kind
      if (Object.values(scrapedPages).some((sp) => sp.url === target)) continue;
      updateProgress((p) => {
        p.current = { slug: slugArg, step: `3a_scrape_${kind}`, open_session_ids: [] };
      });
      const subJson = `${evidenceDir}/${slugArg}_${kind}.json`;
      const subMd = `${evidenceDir}/${slugArg}_${kind}.md`;
      await waitFc();
      const subRes = await runFirecrawlTool({
        tool: 'scrape',
        endpoint: '/scrape',
        method: 'POST',
        body: { url: target, formats: ['markdown', 'links'], onlyMainContent: false },
        outPath: subJson,
        markdownOutPath: subMd,
      });
      evidencePaths.push(subJson);
      if (fs.existsSync(subMd)) evidencePaths.push(subMd);
      const subMdText = String(subRes.json?.data?.markdown || '');
      const subLinks: string[] = Array.isArray(subRes.json?.data?.links) ? subRes.json.data.links : [];
      scrapedPages[kind] = {
        url: target,
        status: subRes.json?.data?.metadata?.statusCode || subRes.status,
        ok: subRes.ok,
        mdPath: subMd,
        jsonPath: subJson,
      };
      allLinks.push(...subLinks);
      allMdTexts.push(subMdText);
    }
  }

  // Collect IG links strictly from website pages
  const igCandidates = new Set<string>();
  const { socialLinks } = classifyInternalLinks(allLinks, website && website !== 'NOT_FOUND' ? website : 'https://example.com');
  for (const l of socialLinks.instagram) igCandidates.add(l);
  for (const t of allMdTexts) {
    for (const l of extractIgLinksFromText(t)) igCandidates.add(l);
  }
  const igList = Array.from(igCandidates);

  let igResult: any = { status: 'NO_IG_FOUND', url: 'NOT_FOUND' };
  if (igList.length > 0) {
    const igUrl = igList[0];
    const res = await runInstagramAudit(slugArg, igUrl, evidenceDir, true);
    evidencePaths.push(...res.evidencePaths);
    igResult = {
      status: res.blocked ? res.blockReason : 'OK',
      url: igUrl,
      screenshotPath: res.screenshotPath,
      mdText: res.mdText,
      interactParsed: res.interactParsed,
      allIgLinksFound: igList,
    };
  }

  const summary = {
    retrievalDate: RETRIEVAL_DATE,
    slug: slugArg,
    poolEntry: entry,
    resolvedWebsite: website,
    searchCandidates,
    scrapedPages,
    socialLinksFoundOnSite: {
      instagram: igList,
      linkedin: socialLinks.linkedin.slice(0, 10),
      twitter: socialLinks.twitter.slice(0, 5),
    },
    instagramAudit: igResult,
    evidencePaths: Array.from(new Set(evidencePaths)),
  };

  const summaryPath = `${evidenceDir}/${slugArg}_audit_raw.json`;
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({
    slug: slugArg,
    website,
    pagesScraped: Object.keys(scrapedPages),
    igUrl: igResult.url,
    igStatus: igResult.status,
    screenshotPath: igResult.screenshotPath || null,
    summaryPath,
  }, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const slugIdx = args.indexOf('--slug');
  const phaseIdx = args.indexOf('--phase');
  if (slugIdx === -1 || !args[slugIdx + 1]) {
    console.error('Usage: npx tsx scripts/phase3_fetch.ts --slug <slug> [--phase PHASE_3|PHASE_4]');
    process.exit(1);
  }
  const slug = args[slugIdx + 1];
  const phase = phaseIdx !== -1 && args[phaseIdx + 1] ? args[phaseIdx + 1] : 'PHASE_3';
  await auditOneStartup(slug, phase);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
