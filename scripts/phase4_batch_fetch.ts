import 'dotenv/config';
import { auditOneStartup } from './phase3_fetch.ts';

async function main() {
  const slugs = process.argv.slice(2).filter(Boolean);
  if (slugs.length === 0) {
    console.error('Usage: npx tsx scripts/phase4_batch_fetch.ts <slug1> <slug2> ...');
    process.exit(1);
  }
  for (const slug of slugs) {
    try {
      console.error(`\n[batch] >>> Starting ${slug}`);
      await auditOneStartup(slug, 'PHASE_4');
      console.error(`[batch] <<< Finished ${slug}`);
    } catch (err: any) {
      console.error(`[batch] !!! Error on ${slug}:`, err?.message || err);
    }
  }
}

main();
