import { runFirecrawlTool } from './fc.ts';
import fs from 'fs';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const scrapes: { name: string; url: string; out: string; md: string; force?: boolean }[] = [
    { name: 'sl_suregroup', url: 'https://www.startuplist.africa/funding/suregroup-seed-125k-usd-6c82a39', out: 'evidence/phase2/sl_suregroup.json', md: 'evidence/phase2/sl_suregroup.md', force: true },
    { name: 'guardian_hackaholics7', url: 'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/', out: 'evidence/phase2/guardian_hackaholics7.json', md: 'evidence/phase2/guardian_hackaholics7.md' },
    { name: 'zecathon_thisday_c99da60436', url: 'https://www.thisdaylive.com/2026/11/19/zenith-bank-unveils-n190m-zecathon-6-0-winners', out: 'evidence/phase2/zecathon_thisday_c99da60436.json', md: 'evidence/phase2/zecathon_thisday_c99da60436.md' },
    { name: 'circle_grants_2026', url: 'https://www.circle.com/blog/announcing-the-first-circle-grant-recipients-in-2026', out: 'evidence/phase2/circle_grants_2026.json', md: 'evidence/phase2/circle_grants_2026.md' },
    { name: 'bitke_scf45', url: 'https://bitcoinke.io/2026/10/stellar-community-fund-45', out: 'evidence/phase2/bitke_scf45.json', md: 'evidence/phase2/bitke_scf45.md' },
    { name: 'bisedge_pr', url: 'https://www.prnewswire.com/news-releases/bisedge-secures-10-million-long-term-loan-from-finnfund-to-expand-electric-intralogistics-fleet-in-nigeria-and-east-africa-302902397.html', out: 'evidence/phase2/bisedge_pr.json', md: 'evidence/phase2/bisedge_pr.md' },
    { name: 'infracredit_mci_nov2026', url: 'https://infracredit.ng/infracredit-guarantee-catalyses-local-debt-financing-for-magnificent-catalytic-inclusions-limiteds-off-grid-energy-expansion-in-nigeria/', out: 'evidence/phase2/infracredit_mci_nov2026.json', md: 'evidence/phase2/infracredit_mci_nov2026.md' },
    { name: 'infracredit_electrify_nov2026', url: 'https://infracredit.ng/infracredits-guarantee-backed-by-uk-funded-climate-finance-blending-facility-supports-first-productive-use-led-mini-grid-transaction-for-electrify-microgrid-in-nigeria/', out: 'evidence/phase2/infracredit_electrify_nov2026.json', md: 'evidence/phase2/infracredit_electrify_nov2026.md' },
    { name: 'tc_swap_ev', url: 'https://techcabal.com/2026/07/30/nigerias-petrol-three-wheelers-are-going-electric-with-batteries/', out: 'evidence/phase2/tc_swap_ev.json', md: 'evidence/phase2/tc_swap_ev.md' },
    { name: 'as_trashcoin', url: 'https://african-startups.com/countries/nigeria/female-led-vc-firm-jambaar-capital-invests-in-trashcoin-the-startup-turning-recyclable-waste-into-digital-cash/', out: 'evidence/phase2/as_trashcoin.json', md: 'evidence/phase2/as_trashcoin.md' },
    { name: 'f6s_166_crawdwall', url: 'https://www.f6s.com/company/crawdwall-capital', out: 'evidence/phase2/f6s_166_crawdwall.json', md: 'evidence/phase2/f6s_166_crawdwall.md' },
    { name: 'f6s_189_terarchy', url: 'https://www.f6s.com/company/terarchy', out: 'evidence/phase2/f6s_189_terarchy.json', md: 'evidence/phase2/f6s_189_terarchy.md' },
    { name: 'f6s_196_vokta_labs', url: 'https://www.f6s.com/company/vokta-labs', out: 'evidence/phase2/f6s_196_vokta_labs.json', md: 'evidence/phase2/f6s_196_vokta_labs.md' },
    { name: 'f6s_198_xcrowpay', url: 'https://www.f6s.com/company/xcrowpay', out: 'evidence/phase2/f6s_198_xcrowpay.json', md: 'evidence/phase2/f6s_198_xcrowpay.md' },
    { name: 'f6s_212_budgexa', url: 'https://www.f6s.com/company/budgexa', out: 'evidence/phase2/f6s_212_budgexa.json', md: 'evidence/phase2/f6s_212_budgexa.md' },
    { name: 'f6s_268_tapnob', url: 'https://www.f6s.com/company/tapnob', out: 'evidence/phase2/f6s_268_tapnob.json', md: 'evidence/phase2/f6s_268_tapnob.md' },
  ];

  const searches: { name: string; query: string; limit?: number; out: string }[] = [
    {
      name: 'zecathon_2nd_press',
      query: '"Zecathon 6.0" ("Cutstruct" OR "Sproutly" OR "AUI BRAND" OR "ProDevs" OR "Pharmarun") 2026',
      limit: 10,
      out: 'evidence/phase2/search_zecathon_2nd.json',
    },
    {
      name: 'hackaholics7_websites',
      query: '("Acceede" OR "SocialSign" OR "Neural Forge" OR "Nexa AI" OR "Vhorde" OR "All-Arbitrates" OR "MamaAlert") Nigeria (website OR startup OR "Hackaholics")',
      limit: 12,
      out: 'evidence/phase2/search_hackaholics7_sites.json',
    },
    {
      name: 'f6s_batch1',
      query: '("Adbox Technologies" OR "ARA WORLD" OR "Arobo Escrow" OR "Crawdwall" OR "Fleetcheckr" OR "Luxa E-commerce" OR "NotesApp" OR "PostSafe" OR "PropaBridge" OR "Sabi Ride" OR "Terarchy" OR "Trakiva" OR "Techwheel Africa") Nigeria (funding OR grant OR raised OR accelerator) 2026',
      limit: 10,
      out: 'evidence/phase2/search_f6s_batch1.json',
    },
    {
      name: 'f6s_batch2',
      query: '("Trypz" OR "Vokta Labs" OR "Xcrowpay" OR "Budgexa" OR "Tapnob" OR "AUI BRAND" OR "Swap" OR "Magnificent Catalytic" OR "Electrify Microgrid") Nigeria (funding OR grant OR raised OR accelerator) 2026',
      limit: 10,
      out: 'evidence/phase2/search_f6s_batch2.json',
    },
    {
      name: 'moonshot_extra_1',
      query: '("Bitoshi" OR "Bluebulb" OR "BrandX" OR "Centrave" OR "Credlock" OR "Demfati" OR "Doux Finance" OR "Edutech Global" OR "Esca Finance" OR "Flowsoft" OR "Gopaddi" OR "Gosar" OR "HomeFairyTech" OR "Hyperbridge" OR "JusticePadi") Nigeria (raised OR funding OR seed OR grant) 2026',
      limit: 10,
      out: 'evidence/phase2/search_moonshot_extra1.json',
    },
    {
      name: 'moonshot_extra_2',
      query: '("Kivo" OR "Klout" OR "Kredete" OR "LincRide" OR "Manamuz" OR "Mercurie" OR "Monica" OR "MyPadi" OR "Nefer" OR "Nitroswitch" OR "Obida" OR "Obiex" OR "Platnova" OR "Rivy" OR "Routag" OR "Scrella" OR "SmartSense" OR "SwiftXR" OR "Zent") Nigeria (raised OR funding OR seed OR grant) 2026',
      limit: 10,
      out: 'evidence/phase2/search_moonshot_extra2.json',
    },
  ];

  for (const s of scrapes) {
    if (!s.force && fs.existsSync(s.out)) {
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
