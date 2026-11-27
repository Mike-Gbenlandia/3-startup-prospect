# Firecrawl Playbook

All calls go through `scripts/fc.ts`, which reads `FIRECRAWL_API_KEY` from `.env`, rotates keys via `.fc_key_idx` on HTTP 402/quota exhaustion, saves raw JSON (and `.md` when applicable), and appends one line to `run_log.jsonl`. Always wait `>= 6500ms` between Firecrawl calls and `>= 5000ms` between Instagram profile visits.

1. **Credit Balance (`credit_usage`, 0 credits)**:
   - Command: `npx tsx scripts/fc.ts credits <outPath>`
   - Endpoint: `GET /v2/team/credit-usage` -> returns `{ httpStatus: 200, success: true, data: { remainingCredits, planCredits, billingPeriodStart, billingPeriodEnd } }`.

2. **Search (`search`, 2 credits per 10 results)**:
   - Command: `npx tsx scripts/fc.ts search '{"query":"<query>","limit":10}' <outPath>`
   - Endpoint: `POST /v2/search` -> returns `{ data: { web: [{ url, title, description, position }], news: [...] }, creditsUsed }`.
   - Failure note: Avoid overly broad `OR` queries with unquoted keywords (e.g. `web_rem_3_idice.json` returned generic Nigeria pages). Use exact company names + `"nigeria"` or domain hints.

3. **Scrape (`scrape`, 1 credit)**:
   - Command: `npx tsx scripts/fc.ts scrape '{"url":"<url>","formats":["markdown","links"],"onlyMainContent":false}' <jsonOutPath> <mdOutPath>`
   - Endpoint: `POST /v2/scrape` -> returns `{ data: { markdown, links, metadata: { scrapeId, statusCode, title } }, creditsUsed }`.
   - Note: `onlyMainContent` defaults to `true` in Firecrawl v2, which strips `<header>` nav and `<footer>` social links (`instagram.com`, `/about`, `/team`, `/blog`, `/careers`). Always set `"onlyMainContent": false` for company website audits.
   - Known failure: `weetracker.com` sporadically returns HTTP 500 `SCRAPE_ALL_ENGINES_FAILED` (`evidence/phase1/hy_wt_protegey.json`); use press/alternative sources and log in `problems.md`.

4. **Interact + Screenshot (`interact` code-only = 2 credits/min, `interact-stop`)**:
   - Step 1 (Scrape IG profile): `POST /v2/scrape` with `{"url":"https://www.instagram.com/<handle>/","formats":["markdown"],"waitFor":3000}` -> capture `scrapeId` (note: record active `scrapeId` in `state/progress.json` `current.open_session_ids`).
   - Step 2 (Code-only Interact): `npx tsx scripts/fc.ts interact <scrapeId> '{"language":"node","timeout":30,"code":"await page.waitForTimeout(2000); const title = await page.title(); const url = page.url(); const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 1500) : \"\"); const buf = await page.screenshot({ fullPage: false }); JSON.stringify({ title, url, bodyText, screenshotBase64: buf.toString(\"base64\") });"}' <outJsonPath>`
   - Step 3 (Decode PNG immediately): decode `JSON.parse(json.result).screenshotBase64` to `screenshots/<slug>_instagram.png` and verify non-empty via `ls -l`.
   - Step 4 (Stop session immediately): `npx tsx scripts/fc.ts interact-stop <scrapeId> <stopOutJsonPath>` (`DELETE /v2/scrape/{scrapeId}/interact`) -> returns `{ status: "stopped", sessionDurationMs, creditsBilled }`; remove `scrapeId` from `current.open_session_ids`.
   - Instagram login wall rule: Public pages only; if login wall appears, wait 60s and retry once; if still blocked, set `ig_status = BLOCKED_LOGIN_WALL` (optional Alexandria Oriane/Influencers.club fallback only if budget permits).

5. **Fireround through Alexandria (`alexandria`, 5 credits)**:
   - Command: `npx tsx scripts/fc.ts alexandria-call '{"provider":"fireround","capability":"rounds/search","options":{"query":"Nigeria","limit":25}}' <outPath>`
   - Discovery command: `POST /v2/search` with `{"query":"Fireround startup funding","sources":["tools"],"toolDetail":"full","limit":5}` (0 credits).
