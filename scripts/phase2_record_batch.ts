import fs from 'fs';

export interface Phase2Record {
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

const POOL_JSON = 'evidence/phase2/verified_pool.json';
const ALL_JSON = 'evidence/phase2/all_screened.json';
const POOL_CSV = 'evidence/phase2/verified_pool.csv';

function csvCell(v: string): string {
  const s = (v ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function saveBatchDecisions(batchNum: number, decisions: Omit<Phase2Record, 'batch_number'>[], creditsRemaining?: number) {
  const all: Phase2Record[] = fs.existsSync(ALL_JSON) ? JSON.parse(fs.readFileSync(ALL_JSON, 'utf8')) : [];
  const byName = new Map<string, Phase2Record>();
  for (const r of all) byName.set(r.name.toLowerCase(), r);
  for (const d of decisions) {
    byName.set(d.name.toLowerCase(), { ...d, batch_number: batchNum });
  }
  const merged = [...byName.values()];
  const verified = merged.filter((r) => r.status === 'VERIFIED');

  fs.writeFileSync(ALL_JSON, JSON.stringify(merged, null, 2));
  fs.writeFileSync(POOL_JSON, JSON.stringify(verified, null, 2));

  const header = 'name,website,tier,round_type_exact,amount,announced_date,investors,hq_location,funding_confidence,source_urls,evidence_paths';
  const lines = [header];
  for (const v of verified) {
    lines.push([
      v.name,
      v.website,
      v.tier,
      v.round_type_exact,
      v.amount,
      v.announced_date,
      v.investors,
      v.hq_location,
      v.funding_confidence,
      v.source_urls.join(' | '),
      v.evidence_paths.join(' | '),
    ].map(csvCell).join(','));
  }
  fs.writeFileSync(POOL_CSV, lines.join('\n') + '\n');

  const prog = JSON.parse(fs.readFileSync('progress.json', 'utf8'));
  prog.phase = 'PHASE_2';
  prog.batch_number = batchNum;
  prog.done = verified.length;
  prog.screened_total = merged.length;
  prog.remaining = Math.max(0, 200 - verified.length);
  if (typeof creditsRemaining === 'number') prog.current_credits = creditsRemaining;
  prog.notes = `Phase 2 Batch ${batchNum} recorded: ${verified.length} verified in pool (${merged.length} screened).`;
  fs.writeFileSync('progress.json', JSON.stringify(prog, null, 2) + '\n');

  console.log(`Batch ${batchNum} saved: screened=${merged.length}, verified=${verified.length}, remaining_to_200=${Math.max(0, 200 - verified.length)}`);
}

// CLI mode: pass path to JSON array of decisions
if (import.meta.url === `file://${process.argv[1]}`) {
  const batchNum = parseInt(process.argv[2], 10);
  const filePath = process.argv[3];
  const creditsArg = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;
  const decisions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  saveBatchDecisions(batchNum, decisions, creditsArg);
}
