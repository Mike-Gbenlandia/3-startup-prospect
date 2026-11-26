> ## Documentation Index
> Fetch the complete documentation index at: https://docs.firecrawl.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Alexandria

> The knowledge library for superintelligence

An illustrative agent journey with Alexandria

Alexandria gives agents access to structured data through Firecrawl. Discover a tool, inspect its inputs, then run it. Discovery is free; execution uses the credits listed on the tool.

[Browse providers](https://www.firecrawl.dev/app/alexandria) · [Manage provider terms](https://www.firecrawl.dev/app/settings?tab=data-sources) · [Sports and fantasy data example](https://docs.firecrawl.dev/use-cases/sports-fantasy.md)

## Built for agents

Install the [CLI](https://docs.firecrawl.dev/sdks/cli.md) or connect the [MCP server](https://docs.firecrawl.dev/mcp-server.md).

> [tab] Firecrawl CLI
>
> ```bash theme={null}
> # Find tools alongside web results.
> firecrawl search "podcast conversations about AI agents" --sources web,alexandria --domain-tools --limit 2
>
> # Inspect inputs and pricing.
> firecrawl find-tools --options '{"providers":["particle"],"level":"tools","expand":["options","response"]}' --include-costs
>
> # Run the tool.
> firecrawl scrape particle/podcasts/episodes/search --options '{"keyword_search":"AI agents","limit":2}'
> ```
>
> Install with `npm install -g firecrawl-cli` and sign in with `firecrawl login`.

> [tab] MCP
>
> Ask your agent: "Find Particle's podcast tools, inspect episode-search inputs and pricing, then find conversations about AI agents."
>
> The agent uses `firecrawl_search` to discover tools, `alexandria_library_search` to inspect them, and `alexandria_library_read` to execute them.

## Use it from the SDKs and API

**1. Find the right tool**

Describe what you need. Alexandria returns relevant tools alongside your web results.

```javascript JavaScript theme={null}
const result = await firecrawl.search(
  "podcast conversations about AI agents",
  {
    sources: ["web", "alexandria"],
    limit: 2,
  },
);
```

```python Python theme={null}
result = firecrawl.search(
    "podcast conversations about AI agents",
    sources=["web", "alexandria"],
    limit=2,
)
```

```bash cURL theme={null}
curl https://api.firecrawl.dev/v2/search \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "query": "podcast conversations about AI agents",
  "sources": [
    "web",
    "alexandria"
  ],
  "limit": 2
}'
```

Results contain `web` pages and ranked `tools`. Each tool includes its provider, capability, and description. Use [Find Tools](#find-tools) to read a tool's inputs, response contract, and price.

**2. Check what it needs**

Read the selected tool's `options`, `response`, and execution price before calling it. Use [Find Tools](#find-tools) for more detail.

**3. Get the data**

Use `scrape` to call the tool with the inputs from its contract. Supply the provider and capability under `alexandria`; no page URL is needed.

```javascript JavaScript theme={null}
const episodes = await firecrawl.scrape({
  alexandria: {
    provider: "particle",
    capability: "podcasts/episodes/search",
    options: {
      semantic_search: "AI agents",
      limit: 2,
    },
  },
});

console.log(episodes.alexandria[0].data);
```

```python Python theme={null}
episodes = firecrawl.scrape(
    alexandria={
        "provider": "particle",
        "capability": "podcasts/episodes/search",
        "options": {
            "semantic_search": "AI agents",
            "limit": 2,
        },
    },
)

print(episodes.alexandria[0].data)
```

```bash cURL theme={null}
REQUEST_ID="$(uuidgen)"

curl https://api.firecrawl.dev/v2/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d '{
  "alexandria": {
    "provider": "particle",
    "capability": "podcasts/episodes/search",
    "options": {
      "semantic_search": "AI agents",
      "limit": 2
    }
  }
}'
```

Read the result from `episodes.alexandria[0].data`. Check each tool result for errors before using its data. Raw HTTP responses wrap the SDK result in `data`.

## Find Tools

Use `findTools` / `find_tools` to browse providers and inspect their tools for free. Follow an item's `next` request for more detail; the top-level `next` paginates the catalogue.

```javascript JavaScript theme={null}
const catalogue = await firecrawl.findTools({
  providers: ["particle"],
  limit: 2,
});

// Each next request reveals another part of the catalogue.
const next = catalogue.items[0]?.next;
if (next) {
  const details = await firecrawl.scrape({ alexandria: next });
  console.log(details.alexandria[0].data);
}
```

```python Python theme={null}
catalogue = firecrawl.find_tools(providers=["particle"], limit=2)

if catalogue.items and catalogue.items[0].get("next"):
    details = firecrawl.scrape(alexandria=catalogue.items[0]["next"])
    print(details.alexandria[0].data)
```

## Use it from Agent

[Agent](https://docs.firecrawl.dev/features/agent.md) runs can call your team's providers on their own while they research. Send `exchange: { "enabled": true }` with the request, and pin up to five providers with `toolkits` if you want. Without `exchange`, an API or SDK run uses the web only. See [Use your connected Alexandria tools](https://docs.firecrawl.dev/features/agent.md#use-your-connected-alexandria-tools).

## Pricing and access

* **Tool discovery:** free. Use `sources: ["alexandria"]` for tools only, or `["web", "alexandria"]` to include paid web results.
* **Execution:** charged at the tool's listed price.
* **Firecrawl indexes:** the Government Index and Research Index tools are free. Their calls count toward the same per-minute and daily limits as the indexes' own endpoints. The daily limit is set by your plan, and Scale and Enterprise plans have none. See [rate limits](https://docs.firecrawl.dev/rate-limits.md#government-and-research-indexes).
* **Provider terms:** a `THIRD_PARTY_DATA_TERMS_REQUIRED` error includes `requiresAction.url`. An org admin must review and accept the terms there. Agents need explicit user authorization before accepting terms. [Agent](https://docs.firecrawl.dev/features/agent.md#data-providers-that-need-terms) runs skip providers whose terms your team hasn't accepted and report them in `exchange.skippedProviders`.

> [accordion] Find tools for a website
>
> Add `domainTools: true` to a search or ordinary URL scrape to include tools matched to the website. Matching is free; the web search or page scrape is billed normally. Results include `matchedBy` and `matchedUrls`.
>
> Search enables domain matching by default when `sources` includes `alexandria`; set `domainTools: false` to disable it. For URL scrapes, domain matching is off by default.

## Feedback

Report issues or request capabilities with `firecrawl alexandria feedback`, or with the MCP `firecrawl_feedback` tool using `endpoint: "alexandria"`. Run `firecrawl alexandria feedback --help` for options.

Alexandria feedback must be sent within 20 minutes of your team's most recent Alexandria search, discovery, or execution. Each Alexandria call restarts the window; later feedback is rejected with `FEEDBACK_WINDOW_EXPIRED`.

Each feedback refunds 1 credit, for any rating. Refunds are capped per UTC day at 10 credits per website and 100 credits per team. Past either cap, feedback is still recorded without a refund; the response returns `websiteCapReached: true` when that website's cap is reached, and `dailyCapReached: true` when the team's cap is reached.

Bounty: 5,000 credit reward
&#x20;for solid feedback on Alexandria

To qualify, complete a high-signal interview (thoughtful, concrete use cases, etc) with our Firecrawl Feedback Assistant. Only takes a few minutes, can be stopped at any time, and is both human/agent-friendly (just paste the link into your agentic harness!). Haven't used Alexandria yet? Your take still counts.

[Start the interview](https://www.firecrawl.dev/survey/uilpn?src=docs-alexandria)

Include your email to be eligible. Interviews are reviewed for quality at the end of each week.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.