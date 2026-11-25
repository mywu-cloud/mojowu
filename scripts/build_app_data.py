"""Compact content/n5.json into the payload the app loads (public/data/n5.json).

Usage: python3 scripts/build_app_data.py content/n5.json public/data/n5.json
"""
import json, sys

src, out = sys.argv[1:3]
d = json.load(open(src, encoding="utf-8"))
m = {
    "u": [[u["unit"], u["title"]] for u in d["units"]],
    "k": [[k["id"], k["kanji"], k["unit"], k["traditional"], k["zh"], k["on"], k["kun"]] for k in d["kanji"]],
    "v": [[v["id"], v["unit"], v["expression"], v["reading"], v["zh"], v["requires_kanji"], v["false_friend"]] for v in d["vocab"]],
    "g": [[g["id"], g["unit"], g["pattern"], g["zh"], g["example_jp"], g["example_zh"]] for g in d["grammar"]],
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(m, f, ensure_ascii=False, separators=(",", ":"))
print(f"wrote {out}: {len(m['k'])} kanji, {len(m['v'])} vocab, {len(m['g'])} grammar")
