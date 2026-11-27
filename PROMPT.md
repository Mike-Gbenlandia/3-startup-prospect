# Task Prompt & Operating Protocol

TASK
You are a research agent working for a marketing and revenue operations consultant. Build a verified list of Nigerian startups that recently raised early funding and show signs of weak marketing, so the consultant can pitch them. Today is 24 November 2026. Deliver 100 to 120 startups with evidence for every claim.

RULES THAT OVERRIDE EVERYTHING ELSE
- Evidence only. Every fact must come from a page, API response, or screenshot you retrieved during this run. Never fill a field from memory or guess. Unknown = NOT_FOUND. Blocked = BLOCKED plus the reason.
- Log every tool call. Right after each Firecrawl call (search, scrape, interact, alexandria, map, crawl), append one JSON line to run_log.jsonl with: timestamp, tool, exact input, scrape_id if any, credits if returned, outcome (ok, error, blocked), and the path of the saved raw output. A tool counts as "used" only if the log has a line for it.
- Save raw output first. Save every page, API response, and screenshot under evidence/ before you read it. Every fact in the master file cites a source URL and an evidence file path.
- Work in order. Do the phases in order. Do not skip, merge, or shorten a phase. Do not replace a step with a summary or an estimate.
- Do not stop early. Work in batches of 10 startups. Write results to disk after every batch and update progress.json (phase, batch number, done, remaining). If your context grows long, reload state from the files and continue.
- Do not pad. If fewer than 100 startups pass every test, deliver the true number and explain why. Never lower a standard or invent an entry to reach 100.
- Report failures. If a tool errors, a site blocks you, or a step cannot be done, write the startup name and reason in problems.md and move on. Never replace a failed Firecrawl step with a guess.
- Stop and ask me if two instructions conflict, if credits run low, or if a step looks impossible. Do not improvise silently.
- Secrets. The API key is stored in `.env` (`FIRECRAWL_API_KEY`, redacted here). Never print it, log it, commit it, or send it anywhere except Firecrawl's own API, CLI, or SDK.
- Open-source help is allowed. You may search GitHub for repos that help. For each one you use, record the URL, license, last commit date, and why you chose it. Read the code before running it. Never give any third-party tool my API key.

PHASE 0: LEARN FIRECRAWL AND PROVE THE TOOLS WORK
Learn Firecrawl from its current docs, not from memory. Read:
- https://www.firecrawl.dev/agent-onboarding/SKILL.md
- https://docs.firecrawl.dev/llms.txt (the docs index)
- https://docs.firecrawl.dev/features/interact
Install the CLI and skills with: `npx -y firecrawl-cli@latest init --all --browser` (restart if needed to load the skills).
What Interact is: a live browser attached to a scrape. Flow: (1) POST /v2/scrape returns a scrapeId; (2) POST /v2/scrape/{scrapeId}/interact with either a plain-English prompt or Playwright/agent-browser code; (3) DELETE /v2/scrape/{scrapeId}/interact to stop. Each response includes a liveViewUrl. Keep each prompt to one small task. Use scrape + interact, not the deprecated "browser" command. Sessions end after 10 minutes total or 5 minutes idle. Always stop them yourself. Published rates: scrape 1 credit; interact code-only 2 credits per session minute; interact with any prompt 7 credits per session minute; Fireround call 5 credits. Prefer code mode when you know what to extract.
Prove each tool works before doing anything else:
a. Find out my credit balance (look up how in the docs) and print it.
b. Run one search call.
c. Run one scrape and save the markdown.
d. Run one Interact session on a public Instagram profile of a Nigerian tech outlet: scrape the URL, make at least one interact call, take a screenshot, save it as screenshots/test_instagram.png, stop the session. Run ls -l on the file and show me the output. Record the liveViewUrl.
e. Run one Fireround call through Alexandria. Read its capability file first and do not guess option names.
Show me the run_log.jsonl lines for a to e. If any test fails, stop and tell me. Do not continue with a substitute tool without my approval.

PHASE 1: COLLECT AT LEAST 300 RAW CANDIDATES
Find Nigerian startups (headquarters or main operations in Nigeria, any city) that announced funding or an accelerator place between 1 July 2026 and today. Use many sources, and run separate searches per industry (fintech, agritech, healthtech, edtech, logistics, energy and climate, e-commerce, proptech, creator economy, B2B software, HR, insurtech, mobility, AI, legal, food, media, gaming, and others you find):
- Fireround through Alexandria (more than one query, paging with next_cursor)
- Nigerian and African tech press: TechCabal, Techpoint Africa, Disrupt Africa, TechCrunch, Benjamin Dada, Africa: The Big Deal
- Accelerator and program announcements: check which of Antler, Y Combinator, Techstars, Google for Startups, Founders Factory Africa, MEST, Catalyst Fund, Norrsken22 and similar programs ran cohorts in 2026 and which pay money
- Founder announcements on LinkedIn and X that appear in search results
Write every candidate to candidates_raw.csv with name, website, source URL, and the date of that source. Dedupe by company.

PHASE 2: VERIFY FUNDING AND BUILD A POOL OF 200
For each candidate, open the source page itself. A search snippet alone does not count. Assign one tier:
- A: pre-seed round announced 1 July 2026 or later (top priority)
- B: seed round announced 1 July 2026 or later
- C: angel round, or currently in a funded accelerator or residency (cohort dated in the window)
- D: no funding found, but launched in 2025 or 2026 and shows it can pay (evidence such as paying customers, a pricing page, a stated revenue figure, or a sizable team). Put the evidence in the row.
Exclude Series A and above, and rounds announced before 1 July 2026. A company that raised more than one round in the window gets the later round's tier.
Record: round type as the source writes it, amount, announcement date, investors, and source URLs. Set funding_confidence to CONFIRMED_2_SOURCES, CONFIRMED_1_SOURCE, or UNCONFIRMED. Drop UNCONFIRMED.
Target a pool of 200 verified candidates, with most in tier A, then B, then C. Tier D may be at most 15 of the final list. If you cannot reach 200, keep searching new industries and queries until you have run at least 60 more searches, then report the true count.

PHASE 3: MARKETING AUDIT, PILOT ON 5 STARTUPS
For each startup, do these steps in order:
a. Scrape the homepage, about, team, blog, and careers pages. Record what they do (1 to 2 sentences), their 2 or 3 most recent activities with dates and URLs (launches, partnerships, hires), the date of their latest blog post (absolute date) and how many posts in the last 90 days, whether the team or LinkedIn-linked pages show anyone with a marketing, growth, or content title, and whether the careers page lists a marketing or growth role.
b. Find the Instagram handle from the startup's own website links. Do not guess handles. Confirm the account matches the company (name, link back to the site).
c. Open the Instagram profile with Firecrawl: scrape the profile URL, then use interact (one small task per call). Capture: follower count, bio, and the 5 most recent posts, skipping pinned posts. For each post record post type, the timestamp text exactly as shown (raw_timestamp_text), and the absolute date calculated from the retrieval date. Take a screenshot of the profile grid and save it to screenshots/{company_slug}_instagram.png. Download the file to disk right away because hosted links can expire. Run ls -l on it. If you can view images, check that the dates you recorded match the screenshot.
d. Stop the interact session and log it.
e. Calculate days since the latest post, the gaps in days between the 5 posts, and the median gap.

Instagram rules: public pages only. Never log in, never create or use an account, never get around a login wall, captcha, or age gate. One profile visit per startup, one session at a time, at least 5 seconds between profiles. If you hit a login wall, retry once after 60 seconds. If still blocked, set ig_status to BLOCKED_LOGIN_WALL, then try the paid Alexandria Instagram providers (Oriane instagram/profile-lookup, Influencers.club instagram/creator-posts) only if the credit cost fits the budget, and record which source gave the data. If no Instagram account is linked anywhere on their site, set ig_status to NO_IG_FOUND. Never guess dates or counts from a blocked page.

Before Phase 3 starts, estimate total credits for the full audit using the rates above, compare to my balance, and tell me the estimate.

Need score (0 to 10), calculated only from these flags, and show the flags in the row:
- Latest Instagram post older than 30 days: +2 (older than 14 days: +1). NO_IG_FOUND also gives +2.
- Median gap between the 5 posts over 14 days: +2 (over 7 days: +1)
- Longest gap is over 14 days and more than 3 times the shortest gap: +1
- No blog, or latest blog post older than 90 days: +2
- No marketing, growth, or content title on the public team page: +2
- Careers page lists an open marketing or growth role: +1
A startup qualifies at need_score 4 or higher, with at least two different signal types firing (Instagram, blog, team, hiring). If Instagram is BLOCKED, score from the other signals and mark ig_status.

After the pilot of 5, STOP. Show me the 5 rows, the screenshot file paths with ls -l output, and the matching run_log lines. Wait for me to reply "continue".

PHASE 4: FULL AUDIT
Repeat Phase 3 for every remaining startup in the pool, in batches of 10. Do not skip Instagram for any startup unless it is BLOCKED after the retry. Append to the master file after each batch.

PHASE 5: SELECT THE FINAL LIST
From qualified startups, pick 100 to 120. Rank by tier (A first), then need_score, then funding recency. Uniqueness rules: at most 8 startups per industry; no two startups with the same core product for the same customer. For each, fill unique_offer (one sentence) and closest_overlap (the most similar other startup in the list, or NONE). Add pitch_hook: one sentence, based only on evidence in the row, naming the marketing gap I could fix (for example "Last Instagram post was 41 days ago; blog has no posts since March").

PHASE 6: VERIFY AND REPORT
Randomly pick 15 final rows (record the seed). For each: reopen the funding source and confirm round, amount, and date; confirm the screenshot file exists and is not empty; recheck the date math. Fix or remove any row that fails, and report the failure rate.
Then compute the tool receipt with a script that reads run_log.jsonl (not by hand): counts of search, scrape, interact, and alexandria calls, interact sessions stopped, total credits used, errors.

OUTPUT FILES
startups_master.csv and startups_master.json with these fields: name, website, industry, city, what_they_do, recent_activity (with dates and URLs), tier, round_type, amount, funding_date, investors, funding_sources, funding_confidence, founder_or_marketing_contact (public info only), instagram_url, ig_status, ig_followers, ig_post_1..5 (raw_timestamp_text, absolute_date, type), ig_days_since_latest, ig_median_gap_days, ig_screenshot_path, blog_url, blog_last_post_date, blog_posts_last_90_days, marketing_titles_found, hiring_marketing_role, need_score, score_flags, unique_offer, closest_overlap, pitch_hook, evidence_paths.
Also: candidates_raw.csv, run_log.jsonl, progress.json, problems.md, screenshots/, evidence/, FINAL_REPORT.md.
FINAL_REPORT.md must contain: counts at each phase (raw, verified pool, qualified, final), count per tier and per industry, the script-generated tool receipt, the verification sample results, every deviation from these instructions, everything blocked or not done, and total credits used. Do not write "completed" unless the numbers reconcile. A failure listed honestly is better than a gap hidden.

CHECKPOINTS AND HANDOFF (this replaces rule 5)

You run on a free account that can hit its usage limit at any moment, with no warning. When that happens, another agent in a fresh chat continues from the files in this repo. It knows only what the files say. So the files must always be current. Never save notes for "the end of the batch". Update the files as you go.

Create these in a folder called state/ (unless noted). If they already exist, do not recreate them.
- queue.csv: one row per candidate. Columns: slug, name, tier, funding_status, audit_status, updated_at. funding_status is PENDING, IN_PROGRESS, VERIFIED, or REJECTED. audit_status is PENDING, IN_PROGRESS, DONE, BLOCKED, or DROPPED. This file is the single source of truth for where work stopped. Add rows in Phase 1.
- progress.json: phase, phase_status, counts per status, current (slug, step, open_session_ids), next_action (one exact sentence), last_updated.
- HANDOFF.md: 25 lines at most. What is finished, what is next, what the next agent must not redo, open problems. Overwrite it each time. Do not append.
- playbook.md: the exact commands and code that worked (search, scrape, interact, screenshot, Fireround, Instagram fallback), with the option names that worked and what the output looks like. Add a line the first time something works. Add a line when something fails and why.
- conventions.md: fixed choices so every agent works the same way: tier definitions, need score flags, date format (YYYY-MM-DD), slug rule (lowercase, hyphens), CSV column order, status words, the funding window. Write it once in Phase 0. Change it only if I approve.
- decisions.md: one line per judgment call (for example why a company counted as Nigerian, why a source was rejected). Append only. Follow earlier decisions. Do not reinterpret them.
- queries_done.txt: one line per search or Fireround query: date, query, number of new candidates found. Check it before every query so you never repeat one.
- tools/status.py: write it once. It prints, in under 40 lines: the phase, counts by status from queue.csv, current and next_action from progress.json, the next 5 PENDING slugs, the last 5 lines of run_log.jsonl, and a check that the last 3 DONE startups each have a screenshot file and a log line.
- .gitignore (repo root): includes .env and any key file. Never write the API key into any file in the repo.

Write-ahead order for every single startup, in Phase 2 and in Phases 3 and 4:
1. Set its status to IN_PROGRESS in queue.csv and set current (slug, step) in progress.json.
2. Do the work. Save raw output to evidence/ first. Then write the row to the master file.
3. Set the status to its final value (VERIFIED, REJECTED, DONE, or BLOCKED with the reason in problems.md). Clear current. Update next_action.
Do all three steps for each startup, not once per batch. Rewrite HANDOFF.md every 5 startups, after any new lesson, and before any step that takes more than a few minutes.

Interact sessions: write each session id into progress.json current.open_session_ids when you start it. Remove it when you stop it.

If you can commit and push to GitHub, do it after every 5 startups. If you cannot, keep the files current so I can push at any time.

Saving credits:
- Never print a full page, API response, or CSV into the chat. Save it to a file, then read only what you need using head, grep, jq, or a short script.
- Once playbook.md has the command you need, do not re-read the Firecrawl docs. Go back to the docs only when a playbook command fails.
- Do not re-verify finished work except in Phase 6.

RESUME PROTOCOL
If the repo already has a state/ folder, you are resuming. Do these steps first, in this order:
1. Read this prompt.
2. Run python tools/status.py.
3. Read state/HANDOFF.md, state/conventions.md, and state/playbook.md.
4. If open_session_ids is not empty, stop each session (DELETE the interact session) and log it.
5. Reset any IN_PROGRESS row to PENDING. Delete its partial row from the master file and its partial evidence, then redo it from the start.
6. Continue at next_action. Do not re-read the whole repo, list old files, redo finished phases, or repeat the Phase 0 tests. Run one credit-balance call to confirm the API key works.
7. Tell me in 5 lines: phase, counts, what you are redoing, what you do next. Then start working.
Follow conventions.md and decisions.md exactly so the work stays in one style.

Note on API keys: Multiple Firecrawl API keys may be supplied via `.env` as comma-separated `FIRECRAWL_API_KEY` (rotated automatically on HTTP 402/quota exhaustion by `scripts/fc.ts`). Never write literal keys into tracked files.
