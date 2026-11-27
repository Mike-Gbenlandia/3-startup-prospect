import fs from 'fs';
import { updateProgress, updateQueueStatus } from './phase3_fetch.ts';

export const MASTER_COLUMNS = [
  'name',
  'website',
  'industry',
  'city',
  'what_they_do',
  'recent_activity',
  'tier',
  'round_type',
  'amount',
  'funding_date',
  'investors',
  'funding_sources',
  'funding_confidence',
  'founder_or_marketing_contact',
  'instagram_url',
  'ig_status',
  'ig_followers',
  'ig_post_1',
  'ig_post_2',
  'ig_post_3',
  'ig_post_4',
  'ig_post_5',
  'ig_days_since_latest',
  'ig_median_gap_days',
  'ig_screenshot_path',
  'blog_url',
  'blog_last_post_date',
  'blog_posts_last_90_days',
  'marketing_titles_found',
  'hiring_marketing_role',
  'need_score',
  'score_flags',
  'unique_offer',
  'closest_overlap',
  'pitch_hook',
  'evidence_paths',
] as const;

export interface IgPostInfo {
  raw_timestamp_text: string;
  absolute_date: string;
  type: string;
  url?: string;
}

export interface MasterStartupRow {
  slug: string;
  name: string;
  website: string;
  industry: string;
  city: string;
  what_they_do: string;
  recent_activity: string;
  tier: string;
  round_type: string;
  amount: string;
  funding_date: string;
  investors: string;
  funding_sources: string;
  funding_confidence: string;
  founder_or_marketing_contact: string;
  instagram_url: string;
  ig_status: string;
  ig_followers: string;
  ig_post_1: IgPostInfo | 'NOT_FOUND';
  ig_post_2: IgPostInfo | 'NOT_FOUND';
  ig_post_3: IgPostInfo | 'NOT_FOUND';
  ig_post_4: IgPostInfo | 'NOT_FOUND';
  ig_post_5: IgPostInfo | 'NOT_FOUND';
  ig_days_since_latest: number | 'NOT_FOUND';
  ig_median_gap_days: number | 'NOT_FOUND';
  ig_screenshot_path: string;
  blog_url: string;
  blog_last_post_date: string;
  blog_posts_last_90_days: number | 'NOT_FOUND';
  marketing_titles_found: string;
  hiring_marketing_role: string;
  need_score: number;
  score_flags: string;
  qualified: boolean;
  signal_categories: string[];
  unique_offer: string;
  closest_overlap: string;
  pitch_hook: string;
  evidence_paths: string;
}

function escapeCsv(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function formatIgPostForCsv(p: IgPostInfo | 'NOT_FOUND'): string {
  if (!p || p === 'NOT_FOUND') return 'NOT_FOUND';
  return `${p.type} | ${p.raw_timestamp_text} | ${p.absolute_date}${p.url ? ` | ${p.url}` : ''}`;
}

export function upsertMasterRow(
  row: MasterStartupRow,
  finalAuditStatus: 'DONE' | 'BLOCKED' | 'DROPPED',
  phaseLabel = 'PHASE_3',
  phaseStatus = 'IN_PROGRESS',
  nextAction = 'Continue Phase 3 audit'
) {
  let rows: MasterStartupRow[] = [];
  if (fs.existsSync('startups_master.json')) {
    rows = JSON.parse(fs.readFileSync('startups_master.json', 'utf8'));
  }
  const idx = rows.findIndex((r) => r.slug === row.slug || r.name === row.name);
  if (idx >= 0) {
    rows[idx] = row;
  } else {
    rows.push(row);
  }
  fs.writeFileSync('startups_master.json', JSON.stringify(rows, null, 2) + '\n', 'utf8');

  // Write startups_master.csv in exact column order
  const csvLines = [MASTER_COLUMNS.join(',')];
  for (const r of rows) {
    const lineCols = MASTER_COLUMNS.map((col) => {
      if (col === 'ig_post_1' || col === 'ig_post_2' || col === 'ig_post_3' || col === 'ig_post_4' || col === 'ig_post_5') {
        return escapeCsv(formatIgPostForCsv(r[col]));
      }
      return escapeCsv((r as any)[col]);
    });
    csvLines.push(lineCols.join(','));
  }
  fs.writeFileSync('startups_master.csv', csvLines.join('\n') + '\n', 'utf8');

  updateQueueStatus(row.slug, { audit_status: finalAuditStatus });
  updateProgress((p) => {
    p.phase = phaseLabel;
    p.phase_status = phaseStatus;
    p.current = { slug: null, step: null, open_session_ids: p.current?.open_session_ids || [] };
    p.next_action = nextAction;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  const auditStatus = (process.argv[3] || 'DONE') as 'DONE' | 'BLOCKED' | 'DROPPED';
  const phaseLabel = process.argv[4] || 'PHASE_3';
  const phaseStatus = process.argv[5] || 'IN_PROGRESS';
  const nextAction = process.argv[6] || 'Continue Phase 3 audit';
  if (!filePath) {
    console.error('Usage: npx tsx scripts/phase3_finalize_row.ts <rowJsonPath> [DONE|BLOCKED|DROPPED] [phaseLabel] [phaseStatus] [nextAction]');
    process.exit(1);
  }
  const row = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  upsertMasterRow(row, auditStatus, phaseLabel, phaseStatus, nextAction);
  console.log(`Finalized ${row.slug} as ${auditStatus}. Total master rows: ${JSON.parse(fs.readFileSync('startups_master.json', 'utf8')).length}`);
}
