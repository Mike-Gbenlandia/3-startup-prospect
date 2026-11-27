# Conventions

- **Reference Date ("Today")**: `2026-11-24`
- **Date Format**: `YYYY-MM-DD` (all absolute dates in CSV/JSON/notes).
- **Funding Window**: `2026-07-01` through `2026-11-24` inclusive (for Tiers A, B, C).
- **Slug Rule**: lowercase alphanumeric with hyphens (`name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`); no duplicates.
- **Tier Definitions**:
  - `A`: Pre-seed round announced `2026-07-01` or later (top priority).
  - `B`: Seed round announced `2026-07-01` or later.
  - `C`: Angel round, or currently in a funded accelerator/residency/grant/prize/climate-debt cohort dated in the window (`2026-07-01` to `2026-11-24`).
  - `D`: No funding in window, launched in 2025 or 2026, with verified revenue/paying-customer/pricing/team evidence (max 15 in final list).
  - Exclude Series A and above, mature PE-backed companies, corporate/commercial paper debt issuances for mature firms, and rounds before `2026-07-01`.
- **Status Words**:
  - `funding_status`: `PENDING` | `IN_PROGRESS` | `VERIFIED` | `REJECTED`
  - `audit_status`: `PENDING` | `IN_PROGRESS` | `DONE` | `BLOCKED` | `DROPPED`
- **Funding Confidence**: `CONFIRMED_2_SOURCES` | `CONFIRMED_1_SOURCE` | `TIER_D_REVENUE` | `UNCONFIRMED` (drop `UNCONFIRMED`).
- **Need Score Flags (0–10, qualify at >= 4 with >= 2 distinct signal categories: Instagram, blog, team, hiring)**:
  - `IG_STALE_30D` (+2) or `IG_STALE_14D` (+1); `NO_IG_FOUND` (+2)
  - `IG_MEDIAN_GAP_14D` (+2) or `IG_MEDIAN_GAP_7D` (+1)
  - `IG_IRREGULAR_GAP` (+1: longest gap > 14 days AND > 3x shortest gap)
  - `NO_OR_STALE_BLOG_90D` (+2: no blog or latest post > 90 days before retrieval date)
  - `NO_MARKETING_TITLE_ON_TEAM` (+2: public team/about/LinkedIn shows no marketing/growth/content title)
  - `HIRING_MARKETING_ROLE` (+1: public careers page lists open marketing/growth role)
- **Master CSV Column Order**:
  `name,website,industry,city,what_they_do,recent_activity,tier,round_type,amount,funding_date,investors,funding_sources,funding_confidence,founder_or_marketing_contact,instagram_url,ig_status,ig_followers,ig_post_1,ig_post_2,ig_post_3,ig_post_4,ig_post_5,ig_days_since_latest,ig_median_gap_days,ig_screenshot_path,blog_url,blog_last_post_date,blog_posts_last_90_days,marketing_titles_found,hiring_marketing_role,need_score,score_flags,unique_offer,closest_overlap,pitch_hook,evidence_paths`
- **Unknown / Blocked Values**: `NOT_FOUND` when absent; `BLOCKED: <reason>` when blocked. Never guess.
