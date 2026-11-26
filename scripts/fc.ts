import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const API_BASE = 'https://api.firecrawl.dev/v2';

const STATE_FILE = '.fc_key_idx';

function getApiKeys(): string[] {
  const raw = process.env.FIRECRAWL_API_KEY?.trim();
  if (!raw) {
    throw new Error('FIRECRAWL_API_KEY is not set in environment');
  }
  const keys = raw.split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('FIRECRAWL_API_KEY has no valid keys');
  }
  return keys;
}

function getActiveKeyIndex(total: number): number {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const idx = parseInt(fs.readFileSync(STATE_FILE, 'utf8').trim(), 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < total) return idx;
    }
  } catch {}
  return 0;
}

function setActiveKeyIndex(idx: number) {
  try {
    fs.writeFileSync(STATE_FILE, String(idx), 'utf8');
  } catch {}
}

function appendRunLog(entry: {
  timestamp: string;
  tool: string;
  exact_input: unknown;
  scrape_id: string | null;
  credits: number | null;
  outcome: 'ok' | 'error' | 'blocked';
  raw_output_path: string;
  extra?: Record<string, unknown>;
}) {
  fs.appendFileSync('run_log.jsonl', JSON.stringify(entry) + '\n', 'utf8');
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isQuotaExhausted(status: number, json: any): boolean {
  if (status === 402) return true;
  const msg = String(json?.error || json?.message || '').toLowerCase();
  return (
    msg.includes('insufficient credits') ||
    msg.includes('payment required') ||
    msg.includes('credit limit') ||
    msg.includes('out of credits') ||
    msg.includes('quota exceeded')
  );
}

async function callApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: unknown,
  extraHeaders?: Record<string, string>
) {
  const keys = getApiKeys();
  let idx = getActiveKeyIndex(keys.length);
  let lastResult: { status: number; ok: boolean; json: any } = { status: 500, ok: false, json: { error: 'No keys tried' } };

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[idx];
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(extraHeaders || {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { rawText: text };
    }

    lastResult = { status: res.status, ok: res.ok, json };

    if (!res.ok && isQuotaExhausted(res.status, json) && idx + 1 < keys.length) {
      idx += 1;
      setActiveKeyIndex(idx);
      console.error(`[fc] Key #${idx} exhausted (HTTP ${res.status}); rotating to key #${idx + 1}.`);
      continue;
    }

    return lastResult;
  }

  return lastResult;
}

export async function runFirecrawlTool(opts: {
  tool: 'credit_usage' | 'search' | 'scrape' | 'interact' | 'interact_stop' | 'alexandria' | 'map' | 'crawl';
  endpoint: string;
  method: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  outPath: string;
  markdownOutPath?: string;
  scrapeIdOverride?: string;
  extraHeaders?: Record<string, string>;
  extraLog?: Record<string, unknown>;
}) {
  ensureDir(opts.outPath);
  const { status, ok, json } = await callApi(opts.endpoint, opts.method, opts.body, opts.extraHeaders);
  fs.writeFileSync(opts.outPath, JSON.stringify({ httpStatus: status, ...json }, null, 2), 'utf8');

  if (opts.markdownOutPath && json?.data?.markdown) {
    ensureDir(opts.markdownOutPath);
    fs.writeFileSync(opts.markdownOutPath, json.data.markdown, 'utf8');
  }

  const scrapeId: string | null =
    opts.scrapeIdOverride ||
    json?.data?.metadata?.scrapeId ||
    json?.data?.scrape_id ||
    json?.scrape_id ||
    json?.scrapeId ||
    null;

  let credits: number | null = null;
  if (typeof json?.creditsUsed === 'number') credits = json.creditsUsed;
  else if (typeof json?.data?.creditsUsed === 'number') credits = json.data.creditsUsed;
  else if (typeof json?.data?.creditsCost === 'number') credits = json.data.creditsCost;
  else if (typeof json?.creditsCost === 'number') credits = json.creditsCost;
  else if (typeof json?.data?.metadata?.creditsUsed === 'number') credits = json.data.metadata.creditsUsed;

  let outcome: 'ok' | 'error' | 'blocked' = ok && json?.success !== false ? 'ok' : 'error';
  if (status === 403 || status === 429 || json?.data?.metadata?.statusCode === 403 || json?.data?.metadata?.statusCode === 429) {
    if (!ok) outcome = 'blocked';
  }

  appendRunLog({
    timestamp: new Date().toISOString(),
    tool: opts.tool,
    exact_input: opts.body ?? { endpoint: opts.endpoint, method: opts.method },
    scrape_id: scrapeId,
    credits,
    outcome,
    raw_output_path: opts.outPath,
    ...(opts.extraLog ? { extra: opts.extraLog } : {}),
  });

  return { status, ok, json, scrapeId, credits, outcome };
}

async function main() {
  const [, , cmd, ...args] = process.argv;
  if (!cmd) {
    console.error('Usage: tsx scripts/fc.ts <credits|search|scrape|interact|interact-stop|alexandria-find|alexandria-call> [args]');
    process.exit(1);
  }

  if (cmd === 'credits') {
    const outPath = args[0] || `evidence/credit_usage_${Date.now()}.json`;
    const r = await runFirecrawlTool({
      tool: 'credit_usage',
      endpoint: '/team/credit-usage',
      method: 'GET',
      outPath,
    });
    console.log(JSON.stringify({ status: r.status, outcome: r.outcome, data: r.json?.data, outPath }, null, 2));
  } else if (cmd === 'search') {
    const payload = JSON.parse(args[0]);
    const outPath = args[1] || `evidence/search_${Date.now()}.json`;
    const r = await runFirecrawlTool({
      tool: 'search',
      endpoint: '/search',
      method: 'POST',
      body: payload,
      outPath,
    });
    console.log(JSON.stringify({ status: r.status, outcome: r.outcome, credits: r.credits, outPath, webCount: r.json?.data?.web?.length, newsCount: r.json?.data?.news?.length, toolsCount: r.json?.data?.tools?.length }, null, 2));
  } else if (cmd === 'scrape') {
    const payload = JSON.parse(args[0]);
    const outPath = args[1] || `evidence/scrape_${Date.now()}.json`;
    const mdPath = args[2];
    const r = await runFirecrawlTool({
      tool: 'scrape',
      endpoint: '/scrape',
      method: 'POST',
      body: payload,
      outPath,
      markdownOutPath: mdPath,
    });
    console.log(JSON.stringify({ status: r.status, outcome: r.outcome, scrapeId: r.scrapeId, credits: r.credits, outPath, mdPath }, null, 2));
  } else if (cmd === 'interact') {
    const scrapeId = args[0];
    const payload = JSON.parse(args[1]);
    const outPath = args[2] || `evidence/interact_${Date.now()}.json`;
    const r = await runFirecrawlTool({
      tool: 'interact',
      endpoint: `/scrape/${scrapeId}/interact`,
      method: 'POST',
      body: payload,
      outPath,
      scrapeIdOverride: scrapeId,
    });
    console.log(JSON.stringify({ status: r.status, outcome: r.outcome, scrapeId: r.scrapeId, liveViewUrl: r.json?.liveViewUrl, exitCode: r.json?.exitCode, outPath }, null, 2));
  } else if (cmd === 'interact-stop') {
    const scrapeId = args[0];
    const outPath = args[1] || `evidence/interact_stop_${Date.now()}.json`;
    const r = await runFirecrawlTool({
      tool: 'interact_stop',
      endpoint: `/scrape/${scrapeId}/interact`,
      method: 'DELETE',
      outPath,
      scrapeIdOverride: scrapeId,
    });
    console.log(JSON.stringify({ status: r.status, outcome: r.outcome, scrapeId: r.scrapeId, outPath }, null, 2));
  } else if (cmd === 'alexandria-call') {
    const payload = JSON.parse(args[0]);
    const outPath = args[1] || `evidence/alexandria_${Date.now()}.json`;
    const reqId = crypto.randomUUID();
    const r = await runFirecrawlTool({
      tool: 'alexandria',
      endpoint: '/scrape',
      method: 'POST',
      body: { alexandria: payload },
      outPath,
      extraHeaders: { 'x-request-id': reqId },
      extraLog: { requestId: reqId },
    });
    console.log(JSON.stringify({ status: r.status, outcome: r.outcome, credits: r.credits, outPath }, null, 2));
  } else {
    console.error('Unknown command:', cmd);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
