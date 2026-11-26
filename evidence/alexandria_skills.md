---
name: firecrawl-alexandria-usage
description: |
  Firecrawl Alexandria gives AI agents structured data from catalogued
  providers: public APIs, licensed publishers, ready-made website
  workflows and Firecrawl's own indexes. Use this skill to find, inspect
  and call provider tools when a task needs records rather than pages.
  Alexandria comes with every Firecrawl connector, MCP server and CLI.
---

# Firecrawl Alexandria

Firecrawl Alexandria is a library of data providers that agents reach through one Firecrawl API key. Each provider exposes tools that return typed, sourced records through a published contract: its inputs, a sample request and response, and its price in credits.

Prefer a provider tool when the task needs the same fields across many entities, exact figures or timestamps, provenance, or many records. Use web search and scrape when a page already answers the question.

## Before you start

Alexandria comes with Firecrawl. An agent connected through the Firecrawl connector or plugin, MCP server or CLI already has it, with nothing else to install. If Firecrawl is not connected yet, read and follow https://www.firecrawl.dev/agent-onboarding/SKILL.md, then come back here.

Discovery is free, so check access before the task: through MCP, run `firecrawl_search` with `sources: ["alexandria"]`; with the CLI, run `firecrawl search alexandria 'federal contract opportunities'`. Either should return tool matches.

## Find, inspect, call

Through MCP:

1. Find a tool (free): `firecrawl_search` with `sources: ["alexandria"]` and a query for the data you need, or `firecrawl_find_tools` with the website's URL in `urls`.
2. Read its contract (free): `firecrawl_find_tools` with the `providers` and `capabilities` from step 1.
3. Call it (billed at its listed price): `firecrawl_scrape` with `alexandria: {provider, capability, options}` and no `url`.

With the CLI:

```bash
# 1. Find a tool (free). Plain `firecrawl search` returns web results and matching tools together.
firecrawl search alexandria '<data you need>'
firecrawl find-tools <url>

# 2. Read its contract (free)
firecrawl list <provider> <capability> --pretty

# 3. Call it (billed at its listed price)
firecrawl scrape <provider>/<capability> --options '<JSON matching the contract>' --json -o .firecrawl/<name>.json
```

Example:

```bash
firecrawl search alexandria 'open federal cybersecurity contracts'
firecrawl list sam-gov opportunities/search --pretty
firecrawl scrape sam-gov/opportunities/search --options '{"query":"cybersecurity","statuses":["active"],"page_size":20}' --json -o .firecrawl/sam-gov.json
```

Browse instead of searching with `firecrawl list` (categories), `firecrawl list <category> --category` and `firecrawl list <provider>`.

| Surface | Discover | Execute |
| --- | --- | --- |
| CLI | `firecrawl search alexandria`, `firecrawl find-tools`, `firecrawl list` | `firecrawl scrape <provider>/<capability> --options` |
| MCP | `firecrawl_search` with `sources: ["alexandria"]`, `firecrawl_find_tools` | `firecrawl_scrape` with an `alexandria` body and no `url` |
| API | `POST /v2/search` with `sources: ["alexandria"]` | `POST /v2/scrape` with `alexandria: {provider, capability, options}` and no `url` |

## Rules

- Alexandria providers need a signed-in Firecrawl connection: a connector, MCP OAuth, a CLI login or an API key. The keyless free tier covers search, scrape, interact, parse and the research indexes, not Alexandria providers, so if a keyless call is refused, connect Firecrawl with the onboarding skill.
- A tool match is not executed data. Use the provider and capability IDs that discovery returns and send exactly the inputs the contract declares.
- Check each `data.alexandria[]` result for an error, not only the outer success flag.
- Report the credits spent from `data.creditsCost`, the request's total. A result the MCP server retains instead of inlining carries it as a top-level `creditsCost`. Through the API, each `data.alexandria[]` item also carries its own `creditsCost`.
- Write large results to disk with `-o` and read only what the task needs.
- If no tool covers the task, continue with web search, scrape or `firecrawl-agent`. Do not pay for adjacent tools to probe coverage.
- A `THIRD_PARTY_DATA_TERMS_REQUIRED` error means an organization admin must accept the provider's terms. Give the human the `requiresAction.url`. A data request does not authorize acceptance.

## Feedback

After the last Alexandria call for a website, send one report on how the catalogue served the task. It is optional, and each report refunds 1 credit (up to 10 per website and 100 per team each UTC day). Send it within 20 minutes of the last Alexandria search, discovery or execution; later reports are rejected with `FEEDBACK_WINDOW_EXPIRED`. Skip it when `FIRECRAWL_NO_ENDPOINT_FEEDBACK=1` is set.

Through MCP, call `firecrawl_feedback` with `endpoint: "alexandria"`, no `jobId`, `requestedWebsite: {url, requestedFunctionality}`, `objective` (the underlying goal), `rationale` (why, from the results you saw) and `rating` (`good`, `partial` or `bad`). Rate single calls with `callRatings: [{ref, rating}]`, using the `feedbackRef` on each result.

With the CLI:

```bash
firecrawl alexandria feedback --rating <good|partial|bad> --url <website> \
  --requested-functionality "<what you needed from it>" \
  --objective "<the underlying goal>" --rationale "<why, from the results you saw>" --silent &
```

Run `firecrawl alexandria feedback --help` for every option.

## Ready-made tools by Firecrawl

Firecrawl also publishes its own tools: ready-made jobs that chain several providers' tools into one, each with the instructions an agent follows. [Browse tools by Firecrawl](https://alexandria.firecrawl.dev/tools?by=firecrawl).

## Resources

- [Docs](https://docs.firecrawl.dev/features/alexandria): Alexandria from the API, MCP server and CLI.
