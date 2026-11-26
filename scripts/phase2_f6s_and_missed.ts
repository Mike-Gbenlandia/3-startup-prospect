import fs from 'fs';
import { runFirecrawlTool } from './fc.ts';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const scrapes: { name: string; url: string; out: string; md: string }[] = [
    {
      name: 'renew_capital_emfi',
      url: 'https://www.renewcapital.com/newsroom/renew-capital-narrows-500-african-companies-to-15-embedded-finance-investment-candidates',
      out: 'evidence/phase2/renew_capital_emfi.json',
      md: 'evidence/phase2/renew_capital_emfi.md',
    },
    {
      name: 'timbuktoo_ngmorning',
      url: 'https://www.ngmorningreport.com/p/nigerian-edtech-startup-wins-10000',
      out: 'evidence/phase2/timbuktoo_ngmorning.json',
      md: 'evidence/phase2/timbuktoo_ngmorning.md',
    },
  ];

  // Add promising F6S >= $10k items + index 159 (AbegEppMe)
  const q = JSON.parse(fs.readFileSync('evidence/phase2/phase2_queue.json', 'utf8'));
  const f6sTargets = [159, 161, 165, 169, 171, 173, 176, 179, 183, 184, 187, 188, 193, 194, 195, 197];
  for (const idx of f6sTargets) {
    const item = q[idx];
    if (!item) continue;
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 35);
    scrapes.push({
      name: `f6s_${idx}_${slug}`,
      url: item.source_url,
      out: `evidence/phase2/f6s_${idx}_${slug}.json`,
      md: `evidence/phase2/f6s_${idx}_${slug}.md`,
    });
  }

  for (const sc of scrapes) {
    if (fs.existsSync(sc.out) && fs.existsSync(sc.md)) {
      console.log(`CACHED ${sc.name}`);
      continue;
    }
    const r = await runFirecrawlTool({
      tool: 'scrape',
      endpoint: '/scrape',
      method: 'POST',
      body: { url: sc.url, formats: ['markdown', 'links'] },
      outPath: sc.out,
      markdownOutPath: sc.md,
    });
    console.log(`SCRAPE ${sc.name}: status=${r.status} ok=${r.ok}`);
    await sleep(5300);
  }

  const searches = [
    {
      name: 'rana_energy_2026',
      query: '"Rana Energy" Nigeria funding OR raised 2026',
      out: 'evidence/phase2/search_rana_energy_2026.json',
    },
    {
      name: 'kutana_hq',
      query: '"Kutana Pay" OR "Kutana Technologies" headquarters Nigeria OR Ghana',
      out: 'evidence/phase2/search_kutana_hq.json',
    },
  ];

  for (const s of searches) {
    const r = await runFirecrawlTool({
      tool: 'search',
      endpoint: '/search',
      method: 'POST',
      body: { query: s.query, limit: 5 },
      outPath: s.out,
    });
    console.log(`SEARCH ${s.name}: status=${r.status} ok=${r.ok} web=${r.json?.data?.web?.length ?? 0}`);
    await sleep(5300);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
