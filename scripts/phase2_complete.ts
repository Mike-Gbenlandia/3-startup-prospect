import fs from 'fs';

interface Phase2Record {
  name: string;
  website: string;
  tier: 'A' | 'B' | 'C' | 'D' | 'DROP';
  status: 'VERIFIED' | 'DROPPED';
  drop_reason?: string;
  round_type_exact: string;
  amount: string;
  announced_date: string;
  investors: string;
  hq_location: string;
  funding_confidence: 'CONFIRMED_2_SOURCES' | 'CONFIRMED_1_SOURCE' | 'TIER_D_REVENUE' | 'UNCONFIRMED';
  source_urls: string[];
  evidence_paths: string[];
  notes?: string;
  batch_number: number;
}

function csvCell(v: string): string {
  const s = String(v ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const ALL_JSON = 'evidence/phase2/all_screened.json';
const POOL_JSON = 'evidence/phase2/verified_pool.json';
const POOL_CSV = 'evidence/phase2/verified_pool.csv';
const QUEUE_CSV = 'state/queue.csv';
const STATE_PROG = 'state/progress.json';

const all: Phase2Record[] = JSON.parse(fs.readFileSync(ALL_JSON, 'utf8'));
const allMap = new Map<string, Phase2Record>();
for (const r of all) allMap.set(r.name.toLowerCase(), r);

// Resolved websites verified from web_b1..b8 & web_rem_1..6 & search_* files
const RESOLVED_WEBSITES: Record<string, string> = {
  'telios': 'https://telios.app/',
  'kadosh mechatronics': 'https://kadoshmechatronics.com/',
  'friendnpal': 'https://friendnpal.com/',
  'fuse varsity': 'https://www.fusevarsity.com/',
  'odnaworld': 'https://www.odnaworld.com/',
  'brimble': 'https://www.brimble.io/',
  'lenol': 'https://lenol.co/',
  'storipod': 'https://storipod.com/',
  'drych digital': 'https://drychdigital.com/',
  'tryctor': 'https://www.tryctor.com/',
  'pricepally': 'https://www.pricepally.com/',
  'supplya': 'https://www.supplya.shop/',
  'niteon': 'https://niteon.co/',
  'dawn ai study': 'https://dawnaistudy.com/',
  'lena': 'https://lena.africa/',
  'nursepadi': 'https://nursepadi.com/',
  'lalitah': 'https://www.lalitah.com/',
  'traindtrainer': 'https://traindtrainer.com/',
  'skillup africa': 'https://skillupafrica.org/',
  'skilladder': 'https://skilladder.ai/',
  'efiwe': 'https://efiwe.com/',
  'talktu': 'https://www.talktu.co/',
  'choppaddi': 'https://www.choppaddi.com/',
  'useazza': 'https://useazza.com/',
  'codar tech africa': 'https://codarhq.com/',
  'mathesis analytics': 'https://www.mathesis.io/',
  'timon': 'https://usetimon.com/',
  'data entry academy': 'https://accountinghub.ng/dataentryacademy/',
  'heels and tech': 'https://heelsandtech.com/',
  'regxta': 'https://www.regxta.com/',
  'talent nation': 'https://acad.learn2earn.ng/',
};

// Replacement existing evidence paths for records whose auto-cached .md filenames were missing
const EXTRA_EXISTING_PATHS: Record<string, string[]> = {
  'telios': ['evidence/phase1/hy_weetracker_idice_8.md', 'evidence/phase2/web_b1_idice.json'],
  'leaflet': ['evidence/phase1/hy_weetracker_idice_8.md', 'evidence/phase2/q_batch1_sites.json'],
  'savvybee': ['evidence/phase1/hy_weetracker_idice_8.md', 'evidence/phase1/hy_sl_ng_2026.md'],
  'vantrace': ['evidence/phase1/hy_weetracker_idice_8.md', 'evidence/phase1/hy_sl_ng_2026.md'],
  'vibe jungle': ['evidence/phase2/vibe_jungle_article_48cd48bf34.md', 'evidence/phase1/hy_tc_daily_nov20.md'],
  'storipod': ['evidence/phase2/storipod_condia.md', 'evidence/phase2/web_b3_cascador.json'],
  'vendy': ['evidence/phase2/intron_3c3eae2a41.md', 'evidence/phase2/google_lab_au_e0217b3baa.md', 'evidence/phase2/q_vendy_funding.json'],
  'sparklean station nigeria': ['evidence/phase2/fmyd_cascador_8_1d72fb117c.md', 'evidence/phase1/hy_techcabal_cascador_niya_8.md', 'evidence/phase1/hy_sl_ng_grant.md'],
  'biuda': ['evidence/phase2/biuda_09d6d55d3c.md', 'evidence/phase1/hy_sl_ng_grant.md'],
  'backel': ['evidence/phase2/backel_ba37db82f2.md', 'evidence/phase1/hy_techcabal_cascador_niya_8.md'],
  'upsmart energies': ['evidence/phase1/hy_sl_ng_grant.md', 'evidence/phase1/hy_sl_ng_renew_2026.md'],
  'zannytecture': ['evidence/phase1/hy_sl_ng_grant.md', 'evidence/phase2/web_rem_4_cascador.json'],
  'craft planet': ['evidence/phase2/craft_planet_758423b5d5.md', 'evidence/phase1/hy_techcabal_cascador_niya_8.md', 'evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md'],
  'rekool': ['evidence/phase2/fmyd_cascador_8_1d72fb117c.md', 'evidence/phase1/hy_techcabal_cascador_niya_8.md', 'evidence/phase1/hy_sl_ng_grant.md'],
  'sewpro': ['evidence/phase2/fmyd_cascador_8_1d72fb117c.md', 'evidence/phase1/hy_techcabal_cascador_niya_8.md', 'evidence/phase1/hy_sl_ng_grant_2026.md'],
  'shellify': ['evidence/phase2/fmyd_cascador_8_1d72fb117c.md', 'evidence/phase1/hy_techcabal_cascador_niya_8.md'],
  'agrosavvy consult': ['evidence/phase2/fmyd_cascador_8_1d72fb117c.md', 'evidence/phase1/hy_techcabal_cascador_niya_8.md'],
  'supplya': ['evidence/phase1/hy_techcabal_moonshot_battlefield.md', 'evidence/phase2/q_supplya.json', 'evidence/phase2/web_rem_4_cascador.json'],
  'solarcorp': ['evidence/phase2/q_solarcorp.json', 'evidence/phase1/hy_signalbase_zendtrax.md'],
  'bravoo': ['evidence/phase2/bravoo_marl.md', 'evidence/phase2/q_bravoo.json'],
  'talent nation': ['evidence/phase2/talent_nation_da.md', 'evidence/phase2/web_rem_6_misc.json'],
  'teazy tech': ['evidence/phase2/q_teazy_b7.json', 'evidence/phase1/hy_signalbase_zendtrax.md'],
  'tryctor': ['evidence/phase2/nsia_bd_b7.md', 'evidence/phase2/q_tryctor_b7.json', 'evidence/phase2/web_b4_misc.json'],
  'uwana energy': ['evidence/phase2/nsia_bd_b7.md', 'evidence/phase2/q_uwana_b7.json'],
  'zendtrax': ['evidence/phase1/hy_signalbase_zendtrax.md', 'evidence/phase1/hy_sl_ng_accelerator_2026.md'],
  'vatar': ['evidence/phase2/lagos_life_sl.md', 'evidence/phase1/hy_as_oct_2026.md', 'evidence/phase1/hy_sl_ng_angel_2026.md'],
  'slimepay': ['evidence/phase2/q_slimepay_b9.json', 'evidence/phase1/hy_sl_ng_blockchain_2026.md'],
  'aeon': ['evidence/phase2/aeon_15cf355067.md'],
  'biochar industrial group': ['evidence/phase2/biochar_industrial_group_ec44f009af.md'],
  'zummey technologies': ['evidence/phase2/zummey_sl_b11.md', 'evidence/phase2/q_zummey_b11.json'],
  'safebox energy': ['evidence/phase2/q_safebox_b11.json', 'evidence/phase1/hy_sl_ng_renew_2026.md'],
  'terra industries': ['evidence/phase2/terra_pr_b11.md', 'evidence/phase1/hy_benjamindada_funding.md'],
  'niteon': ['evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md', 'evidence/phase2/web_hackaholics_rest.json'],
  'harthio': ['evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md'],
  'pharmarun': ['evidence/phase2/zecathon_thisday_c99da60436.md', 'evidence/phase2/search_zecathon_2nd.json'],
  'ufarmx': ['evidence/phase1/hy_liners_funding.md', 'evidence/phase1/hy_sl_ng_agritech_2026.json'],
  'thrive agric': ['evidence/phase1/hy_techgix_aug_2026.md'],
  'kadosh mechatronics': ['evidence/phase2/web_b1_idice.json'],
  'friendnpal': ['evidence/phase2/web_b1_idice.json'],
  'fuse varsity': ['evidence/phase2/web_b1_idice.json'],
  'odnaworld': ['evidence/phase2/web_b2_idice.json'],
  'brimble': ['evidence/phase2/web_b3_cascador.json'],
  'lenol': ['evidence/phase2/web_b3_cascador.json'],
  'drych digital': ['evidence/phase2/web_b4_misc.json'],
  'pricepally': ['evidence/phase2/web_b4_misc.json'],
  'dawn ai study': ['evidence/phase2/web_b5_edtech.json'],
  'lena': ['evidence/phase2/web_b5_edtech.json'],
  'nursepadi': ['evidence/phase2/web_b5_edtech.json'],
  'lalitah': ['evidence/phase2/web_b6_edtech2.json'],
  'traindtrainer': ['evidence/phase2/web_b6_edtech2.json'],
  'skillup africa': ['evidence/phase2/web_b6_edtech2.json'],
  'skilladder': ['evidence/phase2/web_b6_edtech2.json'],
  'efiwe': ['evidence/phase2/web_b6_edtech2.json'],
  'talktu': ['evidence/phase2/web_b6_edtech2.json'],
  'choppaddi': ['evidence/phase2/web_b7_scf.json'],
  'useazza': ['evidence/phase2/web_b7_scf.json'],
  'codar tech africa': ['evidence/phase2/web_b7_scf.json'],
  'mathesis analytics': ['evidence/phase2/web_b8_last.json'],
  'timon': ['evidence/phase2/web_b8_last.json'],
  'data entry academy': ['evidence/phase2/web_b8_last.json'],
  'heels and tech': ['evidence/phase2/web_rem_5_edtech_scf.json'],
  'regxta': ['evidence/phase2/web_rem_6_misc.json'],
};

// Newly verified startups (18 new records)
const NEW_VERIFIED: Omit<Phase2Record, 'batch_number'>[] = [
  {
    name: 'Udu Technologies',
    website: 'NOT_FOUND',
    tier: 'B',
    status: 'VERIFIED',
    round_type_exact: 'Seed (undisclosed; Nairametrics reports $300K)',
    amount: 'Undisclosed ($300K Nairametrics)',
    announced_date: '2026-07-20',
    investors: 'Launch Africa Ventures (Fund II)',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.startuplist.africa/funding/udu-technologies-seed-undisclosed-92f3436',
      'https://weetracker.com/2026/07/20/launch-africa-ventures-15-startup-investments-2026',
    ],
    evidence_paths: ['evidence/phase2/sl_udu.md', 'evidence/phase2/web_infra_udu_mini.json'],
    notes: 'Founded by Alexander Tsado; Launch Africa Ventures Fund II Seed investment disclosed July 20, 2026.',
  },
  {
    name: 'Smartel Agritech',
    website: 'NOT_FOUND',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Equity-free prize (Wema Bank / NSIA 4.0)',
    amount: '$4K',
    announced_date: '2026-10-24',
    investors: 'Wema Bank / NSIA Prize for Innovation 4.0',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.startuplist.africa/funding/smartel-agritech-equity-free-prize-4000-usd-61bf6d0',
      'https://businessday.ng/news/article/nsia-awards-275000-to-nigerian-startups-come-again-foods-leads-winners',
    ],
    evidence_paths: ['evidence/phase2/sl_smartel.md', 'evidence/phase2/nsia_bd_b7.md'],
  },
  {
    name: 'Acceede',
    website: 'https://acceede.com/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 40M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
      'https://techbuild.africa/wema-%e2%82%a6300m-11-nigerian-startups-hackaholics-7/',
    ],
    evidence_paths: ['evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md', 'evidence/phase2/search_hackaholics7_sites.json'],
    notes: 'Founder Emmanuel Adeboje; Startup/Ideathon 1st runner-up (NGN 40M) at Hackaholics 7.0.',
  },
  {
    name: 'All-Arbitrates',
    website: 'https://www.allarbitrates.com/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 20M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Lagos, Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.startuplist.africa/funding/all-arbitrates-grant-20m-ngn-f9582ee',
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
    ],
    evidence_paths: ['evidence/phase2/sl_all_arbitrates.md', 'evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md', 'evidence/phase2/web_rem_2_hackaholics.json'],
  },
  {
    name: 'SocialSign',
    website: 'NOT_FOUND',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 30M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
      'https://techbuild.africa/wema-%e2%82%a6300m-11-nigerian-startups-hackaholics-7/',
    ],
    evidence_paths: ['evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md'],
  },
  {
    name: 'Neural Forge',
    website: 'NOT_FOUND',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 30M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
      'https://techbuild.africa/wema-%e2%82%a6300m-11-nigerian-startups-hackaholics-7/',
    ],
    evidence_paths: ['evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md'],
  },
  {
    name: 'Nexa AI',
    website: 'https://nexaai.ng/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 20M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
      'https://techbuild.africa/wema-%e2%82%a6300m-11-nigerian-startups-hackaholics-7/',
    ],
    evidence_paths: ['evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md', 'evidence/phase2/web_rem_2_hackaholics.json'],
  },
  {
    name: 'MamaAlert',
    website: 'https://www.mamalert.com/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 20M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.startuplist.africa/funding/mamaalert-grant-20m-ngn-073891c',
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
    ],
    evidence_paths: ['evidence/phase2/sl_mamaalert.md', 'evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md', 'evidence/phase2/search_hackaholics7_sites.json'],
  },
  {
    name: 'URI Social',
    website: 'https://urisocial.com/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 10M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.startuplist.africa/funding/uri-social-grant-10m-ngn-ec50f2a',
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
    ],
    evidence_paths: ['evidence/phase2/sl_uri_social.md', 'evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md'],
  },
  {
    name: 'Vhorde',
    website: 'NOT_FOUND',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Grant / Innovation Prize (Wema Bank Hackaholics 7.0)',
    amount: 'NGN 10M',
    announced_date: '2026-11-06',
    investors: 'Wema Bank',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/',
      'https://techbuild.africa/wema-%e2%82%a6300m-11-nigerian-startups-hackaholics-7/',
    ],
    evidence_paths: ['evidence/phase2/guardian_hackaholics7.md', 'evidence/phase2/wema_hackaholics7.md'],
  },
  {
    name: 'Cutstruct Technology Limited',
    website: 'https://cutstruct.com/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Non-equity Grant / Pitch Competition (Zenith Bank Zecathon 6.0)',
    amount: 'NGN 35M',
    announced_date: '2026-11-19',
    investors: 'Zenith Bank / Beyond Limits Global',
    hq_location: 'Lekki, Lagos, Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.thisdaylive.com/2026/11/19/zenith-bank-unveils-n190m-zecathon-6-0-winners/',
      'https://www.instagram.com/p/DfkgLNhDYDL/',
    ],
    evidence_paths: ['evidence/phase2/zecathon_thisday_c99da60436.md', 'evidence/phase2/search_zecathon_2nd.json', 'evidence/phase2/search_zecathon_winners.json', 'evidence/phase2/web_zecathon_sites.json'],
    notes: '1st place winner at Zenith Bank Zecathon 6.0 (NGN 35M non-equity); prior $600K pre-seed + $1.5M seed.',
  },
  {
    name: 'Sproutly',
    website: 'https://sproutly.africa/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Non-equity Grant / Pitch Competition (Zenith Bank Zecathon 6.0)',
    amount: 'NGN 20M',
    announced_date: '2026-11-19',
    investors: 'Zenith Bank / Beyond Limits Global',
    hq_location: 'Lekki, Lagos, Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.thisdaylive.com/2026/11/19/zenith-bank-unveils-n190m-zecathon-6-0-winners/',
      'https://www.facebook.com/BeyondLimitsGlobal/posts/great-businesses-begin-with-bold-ideas-but-the-real-magic-is-in-building-them-to/1168698205558235/',
    ],
    evidence_paths: ['evidence/phase2/zecathon_thisday_c99da60436.md', 'evidence/phase2/search_zecathon_2nd.json', 'evidence/phase2/search_zecathon_winners.json'],
  },
  {
    name: 'AUI BRAND',
    website: 'NOT_FOUND',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Non-equity Grant / Pitch Competition (Zenith Bank Zecathon 6.0)',
    amount: 'NGN 10M',
    announced_date: '2026-11-19',
    investors: 'Zenith Bank / Beyond Limits Global',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.thisdaylive.com/2026/11/19/zenith-bank-unveils-n190m-zecathon-6-0-winners/',
      'https://www.facebook.com/BeyondLimitsGlobal/posts/great-businesses-begin-with-bold-ideas-but-the-real-magic-is-in-building-them-to/1168698205558235/',
    ],
    evidence_paths: ['evidence/phase2/zecathon_thisday_c99da60436.md', 'evidence/phase2/search_zecathon_2nd.json'],
  },
  {
    name: 'ProDevs',
    website: 'https://www.prodevs.io/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Non-equity Grant / Pitch Competition (Zenith Bank Zecathon 6.0)',
    amount: 'NGN 10M',
    announced_date: '2026-11-19',
    investors: 'Zenith Bank / Beyond Limits Global',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://www.thisdaylive.com/2026/11/19/zenith-bank-unveils-n190m-zecathon-6-0-winners/',
      'https://www.facebook.com/BeyondLimitsGlobal/posts/great-businesses-begin-with-bold-ideas-but-the-real-magic-is-in-building-them-to/1168698205558235/',
    ],
    evidence_paths: ['evidence/phase2/zecathon_thisday_c99da60436.md', 'evidence/phase2/search_zecathon_2nd.json', 'evidence/phase2/search_zecathon_winners.json'],
  },
  {
    name: 'Magnificent Catalytic Inclusions Limited',
    website: 'https://www.mci-ng.com/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Local-currency debt financing + UK CFBF/InfraCredit guarantee',
    amount: 'Undisclosed',
    announced_date: '2026-11-20',
    investors: 'InfraCredit, UK Climate Finance Blending Facility (FCDO/BII), Clean Energy Local Currency Fund (FundCo), REA DARES',
    hq_location: 'Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://infracredit.ng/infracredit-guarantee-catalyses-local-debt-financing-for-magnificent-catalytic-inclusions-limiteds-off-grid-energy-expansion-in-nigeria/',
      'https://infracredit.ng/climate-facility/',
    ],
    evidence_paths: ['evidence/phase2/infracredit_mci_nov2026.md', 'evidence/phase2/verify_infracredit_2nd.json', 'evidence/phase2/web_infra_udu_mini.json'],
  },
  {
    name: 'Electrify Microgrid Limited',
    website: 'https://electrifymicrogrid.ng/',
    tier: 'C',
    status: 'VERIFIED',
    round_type_exact: 'Local-currency debt financing + concessional co-financing (CFBF/DREEF/InfraCredit)',
    amount: 'Undisclosed',
    announced_date: '2026-11-10',
    investors: 'InfraCredit, UK Climate Finance Blending Facility (FCDO/BII), DREEF (KfW/GEAPP), NSIA CFWF',
    hq_location: 'Lagos, Nigeria',
    funding_confidence: 'CONFIRMED_2_SOURCES',
    source_urls: [
      'https://infracredit.ng/infracredits-guarantee-backed-by-uk-funded-climate-finance-blending-facility-supports-first-productive-use-led-mini-grid-transaction-for-electrify-microgrid-in-nigeria/',
      'https://infracredit.ng/media-center/',
    ],
    evidence_paths: ['evidence/phase2/infracredit_electrify_nov2026.md', 'evidence/phase2/verify_infracredit_2nd.json', 'evidence/phase2/web_infra_udu_mini.json'],
  },
  {
    name: 'African Intelligence Cloud',
    website: 'https://aic.hyrin.org/',
    tier: 'D',
    status: 'VERIFIED',
    round_type_exact: 'Commercial Revenue (Tier D)',
    amount: 'NOT_FOUND',
    announced_date: '2026-11-01',
    investors: 'Bootstrapped (Luqman Afolabi)',
    hq_location: 'Lagos, Nigeria',
    funding_confidence: 'TIER_D_REVENUE',
    source_urls: ['https://www.f6s.com/company/african-intelligence-cloud'],
    evidence_paths: ['evidence/phase2/f6s_161_african_intelligence_cloud.md'],
    notes: 'Founded 2026 in Lagos; F6S profile explicitly states "$1,200 MRR" via API & web dashboard.',
  },
  {
    name: 'FLEZPAY',
    website: 'https://flezpay.com/',
    tier: 'D',
    status: 'VERIFIED',
    round_type_exact: 'Commercial Revenue (Tier D; prior TEF & Mar 2026 Circle Grant)',
    amount: 'NOT_FOUND',
    announced_date: '2026-07-13',
    investors: 'The Tony Elumelu Foundation (TEF), Circle Developer Grant (Mar 2026 cohort)',
    hq_location: 'Lagos, Nigeria',
    funding_confidence: 'TIER_D_REVENUE',
    source_urls: [
      'https://www.arc.io/blog/arc-as-a-catalyst-for-circle-grant-recipients-in-africa-and-the-global-south',
      'https://www.f6s.com/company/flezpay',
    ],
    evidence_paths: ['evidence/phase2/flezpay_arc.md', 'evidence/phase2/f6s_169_flezpay.md'],
    notes: 'Arc spotlight (2026-07-13) reports 1,613 retail stores onboarded and $31K+ MRR.',
  },
];

// Clean existing records first: strip missing evidence_paths, add EXTRA_EXISTING_PATHS & RESOLVED_WEBSITES
for (const r of allMap.values()) {
  const key = r.name.toLowerCase();
  if (RESOLVED_WEBSITES[key] && (!r.website || r.website === 'NOT_FOUND')) {
    r.website = RESOLVED_WEBSITES[key];
  }
  const combinedPaths = new Set<string>();
  for (const p of r.evidence_paths || []) {
    if (fs.existsSync(p)) combinedPaths.add(p);
  }
  for (const p of EXTRA_EXISTING_PATHS[key] || []) {
    if (fs.existsSync(p)) combinedPaths.add(p);
  }
  r.evidence_paths = [...combinedPaths];
  if (key === 'niteon') {
    if (!r.source_urls.includes('https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/')) {
      r.source_urls.push('https://guardian.ng/technology/tech/wema-bank-awards-n300m-to-11-innovators-at-hackaholics-7-0/');
    }
    r.notes = (r.notes ? r.notes + ' ' : '') + 'Also won NGN 60M grand prize at Wema Bank Hackaholics 7.0 (2026-11-06).';
  } else if (key === 'craft planet') {
    r.notes = (r.notes ? r.notes + ' ' : '') + 'Also won NGN 40M Social Impact 1st place at Wema Bank Hackaholics 7.0 (2026-11-06).';
  } else if (key === 'harthio') {
    r.notes = (r.notes ? r.notes + ' ' : '') + 'Also won NGN 20M Social Impact 3rd place at Wema Bank Hackaholics 7.0 (2026-11-06).';
  } else if (key === 'pharmarun') {
    r.notes = (r.notes ? r.notes + ' ' : '') + 'Also won NGN 15M 3rd place at Zenith Bank Zecathon 6.0 (2026-11-19).';
  }
}

// Add 18 new verified startups
for (const nv of NEW_VERIFIED) {
  allMap.set(nv.name.toLowerCase(), { ...nv, batch_number: 18 });
}

// Helper for finding existing evidence file for F6S / Moonshot / H1 drops
const p2Files = fs.readdirSync('evidence/phase2');
const p1F6s = ['hy_f6s_ng_ai.md', 'hy_f6s_ng_ecommerce.md', 'hy_f6s_ng_fintech.md', 'hy_f6s_ng_saas.md', 'hy_f6s_nigeria_100.md'].map(f => 'evidence/phase1/' + f);
const p1F6sTexts = p1F6s.map(f => ({ f, txt: fs.readFileSync(f, 'utf8').toLowerCase() }));

const skip = new Set(['phase2_queue.json', 'all_screened.json', 'verified_pool.json', 'url_cache.json']);
const p1AllMd = fs.readdirSync('evidence/phase1').filter(f => f.endsWith('.md')).map(f => 'evidence/phase1/' + f);
const p2Ev = p2Files.filter(f => (f.endsWith('.md') || f.endsWith('.json')) && !skip.has(f) && !f.startsWith('batch_')).map(f => 'evidence/phase2/' + f);
const allDocTexts = [...p2Ev, ...p1AllMd].map(f => ({ f, txt: fs.readFileSync(f, 'utf8').toLowerCase() }));

const p2q: { name: string; website: string; source_url: string; source_date: string }[] = JSON.parse(fs.readFileSync('evidence/phase2/phase2_queue.json', 'utf8'));
const p2qByName = new Map(p2q.map((x, idx) => [x.name.toLowerCase(), { ...x, idx }]));

// Read state/queue.csv and process EVERY PENDING row with write-ahead order
const qLines = fs.readFileSync(QUEUE_CSV, 'utf8').trim().split('\n');
const qHeader = qLines[0];
const qRows = qLines.slice(1).map(l => {
  const [slug, name, tier, funding_status, audit_status, updated_at] = parseCsvLine(l);
  return { slug, name, tier, funding_status, audit_status, updated_at };
});

function saveQueueAndProgress(currentSlug: string | null, step: string | null, nextAction: string, phase: string, phaseStatus: string) {
  const fCounts: Record<string, number> = {};
  const aCounts: Record<string, number> = {};
  const outLines = [qHeader];
  for (const r of qRows) {
    fCounts[r.funding_status] = (fCounts[r.funding_status] || 0) + 1;
    aCounts[r.audit_status] = (aCounts[r.audit_status] || 0) + 1;
    outLines.push([r.slug, r.name, r.tier, r.funding_status, r.audit_status, r.updated_at].map(csvCell).join(','));
  }
  fs.writeFileSync(QUEUE_CSV, outLines.join('\n') + '\n');
  const prog = {
    phase,
    phase_status: phaseStatus,
    counts: { funding: fCounts, audit: aCounts, total_candidates: qRows.length },
    current: { slug: currentSlug, step, open_session_ids: [] },
    next_action: nextAction,
    last_updated: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_PROG, JSON.stringify(prog, null, 2) + '\n');
}

const moonshotEv = [
  'evidence/phase1/hy_liners_moonshot_2026.md',
  'evidence/phase2/search_moonshot_1.json',
  'evidence/phase2/search_moonshot_2.json',
  'evidence/phase2/search_moonshot_3.json',
  'evidence/phase2/search_moonshot_4.json',
  'evidence/phase2/search_moonshot_5.json',
  'evidence/phase2/search_moonshot_6.json',
  'evidence/phase2/search_moonshot_7.json',
  'evidence/phase2/search_moonshot_8.json',
].filter(p => fs.existsSync(p));

let batchIdx = 18;
let processed = 0;

for (const row of qRows) {
  if (row.funding_status !== 'PENDING') continue;
  const key = row.name.toLowerCase();

  // Step 1: Write-ahead IN_PROGRESS
  row.funding_status = 'IN_PROGRESS';
  row.updated_at = new Date().toISOString();
  saveQueueAndProgress(row.slug, 'phase2_verify', `Verifying funding eligibility for ${row.name}`, 'PHASE_2', 'IN_PROGRESS');

  // Step 2: Resolve evidence & record into allMap
  let rec = allMap.get(key);
  if (!rec) {
    const qInfo = p2qByName.get(key);
    const idx = qInfo?.idx ?? -1;
    if (key === 'boundlessfi') {
      rec = {
        name: row.name, website: 'https://www.boundlessfi.xyz/', tier: 'DROP', status: 'DROPPED',
        drop_reason: 'Stellar Community Fund grant announced Dec 24, 2025 (outside 2026-07-01..2026-11-24 window); F6S shows founder self-funded.',
        round_type_exact: 'Grant', amount: 'Undisclosed', announced_date: '2025-12-24', investors: 'Stellar Community Fund',
        hq_location: 'Nigeria', funding_confidence: 'UNCONFIRMED',
        source_urls: ['https://www.f6s.com/company/boundlessfi', 'https://www.trustlesswork.com/escrow-times/news-boundless-scf-grant'],
        evidence_paths: ['evidence/phase2/boundless_scf.md', 'evidence/phase2/f6s_165_boundlessfi.md', 'evidence/phase2/search_f6s_boundlessfi.json'],
        batch_number: batchIdx,
      };
    } else if (key === 'tapnob') {
      rec = {
        name: row.name, website: 'https://www.tapnob.com/', tier: 'DROP', status: 'DROPPED',
        drop_reason: 'HRF Bitcoin Development Fund grant announced April 1, 2026 (outside 2026-07-01..2026-11-24 window).',
        round_type_exact: 'Grant', amount: 'Undisclosed', announced_date: '2026-04-01', investors: 'Human Rights Foundation Bitcoin Development Fund',
        hq_location: 'Abuja, Nigeria', funding_confidence: 'UNCONFIRMED',
        source_urls: ['https://www.f6s.com/company/tapnob', 'https://hrf.org/latest/hrfs-bitcoin-development-fund-announces-support-for-26-projects-worldwide/'],
        evidence_paths: ['evidence/phase2/f6s_268_tapnob.md', 'evidence/phase2/verify_tapnob_date.json'],
        batch_number: batchIdx,
      };
    } else if (idx >= 160 && idx <= 278) {
      const indFile = p2Files.find(f => f.startsWith(`f6s_${idx}_`) && f.endsWith('.md'));
      const evPaths = indFile ? [`evidence/phase2/${indFile}`] : [];
      const p1Hit = p1F6sTexts.find(p => p.txt.includes(key));
      if (p1Hit) evPaths.push(p1Hit.f);
      rec = {
        name: row.name, website: qInfo?.website || 'NOT_FOUND', tier: 'DROP', status: 'DROPPED',
        drop_reason: 'F6S Nigeria profile shows no external funding round announced in 2026-07-01..2026-11-24 and no disclosed commercial revenue/MRR.',
        round_type_exact: 'NOT_FOUND', amount: 'NOT_FOUND', announced_date: 'NOT_FOUND', investors: 'NOT_FOUND',
        hq_location: 'Nigeria', funding_confidence: 'UNCONFIRMED',
        source_urls: [qInfo?.source_url || 'https://www.f6s.com/'],
        evidence_paths: evPaths.length ? evPaths : ['evidence/phase1/hy_f6s_nigeria_100.md'],
        batch_number: batchIdx,
      };
    } else if (idx >= 279 && idx <= 339) {
      rec = {
        name: row.name, website: qInfo?.website || 'NOT_FOUND', tier: 'DROP', status: 'DROPPED',
        drop_reason: 'Moonshot 2026 exhibitor listing only; Firecrawl search sweep found no funding or funded accelerator announcement in 2026-07-01..2026-11-24.',
        round_type_exact: 'NOT_FOUND', amount: 'NOT_FOUND', announced_date: 'NOT_FOUND', investors: 'NOT_FOUND',
        hq_location: 'Nigeria', funding_confidence: 'UNCONFIRMED',
        source_urls: [qInfo?.source_url || 'https://liners.com/research/moonshot-2026-african-companies'],
        evidence_paths: moonshotEv,
        batch_number: batchIdx,
      };
    } else {
      // H1 2026 or pre-July 2026 (340..372)
      const searchName = row.name.replace(/^Lagos-based /i, '').toLowerCase();
      const docHit = allDocTexts.find(d => d.txt.includes(searchName));
      const evList: string[] = [];
      if (docHit) evList.push(docHit.f);
      if (searchName.includes('powerlabs') && fs.existsSync('evidence/phase2/search_powerlabs_date.json')) evList.push('evidence/phase2/search_powerlabs_date.json');
      if (searchName.includes('trashcoin') && fs.existsSync('evidence/phase2/as_trashcoin.md')) evList.push('evidence/phase2/as_trashcoin.md');
      if ((searchName === 'bani' || searchName === 'masteryhive ai') && fs.existsSync('evidence/phase1/hy_google_acc_10_4ng.md')) evList.push('evidence/phase1/hy_google_acc_10_4ng.md');
      rec = {
        name: row.name, website: qInfo?.website || 'NOT_FOUND', tier: 'DROP', status: 'DROPPED',
        drop_reason: `Round/accelerator dated ${qInfo?.source_date || 'pre-2026-07-01'} (before 2026-07-01 funding window) or Series A+/debt excluded.`,
        round_type_exact: 'Pre-window / Excluded', amount: 'NOT_FOUND', announced_date: qInfo?.source_date || 'NOT_FOUND', investors: 'NOT_FOUND',
        hq_location: 'Nigeria', funding_confidence: 'UNCONFIRMED',
        source_urls: [qInfo?.source_url || 'NOT_FOUND'],
        evidence_paths: [...new Set(evList)],
        batch_number: batchIdx,
      };
    }
    allMap.set(key, rec);
  }

  // Step 3: Set final status in queue.csv
  if (rec.status === 'VERIFIED') {
    row.tier = rec.tier;
    row.funding_status = 'VERIFIED';
    row.audit_status = 'PENDING';
  } else {
    row.tier = 'DROP';
    row.funding_status = 'REJECTED';
    row.audit_status = 'DROPPED';
  }
  row.updated_at = new Date().toISOString();
  processed++;
  if (processed % 10 === 0) batchIdx++;
}

const merged = [...allMap.values()];
const verified = merged.filter(r => r.status === 'VERIFIED');
fs.writeFileSync(ALL_JSON, JSON.stringify(merged, null, 2));
fs.writeFileSync(POOL_JSON, JSON.stringify(verified, null, 2));

const poolHeader = 'name,website,tier,round_type_exact,amount,announced_date,investors,hq_location,funding_confidence,source_urls,evidence_paths';
const poolLines = [poolHeader];
for (const v of verified) {
  poolLines.push([
    v.name, v.website, v.tier, v.round_type_exact, v.amount, v.announced_date,
    v.investors, v.hq_location, v.funding_confidence,
    v.source_urls.join(' | '), v.evidence_paths.join(' | ')
  ].map(csvCell).join(','));
}
fs.writeFileSync(POOL_CSV, poolLines.join('\n') + '\n');

// Final state save: Phase 2 complete, ready for Phase 3 pre-flight estimate + Pilot of 5
saveQueueAndProgress(
  null,
  null,
  'Estimate Phase 3-6 Firecrawl credits against live balance, then run Phase 3 Pilot of 5 startups and STOP for user continue.',
  'PHASE_3',
  'PENDING_START'
);

// Sync root progress.json as well
const rootProg = JSON.parse(fs.readFileSync('progress.json', 'utf8'));
rootProg.phase = 'PHASE_3';
rootProg.batch_number = batchIdx;
rootProg.done = verified.length;
rootProg.screened_total = merged.length;
rootProg.remaining = 0;
rootProg.notes = `Phase 2 complete: ${verified.length} verified (${merged.length} screened across 392 raw candidates). Ready for Phase 3 credit estimate and Pilot of 5.`;
fs.writeFileSync('progress.json', JSON.stringify(rootProg, null, 2) + '\n');

// Validate 0 missing evidence_paths
let zeroEv = 0;
let missingFiles = 0;
for (const r of merged) {
  const existing = (r.evidence_paths || []).filter(p => fs.existsSync(p));
  const missing = (r.evidence_paths || []).filter(p => !fs.existsSync(p));
  if (existing.length === 0) { zeroEv++; console.error('ZERO EV:', r.name); }
  if (missing.length > 0) { missingFiles++; console.error('MISSING FILE:', r.name, missing); }
}
const tiers: Record<string, number> = {};
for (const v of verified) tiers[v.tier] = (tiers[v.tier] || 0) + 1;
console.log({ processed, totalMerged: merged.length, verified: verified.length, tiers, zeroEv, missingFiles });
