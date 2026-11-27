# Problems & Blockers Log

_All tool errors, blocked pages, and failed steps are recorded below._

- **Phase 1 Batch D (`wt_protegey`)**: `https://weetracker.com/2026/11/16/protegey-secures-pre-seed-funding-lvlup-ventures/` returned HTTP 500 `SCRAPE_ALL_ENGINES_FAILED` (`evidence/phase1/hy_wt_protegey.json`). Protegey will be verified via alternative sources in Phase 2 if included.
- **Phase 3 (`friendnpal` — FriendnPal)**: `https://friendnpal.com/` returned HTTP 500 `SCRAPE_ALL_ENGINES_FAILED` across `[index, fire-engine;chrome-cdp, fire-engine(retry);chrome-cdp]` (`evidence/phase3/friendnpal_home.json`). Marked `BLOCKED` in `state/queue.csv`.
- **Phase 3 (`peoplepulse` — PeoplePulse `/careers`)**: `https://www.peoplepulseafrica.com/careers` returned HTTP 500 `SCRAPE_ALL_ENGINES_FAILED` (`evidence/phase3/peoplepulse_careers.json`); `hiring_marketing_role` recorded as `BLOCKED`.
- **Phase 4 (`vendy` — Vendy)**: `https://vendy.ng/` (cited in Google's announcement) serves unrelated Kleevar / Purple Finance Limited (`@thepurplepay`) content; audited official site `https://myvendy.com/` instead, where footer Instagram link `https://www.instagram.com/paywithvendy/` returned HTTP 404 (`evidence/phase4/vendy_ig_scrape.json`) and `ig_status` is set to `NO_IG_FOUND`.
