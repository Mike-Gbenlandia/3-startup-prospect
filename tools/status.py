import csv, json, os, sys

prog = json.load(open("state/progress.json"))
rows = list(csv.DictReader(open("state/queue.csv")))
f_cnt, a_cnt = {}, {}
for r in rows:
    f_cnt[r["funding_status"]] = f_cnt.get(r["funding_status"], 0) + 1
    a_cnt[r["audit_status"]] = a_cnt.get(r["audit_status"], 0) + 1

pending = [r["slug"] for r in rows if r["funding_status"] == "PENDING"] + [r["slug"] for r in rows if r["funding_status"] == "VERIFIED" and r["audit_status"] == "PENDING"]
done_rows = [r for r in rows if r["audit_status"] == "DONE"]
log_lines = [l.strip() for l in open("run_log.jsonl") if l.strip()] if os.path.exists("run_log.jsonl") else []
log_text = "\n".join(log_lines)

print(f"PHASE: {prog['phase']} ({prog['phase_status']}) | TOTAL: {len(rows)}")
print(f"FUNDING: {f_cnt}")
print(f"AUDIT: {a_cnt}")
print(f"CURRENT: {prog['current']}")
print(f"NEXT: {prog['next_action']}")
print(f"NEXT_5_PENDING: {pending[:5]}")
print("LAST_5_RUN_LOG:")
for l in log_lines[-5:]:
    d = json.loads(l)
    print(f"  {d.get('timestamp')} | {d.get('tool')} | {d.get('outcome')} | {d.get('raw_output_path')}")
print("LAST_3_DONE_CHECK:")
for r in done_rows[-3:]:
    s = r["slug"]
    has_ss = os.path.exists(f"screenshots/{s}_instagram.png") and os.path.getsize(f"screenshots/{s}_instagram.png") > 0
    has_log = s in log_text or f"{s}_" in log_text
    print(f"  {s}: screenshot={has_ss}, log_match={has_log}")
