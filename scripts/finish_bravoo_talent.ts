import 'dotenv/config';
import fs from 'fs';
import { runFirecrawlTool } from './fc.ts';
import { runInstagramAudit } from './phase3_fetch.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scrapePage(url: string, jsonPath: string, mdPath: string) {
  await sleep(6600);
  return runFirecrawlTool({
    tool: 'scrape',
    endpoint: '/scrape',
    method: 'POST',
    body: { url, formats: ['markdown', 'links'], onlyMainContent: false },
    outPath: jsonPath,
    markdownOutPath: mdPath,
  });
}

async function main() {
  await scrapePage(
    'https://joinbravoo.com/brands',
    'evidence/phase4/bravoo_brands.json',
    'evidence/phase4/bravoo_brands.md'
  );
  const bravooIg = await runInstagramAudit(
    'bravoo',
    'https://www.instagram.com/flowvahub/',
    'evidence/phase4',
    true
  );
  fs.writeFileSync('evidence/phase4/bravoo_ig_summary.json', JSON.stringify(bravooIg, null, 2));

  await sleep(6600);
  await scrapePage(
    'https://talentnation.ai/about/',
    'evidence/phase4/talent-nation_ai_about.json',
    'evidence/phase4/talent-nation_ai_about.md'
  );
  await scrapePage(
    'https://talentnation.ai/what-we-do/',
    'evidence/phase4/talent-nation_whatwedo.json',
    'evidence/phase4/talent-nation_whatwedo.md'
  );
  const tnIg = await runInstagramAudit(
    'talent-nation',
    'https://www.instagram.com/talentnation.ai/',
    'evidence/phase4',
    true
  );
  fs.writeFileSync('evidence/phase4/talent-nation_ig_summary.json', JSON.stringify(tnIg, null, 2));
  console.log('Done finish_bravoo_talent:', {
    bravooIgOk: bravooIg.ok,
    bravooIgBlocked: bravooIg.blocked,
    tnIgOk: tnIg.ok,
    tnIgBlocked: tnIg.blocked,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
