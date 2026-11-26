import { runFirecrawlTool } from './fc.ts';
import fs from 'fs';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const scrapes: { name: string; url: string; out: string; md: string }[] = [
    { name: 'sl_elementpay', url: 'https://www.startuplist.africa/funding/elementpay-grant-90k-usd-24b9bd3', out: 'evidence/phase2/sl_elementpay.json', md: 'evidence/phase2/sl_elementpay.md' },
    { name: 'sl_udu', url: 'https://www.startuplist.africa/funding/udu-technologies-seed-undisclosed-92f3436', out: 'evidence/phase2/sl_udu.json', md: 'evidence/phase2/sl_udu.md' },
    { name: 'sl_smartel', url: 'https://www.startuplist.africa/funding/smartel-agritech-equity-free-prize-4000-usd-61bf6d0', out: 'evidence/phase2/sl_smartel.json', md: 'evidence/phase2/sl_smartel.md' },
    { name: 'sl_minisend', url: 'https://www.startuplist.africa/funding/minisend-grant-100k-usd-34144a3', out: 'evidence/phase2/sl_minisend.json', md: 'evidence/phase2/sl_minisend.md' },
    { name: 'sl_bisedge', url: 'https://www.startuplist.africa/funding/bisedge-debt-financing-11-2m-eur-066816a', out: 'evidence/phase2/sl_bisedge.json', md: 'evidence/phase2/sl_bisedge.md' },
    { name: 'sl_all_arbitrates', url: 'https://www.startuplist.africa/funding/all-arbitrates-grant-20m-ngn-f9582ee', out: 'evidence/phase2/sl_all_arbitrates.json', md: 'evidence/phase2/sl_all_arbitrates.md' },
    { name: 'sl_mamaalert', url: 'https://www.startuplist.africa/funding/mamaalert-grant-20m-ngn-073891c', out: 'evidence/phase2/sl_mamaalert.json', md: 'evidence/phase2/sl_mamaalert.md' },
    { name: 'sl_uri_social', url: 'https://www.startuplist.africa/funding/uri-social-grant-10m-ngn-ec50f2a', out: 'evidence/phase2/sl_uri_social.json', md: 'evidence/phase2/sl_uri_social.md' },
    { name: 'sl_pivo', url: 'https://startuplist.africa/funding/pivo-grant-undisclosed-dae2f28', out: 'evidence/phase2/sl_pivo.json', md: 'evidence/phase2/sl_pivo.md' },
    { name: 'sl_edves', url: 'https://startuplist.africa/funding/edves-seed-575k-usd-1abbdd8', out: 'evidence/phase2/sl_edves.json', md: 'evidence/phase2/sl_edves.md' },
    { name: 'sl_suregroup', url: 'https://startuplist.africa/funding/suregroup-seed-125k-usd-6c82a39', out: 'evidence/phase2/sl_suregroup.json', md: 'evidence/phase2/sl_suregroup.md' },
    { name: 'sl_truckr', url: 'https://startuplist.africa/funding/truckr-seed-100k-usd-42f508e', out: 'evidence/phase2/sl_truckr.json', md: 'evidence/phase2/sl_truckr.md' },
    { name: 'wema_hackaholics7', url: 'https://techbuild.africa/wema-%e2%82%a6300m-11-nigerian-startups-hackaholics-7/', out: 'evidence/phase2/wema_hackaholics7.json', md: 'evidence/phase2/wema_hackaholics7.md' },
    { name: 'da_aecf_2', url: 'https://disruptafrica.com/2026/09/07/2-nigerian-startups-secure-450k-from-africa-ecosystem-catalysts-facility/', out: 'evidence/phase2/da_aecf_2.json', md: 'evidence/phase2/da_aecf_2.md' },
    { name: 'da_nomba', url: 'https://disruptafrica.com/2026/09/07/nigerian-fintech-startup-nomba-secures-3m-debt-facility-to-scale-cross-border-payments/', out: 'evidence/phase2/da_nomba.json', md: 'evidence/phase2/da_nomba.md' },
    { name: 'boundless_scf', url: 'https://www.trustlesswork.com/escrow-times/news-boundless-scf-grant', out: 'evidence/phase2/boundless_scf.json', md: 'evidence/phase2/boundless_scf.md' },
    { name: 'flezpay_arc', url: 'https://www.arc.io/blog/arc-as-a-catalyst-for-circle-grant-recipients-in-africa-and-the-global-south', out: 'evidence/phase2/flezpay_arc.json', md: 'evidence/phase2/flezpay_arc.md' },
    { name: 'nm_sep_2026', url: 'https://nairametrics.com/2026/10/12/nigerian-startups-raise-11-3-million-in-september-2026-down-97-from-august/', out: 'evidence/phase2/nm_sep_2026.json', md: 'evidence/phase2/nm_sep_2026.md' },
    { name: 'as_jul_2026', url: 'https://african-startups.com/news/funding/meet-the-african-startups-that-raised-funding-in-july-2026/', out: 'evidence/phase2/as_jul_2026.json', md: 'evidence/phase2/as_jul_2026.md' },
    { name: 'tc_jul_2026', url: 'https://insights.techcabal.com/224m-raised-in-july-2026-electric-vehicles-dominate/', out: 'evidence/phase2/tc_jul_2026.json', md: 'evidence/phase2/tc_jul_2026.md' },
    { name: 'first_electric_esi', url: 'https://www.esi-africa.com/renewable-energy/nigeria-fights-back-for-its-power-through-solar-technology/', out: 'evidence/phase2/first_electric_esi.json', md: 'evidence/phase2/first_electric_esi.md' },
    { name: 'first_electric_ic', url: 'https://infracredit.ng/infracredits-guarantee-supported-by-uk-funded-climate-finance-blending-facility-mobilises-local-currency-debt-for-first-electrics-off-grid-energy-project-in-nigeria/', out: 'evidence/phase2/first_electric_ic.json', md: 'evidence/phase2/first_electric_ic.md' },
    { name: 'hult_devspace', url: 'https://technext24.com/news/devspace-wins-hult-prize-nigeria-2026/', out: 'evidence/phase2/hult_devspace.json', md: 'evidence/phase2/hult_devspace.md' },
  ];

  const searches: { name: string; query: string; limit?: number; out: string }[] = [
    {
      name: 'zecathon_websites',
      query: '("Cutstruct" OR "Sproutly" OR "AUI BRAND" OR "ProDevs") Nigeria (website OR "Zecathon" OR startup)',
      limit: 10,
      out: 'evidence/phase2/search_zecathon_winners.json',
    },
    {
      name: 'innovest_ignite_5',
      query: '"Innovest Ignite" "Cohort 5" OR "VestGas" 2026',
      limit: 8,
      out: 'evidence/phase2/search_innovest_ignite5.json',
    },
    {
      name: 'first_electric_saf_aga',
      query: '"First Electric" "Maskh" "Saf-Aga" 2026',
      limit: 6,
      out: 'evidence/phase2/search_saf_aga_nov2026.json',
    },
    {
      name: 'powerlabs_date_check',
      query: '"PowerLabs" "Breega" Nigeria "pre-seed" 2026',
      limit: 6,
      out: 'evidence/phase2/search_powerlabs_date.json',
    },
  ];

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
    await sleep(5300);
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
      body: { query: s.query, limit: s.limit ?? 8 },
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
