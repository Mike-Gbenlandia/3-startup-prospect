import { runFirecrawlTool } from './fc.ts';
import fs from 'fs';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const searches: { name: string; query: string; limit?: number; out: string }[] = [
    {
      name: 'verify_zecathon_infracredit_minisend_tapnob',
      query: '("Cutstruct" OR "Sproutly" OR "AUI BRAND" OR "ProDevs") Nigeria startup official website',
      limit: 10,
      out: 'evidence/phase2/web_zecathon_sites.json',
    },
    {
      name: 'verify_infracredit_udu_minisend_tapnob',
      query: '("Magnificent Catalytic Inclusions" OR "Electrify Microgrid" OR "UduTech" OR "Minisend") (Nigeria OR Lagos OR Abuja) website',
      limit: 10,
      out: 'evidence/phase2/web_infra_udu_mini.json',
    },
    {
      name: 'verify_tapnob_date',
      query: '"Tapnob" ("Bitcoin Development Fund" OR "Human Rights Foundation" OR "HRF") 2026',
      limit: 10,
      out: 'evidence/phase2/verify_tapnob_date.json',
    },
    {
      name: 'verify_infracredit_2nd_press',
      query: '("Magnificent Catalytic Inclusions" OR "Electrify Microgrid") InfraCredit Nigeria November 2026',
      limit: 10,
      out: 'evidence/phase2/verify_infracredit_2nd.json',
    },
    {
      name: 'web_hackaholics_rest',
      query: '("SocialSign" OR "Neural Forge" OR "Nexa AI" OR "Vhorde" OR "All-Arbitrates" OR "Niteon") Nigeria startup website',
      limit: 10,
      out: 'evidence/phase2/web_hackaholics_rest.json',
    },
    {
      name: 'web_batch_1_idice',
      query: '("Telios" OR "Leaflet" OR "Kadosh Mechatronics" OR "FriendnPal" OR "Glorious Farmgate" OR "Fuse Varsity") Nigeria website',
      limit: 10,
      out: 'evidence/phase2/web_b1_idice.json',
    },
    {
      name: 'web_batch_2_idice',
      query: '("Odnaworld" OR "TESA Global" OR "CostGraph" OR "SavvyBee" OR "Vantrace" OR "GoDash") Nigeria startup website',
      limit: 10,
      out: 'evidence/phase2/web_b2_idice.json',
    },
    {
      name: 'web_batch_3_cascador',
      query: '("Brimble" OR "Lenol" OR "Storipod" OR "Parakletus Hub" OR "UpSmart Energies" OR "Zannytecture") Nigeria website',
      limit: 10,
      out: 'evidence/phase2/web_b3_cascador.json',
    },
    {
      name: 'web_batch_4_misc',
      query: '("Drych Digital" OR "Shellify" OR "Agrosavvy" OR "Supplya" OR "Tryctor" OR "PricePally") Nigeria website',
      limit: 10,
      out: 'evidence/phase2/web_b4_misc.json',
    },
    {
      name: 'web_batch_5_edtech',
      query: '("Zummey" OR "DAWN AI Study" OR "Lena" OR "Ileemore" OR "Heels and Tech" OR "NursePadi") Nigeria edtech website',
      limit: 10,
      out: 'evidence/phase2/web_b5_edtech.json',
    },
    {
      name: 'web_batch_6_edtech2',
      query: '("Lalitah" OR "TrainDTrainer" OR "Skillup Africa" OR "Ribara Analytica" OR "Skilladder" OR "Efiwe" OR "Talktu") Nigeria website',
      limit: 10,
      out: 'evidence/phase2/web_b6_edtech2.json',
    },
    {
      name: 'web_batch_7_scf_other',
      query: '("Choppaddi" OR "Blink Labs" OR "Jumpa" OR "useazza" OR "Paycashless" OR "Codar Tech") Nigeria website',
      limit: 10,
      out: 'evidence/phase2/web_b7_scf.json',
    },
    {
      name: 'web_batch_8_last',
      query: '("Mathesis Analytics" OR "Timon" OR "Data Entry Academy" OR "Varsity Scape" OR "AUI BRAND") Nigeria website',
      limit: 10,
      out: 'evidence/phase2/web_b8_last.json',
    },
  ];

  const scrapes: { name: string; url: string; out: string; md: string }[] = [
    {
      name: 'talent_nation_da',
      url: 'https://disruptafrica.com/2026/10/30/aboyeji-backed-ai-engineering-talent-platform-talent-nation-raises-pre-seed-funding/',
      out: 'evidence/phase2/talent_nation_da.json',
      md: 'evidence/phase2/talent_nation_da.md',
    },
    {
      name: 'vibe_jungle_article',
      url: 'https://african-startups.com/news/funding/vibe-jungle-raises-400k-to-lower-production-costs-for-african-creators/',
      out: 'evidence/phase2/vibe_jungle_article_48cd48bf34.json',
      md: 'evidence/phase2/vibe_jungle_article_48cd48bf34.md',
    },
    {
      name: 'storipod_condia',
      url: 'https://thecondia.com/chude-jideonwo-storipod-investment-board-chair/',
      out: 'evidence/phase2/storipod_condia.json',
      md: 'evidence/phase2/storipod_condia.md',
    },
    {
      name: 'trade_lenda_vc',
      url: 'https://newsandviews.vilcap.com/press-releases/africa-ecosystem-catalysts-facility-expands-into-nigeria-with-usd-450k-in-first-investments',
      out: 'evidence/phase2/trade_lenda_vc_b10.json',
      md: 'evidence/phase2/trade_lenda_vc_b10.md',
    },
    {
      name: 'terra_pr',
      url: 'https://www.finsmes.com/2026/08/terra-industries-raises-additional-18m-in-funding.html',
      out: 'evidence/phase2/terra_pr_b11.json',
      md: 'evidence/phase2/terra_pr_b11.md',
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
      body: { query: s.query, limit: s.limit ?? 10 },
      outPath: s.out,
    });
    console.log(`SEARCH ${s.name}: status=${r.status} ok=${r.ok} web=${r.json?.data?.web?.length ?? 0}`);
    await sleep(6500);
  }

  for (const s of scrapes) {
    if (fs.existsSync(s.out)) {
      console.log(`CACHED ${s.name}`);
      continue;
    }
    const r = await runFirecrawlTool({
      tool: 'scrape',
      endpoint: '/scrape',
      method: 'POST',
      body: { url: s.url, formats: ['markdown'] },
      outPath: s.out,
      markdownOutPath: s.md,
    });
    console.log(`SCRAPE ${s.name}: status=${r.status} ok=${r.ok}`);
    await sleep(6500);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
