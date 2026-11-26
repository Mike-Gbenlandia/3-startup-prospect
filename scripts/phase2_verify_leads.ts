import { runFirecrawlTool } from './fc.ts';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const searches: { name: string; query: string; out: string }[] = [
    {
      name: 'food_apps_1',
      query: '("BukaFinder" OR "Dado Food" OR "DownloadChow" OR "Foodelo") Nigeria funding OR founded OR launched',
      out: 'evidence/phase2/search_food_apps_1.json',
    },
    {
      name: 'food_apps_2',
      query: '("FoodNaija" OR "Heyfood" OR "Squaay") Nigeria funding OR raised 2025 OR 2026',
      out: 'evidence/phase2/search_food_apps_2.json',
    },
    {
      name: 'rex_africa',
      query: '"Rex Africa" OR "Rex Microfinance Bank" Nigeria founded OR raised OR funding',
      out: 'evidence/phase2/search_rex_africa.json',
    },
    {
      name: 'exploit_forge',
      query: '"Exploit-Forge" OR "Strikehound" Nigeria founded OR funding',
      out: 'evidence/phase2/search_exploit_forge.json',
    },
    {
      name: 'lagos_life',
      query: '"Lagos Life" Nigeria 500k OR angel OR funding 2026',
      out: 'evidence/phase2/search_lagos_life.json',
    },
    {
      name: 'protein_kapital',
      query: '"Protein Kapital" Nigeria prize OR grant OR funding 2026',
      out: 'evidence/phase2/search_protein_kapital.json',
    },
    {
      name: 'tradevu',
      query: '"Tradevu" Nigeria "Renew Capital" OR funding',
      out: 'evidence/phase2/search_tradevu.json',
    },
    {
      name: 'rigo',
      query: '"Rigo" Nigeria "Renew Capital" OR "Rigo Incorporated"',
      out: 'evidence/phase2/search_rigo.json',
    },
    {
      name: 'varsity_scape',
      query: '"Varsity Scape" timbuktoo EdTech 2026',
      out: 'evidence/phase2/search_varsity_scape.json',
    },
    {
      name: 'rise_of_fearless',
      query: '"Rise of Fearless" "Epic Edges" Nigeria OR Ethiopia headquarters',
      out: 'evidence/phase2/search_rise_of_fearless.json',
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

  const scrapes: { name: string; url: string; out: string; md: string }[] = [
    {
      name: 'rexafrica_home',
      url: 'https://www.rexafrica.com/',
      out: 'evidence/phase2/rexafrica_home.json',
      md: 'evidence/phase2/rexafrica_home.md',
    },
    {
      name: 'lagos_life_sl',
      url: 'https://www.startuplist.africa/funding/lagos-life-angel-500k-usd-a6db764',
      out: 'evidence/phase2/lagos_life_sl.json',
      md: 'evidence/phase2/lagos_life_sl.md',
    },
    {
      name: 'protein_kapital_sl',
      url: 'https://www.startuplist.africa/funding/protein-kapital-equity-free-prize-70k-usd-007311e',
      out: 'evidence/phase2/protein_kapital_sl.json',
      md: 'evidence/phase2/protein_kapital_sl.md',
    },
    {
      name: 'rise_of_fearless_condia',
      url: 'https://thecondia.com/rise-of-fearless-raises-1m-epic-edges/',
      out: 'evidence/phase2/rise_of_fearless_condia.json',
      md: 'evidence/phase2/rise_of_fearless_condia.md',
    },
  ];

  for (const sc of scrapes) {
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
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
