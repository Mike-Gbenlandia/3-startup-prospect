import fs from 'fs';

function main() {
  const slug = process.argv[2];
  const dir = process.argv[3] || 'evidence/phase4';
  if (!slug) {
    console.error('Usage: npx tsx scripts/phase4_inspect.ts <slug> [evidenceDir]');
    process.exit(1);
  }
  const rawPath = `${dir}/${slug}_audit_raw.json`;
  const data = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

  console.log(`=== AUDIT SUMMARY: ${slug} ===`);
  console.log('POOL:', JSON.stringify(data.poolEntry));
  console.log('WEBSITE:', data.resolvedWebsite);
  if (data.searchCandidates?.length) {
    console.log('SEARCH_CANDIDATES:', JSON.stringify(data.searchCandidates));
  }
  console.log('SOCIAL_ON_SITE:', JSON.stringify(data.socialLinksFoundOnSite));
  console.log('EVIDENCE_PATHS:', data.evidencePaths.join(' | '));

  for (const [kind, info] of Object.entries<any>(data.scrapedPages || {})) {
    console.log(`\n--- PAGE [${kind}] status=${info.status} ok=${info.ok} url=${info.url} ---`);
    if (info.mdPath && fs.existsSync(info.mdPath)) {
      const md = fs.readFileSync(info.mdPath, 'utf8')
        .replace(/!\[[^\]]*\]\(data:image\/[^)\r\n]+(?:\)[^)]*)*\)/g, '[svg]')
        .replace(/data:image\/[^\s"')\r\n]+/g, '[svg]');
      const lines = md.split(/\r?\n/).filter((l) => l.trim().length > 0 && l.trim() !== '[svg]');
      console.log(`[lines=${lines.length}, chars=${md.length}]`);
      console.log(lines.slice(0, 45).join('\n'));
      if (lines.length > 45) {
        const rest = lines.slice(45);
        const hits = rest.filter((l) =>
          /(market|growth|content|brand|seo|social|copy|cmo|founder|ceo|coo|cto|team|career|hiring|open|role|job|blog|2026|2025|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|lagos|abuja|nigeria|port harcourt|ibadan|mail|@)/i.test(l)
        );
        if (hits.length > 0) {
          console.log('--- KEY MATCHES IN REMAINING LINES ---');
          console.log(hits.slice(0, 40).join('\n'));
        }
      }
    } else {
      console.log('[NO MD FILE]');
    }
  }

  const ig = data.instagramAudit;
  console.log(`\n--- INSTAGRAM status=${ig?.status} url=${ig?.url} screenshot=${ig?.screenshotPath || 'NONE'} ---`);
  if (ig?.mdText) {
    console.log('IG_MD_HEAD:');
    console.log(String(ig.mdText).split(/\r?\n/).slice(0, 60).join('\n'));
  }
  if (ig?.interactParsed?.domData) {
    console.log('IG_DOM:', JSON.stringify({
      title: ig.interactParsed.title,
      url: ig.interactParsed.url,
      loginWall: ig.interactParsed.domData.loginWall,
      extLinks: ig.interactParsed.domData.extLinks,
      posts: ig.interactParsed.domData.posts,
    }, null, 2));
  }
}

main();
