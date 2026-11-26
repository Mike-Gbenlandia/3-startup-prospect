import { runFirecrawlTool } from './fc.ts';
import fs from 'fs';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const q = JSON.parse(fs.readFileSync('evidence/phase2/phase2_queue.json', 'utf8'));
  const moonNames: string[] = q.slice(279, 340).map((x: any) => x.name);
  const h1Names: string[] = q.slice(340).map((x: any) => x.name);

  const searches: { name: string; query: string; limit?: number; out: string }[] = [
    // 1. F6S external investors + Varsity Scape
    {
      name: 'f6s_boundlessfi',
      query: '"Boundlessfi" "Stellar" OR funding OR grant 2025 OR 2026',
      limit: 5,
      out: 'evidence/phase2/search_f6s_boundlessfi.json',
    },
    {
      name: 'f6s_flezpay',
      query: '"FLEZPAY" ("Circle" OR "Tony Elumelu" OR funding OR raised) 2025 OR 2026',
      limit: 5,
      out: 'evidence/phase2/search_f6s_flezpay.json',
    },
    {
      name: 'f6s_vestgas_uuamni_techwheel',
      query: '("VestGas" OR "UUAMNI" OR "Techwheel Africa" OR "African Intelligence Cloud") Nigeria funding OR raised 2025 OR 2026',
      limit: 8,
      out: 'evidence/phase2/search_f6s_vestgas_uuamni.json',
    },
    {
      name: 'varsity_scape_prize',
      query: '"Varsity Scape" ("timbuktoo" OR "Mastercard" OR "prize" OR "grant") 2026',
      limit: 8,
      out: 'evidence/phase2/search_varsity_scape_prize.json',
    },

    // 2. Missing Jul-Nov 2026 deals (Startuplist monthly + press + accelerators)
    {
      name: 'sl_jul_2026',
      query: 'site:startuplist.africa/funding/ "Nigeria" "Jul 2026"',
      limit: 20,
      out: 'evidence/phase2/search_sl_jul_2026.json',
    },
    {
      name: 'sl_aug_2026',
      query: 'site:startuplist.africa/funding/ "Nigeria" "Aug 2026"',
      limit: 20,
      out: 'evidence/phase2/search_sl_aug_2026.json',
    },
    {
      name: 'sl_sep_2026',
      query: 'site:startuplist.africa/funding/ "Nigeria" "Sep 2026"',
      limit: 20,
      out: 'evidence/phase2/search_sl_sep_2026.json',
    },
    {
      name: 'sl_oct_2026',
      query: 'site:startuplist.africa/funding/ "Nigeria" "Oct 2026"',
      limit: 20,
      out: 'evidence/phase2/search_sl_oct_2026.json',
    },
    {
      name: 'sl_nov_2026',
      query: 'site:startuplist.africa/funding/ "Nigeria" "Nov 2026"',
      limit: 20,
      out: 'evidence/phase2/search_sl_nov_2026.json',
    },
    {
      name: 'press_tier_ab_2026',
      query: 'Nigeria startup ("pre-seed" OR "seed" OR "angel") ("Jul 2026" OR "Aug 2026" OR "Sep 2026" OR "Oct 2026" OR "Nov 2026" OR "July 2026" OR "August 2026" OR "September 2026" OR "October 2026" OR "November 2026")',
      limit: 20,
      out: 'evidence/phase2/search_press_tier_ab_2026.json',
    },
    {
      name: 'acc_global_2026',
      query: 'Nigeria startup ("Antler" OR "Techstars" OR "Y Combinator" OR "Microtraction" OR "Future Africa" OR "Ventures Platform") "2026" ("cohort" OR "invests" OR "backs" OR "raises")',
      limit: 15,
      out: 'evidence/phase2/search_acc_global_2026.json',
    },
    {
      name: 'acc_local_competitions_2026',
      query: 'Nigeria startup ("Wema Hackaholics" OR "Ecobank Fintech Challenge" OR "Tony Elumelu" OR "Orange Corners" OR "Zecathon") "2026" (winner OR winners OR cohort OR prize)',
      limit: 15,
      out: 'evidence/phase2/search_acc_local_2026.json',
    },
    {
      name: 'acc_other_2026',
      query: 'Nigeria startup ("Lagos Innovates" OR "NITDA" OR "Ingressive" OR "LoftyInc" OR "Catalyst Fund" OR "MEST") "2026" (grant OR cohort OR funding)',
      limit: 15,
      out: 'evidence/phase2/search_acc_other_2026.json',
    },
    {
      name: 'local_press_2026',
      query: '(site:nairametrics.com OR site:businessday.ng OR site:technext24.com) Nigeria startup ("raises" OR "secures" OR "funding" OR "pre-seed" OR "seed") "2026"',
      limit: 15,
      out: 'evidence/phase2/search_local_press_2026.json',
    },
  ];

  // 3. Moonshot 61 names in chunks of 8
  for (let i = 0; i < moonNames.length; i += 8) {
    const chunk = moonNames.slice(i, i + 8);
    const ors = chunk.map((n) => `"${n}"`).join(' OR ');
    const idx = Math.floor(i / 8) + 1;
    searches.push({
      name: `moonshot_${idx}`,
      query: `(${ors}) Nigeria (funding OR raised OR "pre-seed" OR "seed" OR grant) 2026`,
      limit: 10,
      out: `evidence/phase2/search_moonshot_${idx}.json`,
    });
  }

  // 4. H1 2026 33 names in chunks of 9
  for (let i = 0; i < h1Names.length; i += 9) {
    const chunk = h1Names.slice(i, i + 9);
    const ors = chunk.map((n) => `"${n}"`).join(' OR ');
    const idx = Math.floor(i / 9) + 1;
    searches.push({
      name: `h1_followup_${idx}`,
      query: `(${ors}) Nigeria (funding OR raised OR grant) ("July 2026" OR "August 2026" OR "September 2026" OR "October 2026" OR "November 2026")`,
      limit: 10,
      out: `evidence/phase2/search_h1_followup_${idx}.json`,
    });
  }

  console.log(`Running ${searches.length} searches...`);
  for (const s of searches) {
    if (fs.existsSync(s.out)) {
      console.log(`CACHED ${s.name}`);
      continue;
    }
    const r = await runFirecrawlTool({
      tool: 'search',
      endpoint: '/search',
      method: 'POST',
      body: { query: s.query, limit: s.limit ?? 10 },
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
