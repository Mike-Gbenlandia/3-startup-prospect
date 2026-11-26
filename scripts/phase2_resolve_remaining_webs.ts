import { runFirecrawlTool } from './fc.ts';
import fs from 'fs';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const searches: { name: string; query: string; out: string }[] = [
    {
      name: 'web_rem_1_minisend_udu',
      query: '("Minisend" founder Nigeria OR Kenya) OR ("UduTech" OR "Udu Technologies" website Nigeria)',
      out: 'evidence/phase2/web_rem_1_minisend_udu.json',
    },
    {
      name: 'web_rem_2_hackaholics',
      query: '("All-Arbitrates" OR "SocialSign" OR "Neural Forge" OR "Nexa AI" OR "Vhorde") Nigeria ("website" OR ".com" OR ".ng" OR ".ai" OR ".io")',
      out: 'evidence/phase2/web_rem_2_hackaholics.json',
    },
    {
      name: 'web_rem_3_idice',
      query: '("Glorious Farmgate" OR "Odnaworld" OR "TESA Global" OR "CostGraph" OR "SavvyBee" OR "Vantrace" OR "GoDash") Nigeria site',
      out: 'evidence/phase2/web_rem_3_idice.json',
    },
    {
      name: 'web_rem_4_cascador',
      query: '("Parakletus Hub" OR "UpSmart Energies" OR "Zannytecture" OR "Shellify" OR "Agrosavvy" OR "Supplya") Nigeria website',
      out: 'evidence/phase2/web_rem_4_cascador.json',
    },
    {
      name: 'web_rem_5_edtech_scf',
      query: '("Ileemore" OR "Heels and Tech" OR "Ribara Analytica" OR "Blink Labs" OR "Jumpa" OR "Paycashless") Nigeria website',
      out: 'evidence/phase2/web_rem_5_edtech_scf.json',
    },
    {
      name: 'web_rem_6_misc',
      query: '("Regxta" OR "Varsity Scape" OR "Zummey" OR "AUI BRAND" OR "Talent Nation") Nigeria website',
      out: 'evidence/phase2/web_rem_6_misc.json',
    },
  ];

  for (const s of searches) {
    if (fs.existsSync(s.out)) {
      console.log(`CACHED ${s.name}`);
      continue;
    }
    const r = await runFirecrawlTool({
      tool: 'search',
      endpoint: '/search',
      method: 'POST',
      body: { query: s.query, limit: 10 },
      outPath: s.out,
    });
    console.log(`SEARCH ${s.name}: status=${r.status} ok=${r.ok} web=${r.json?.data?.web?.length ?? 0}`);
    await sleep(6500);
  }

  if (!fs.existsSync('evidence/phase2/minisend_site.json')) {
    const r = await runFirecrawlTool({
      tool: 'scrape',
      endpoint: '/scrape',
      method: 'POST',
      body: { url: 'https://minisend.xyz/', formats: ['markdown'] },
      outPath: 'evidence/phase2/minisend_site.json',
      markdownOutPath: 'evidence/phase2/minisend_site.md',
    });
    console.log(`SCRAPE minisend_site: status=${r.status} ok=${r.ok}`);
    await sleep(6500);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
