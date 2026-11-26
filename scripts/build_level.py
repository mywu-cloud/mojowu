"""Build one JLPT level (N4–N1) from open datasets + hand-written zh glosses/grammar.

Usage:
  python3 scripts/build_level.py LEVEL kanji.json vocab.csv
    LEVEL = n4 | n3 | n2 | n1
  Reads (scripts/):  {level}_zh.txt  {level}_kanji_zh.txt  {level}_grammar.txt  [{level}_false_friends.txt]  shinjitai_trad.json
  Reads (public/data/): lower levels' app data, to link vocab to already-taught kanji
  Writes: content/{level}.json (full, for review)  public/data/{level}.json (app payload)
IDs: {level}-k001 / {level}-v0001 / {level}-g01 (N1 kanji use 4 digits). Never renumber (CLAUDE.md rule 4).
"""
import csv, json, os, re, sys
from collections import defaultdict

LEVEL, KANJI_SRC, VOCAB_SRC = sys.argv[1:4]
LV = int(LEVEL[1])
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
P = lambda name: os.path.join(HERE, name)

# 單元：N4 依主題人工指定（{level}_zh.txt 第三欄）；N3 起依漢字頻率自動分（AUTO_UNITS 個，標題列出代表漢字）
AUTO_UNITS = {"n3": 20, "n2": 20, "n1": 30}
UNIT_TITLES = {
    "n4": ["家與日常生活", "人際關係與敬語", "學校與學習", "工作與社會", "交通、旅行與地點",
           "飲食、購物與物品", "身體、健康與心情", "自然、天氣與時間", "常用動詞：動作與變化", "副詞、連接詞與句型"],
}
GRAMMAR_PER_UNIT = {"n4": 8, "n3": 6, "n2": 8, "n1": 5}

# 原始資料中的錯誤讀音（expression → reading）
READING_FIX = {"ごらんになる": "ごらんになる", "かまう": "かまう", "いただく": "いただく"}

def kata(s): return "".join(chr(ord(c) + 0x60) if "ぁ" <= c <= "ゖ" else c for c in s)
is_kana = lambda s: bool(re.fullmatch(r"[ぁ-ゖァ-ヺー～〜・\s();；、()（）a-zA-Z]+", s))
KANJI_RE = re.compile(r"[一-鿿々]")
# 原始資料的註記（感嘆詞標記「(かん)」、釋義註記等），不是表記的一部分
NOTE_RE = re.compile(r"\s*\((?:かん|とりわけ|な)\)")
# 原始資料表記中夾帶說明的條目（原表記 → 表記、讀音）
EXPR_FIX = {"〜 (まる) ごと": ("～まるごと", "～まるごと"), "(かさを～) さす": ("さす", "さす"),
            "〜(日本) 式": ("～式", "～しき"), "～いち (にほんいち)": ("～いち", "～いち"),
            "～おしまい (おわり)": ("～おしまい", "～おしまい"), "～ほう (ひかく)": ("～ほう", "～ほう"),
            "かび (～がはえる)": ("かび", "かび"), "しいんと (する)": ("しいんと", "しいんと"),
            "じゅうたん (カーペット)": ("じゅうたん", "じゅうたん"), "しわ (かおの～)": ("しわ", "しわ"),
            # N1
            "こす (みずを～)": ("こす", "こす"), "こつ (をつかむ)": ("こつ", "こつ"),
            "さきに (いぜん)": ("さきに", "さきに"), "さぞ (さぞや。さぞかし)": ("さぞ", "さぞ"),
            "さらう (こどもを～)": ("さらう", "さらう"), "とげ (をさす)": ("とげ", "とげ"),
            "おごる (ゆうしょくを～)": ("おごる", "おごる"), "かく (はじを)": ("かく", "かく"),
            "くじ (～をひく)": ("くじ", "くじ"), "あせる (こえが～)": ("あせる", "あせる"),
            "(花を〜) 生ける, 活ける": ("生ける; 活ける", "いける"), "すくう (みずを～)": ("すくう", "すくう"),
            "そり (～にのる)": ("そり", "そり"), "つじつま (はなしの～)": ("つじつま", "つじつま"),
            "つぶる (めを～)": ("つぶる", "つぶる"), "またがる (うまを～)": ("またがる", "またがる"),
            "よって (よりどころ)": ("よって", "よって"), "ひび (かべの～)": ("ひび", "ひび"),
            "副": ("とりわけ", "とりわけ")}  # N1 原始資料把「とりわけ」的表記誤植為「副」

def clean_reading(expr, rd):
    rd = rd.strip().replace("、", "; ")
    if expr in READING_FIX: return READING_FIX[expr]
    if not rd: return expr if is_kana(expr) else ""
    if KANJI_RE.search(rd) and is_kana(expr): return expr          # 欄位對調
    if rd.endswith("する") and re.fullmatch(r"[一-鿿々]+", expr): rd = rd[:-2]  # 運動|うんどうする（表記全為漢字才去掉）
    return rd

def lines(name):
    path = P(name)
    if not os.path.exists(path): return []
    return [l.rstrip("\n") for l in open(path, encoding="utf-8") if l.strip()]

def main():
    kd = json.load(open(KANJI_SRC, encoding="utf-8"))
    trad = json.load(open(P("shinjitai_trad.json"), encoding="utf-8"))
    lvk = {c: v for c, v in kd.items() if v.get("jlpt_new") == LV}
    kzh = dict(l.split("|", 1) for l in lines(f"{LEVEL}_kanji_zh.txt"))
    missing = [c for c in lvk if c not in kzh]
    assert not missing, f"missing kanji glosses: {''.join(missing)}"
    ff = dict(l.split("|", 1) for l in lines(f"{LEVEL}_false_friends.txt"))
    rows = list(csv.DictReader(open(VOCAB_SRC, encoding="utf-8")))
    zh = {}
    for l in lines(f"{LEVEL}_zh.txt"):
        f = l.split("|"); zh[int(f[0])] = (f[1], int(f[2]) if len(f) > 2 else 0)
    assert sorted(zh) == list(range(len(rows))), (len(zh), len(rows))
    auto = LEVEL in AUTO_UNITS
    nunits = AUTO_UNITS[LEVEL] if auto else len(UNIT_TITLES[LEVEL])

    # 已教過的漢字（較低級數）→ ID
    known = {}
    for lower in range(5, LV, -1):
        path = os.path.join(ROOT, "public", "data", f"n{lower}.json")
        for k in json.load(open(path, encoding="utf-8"))["k"]: known[k[1]] = k[0]

    width = 4 if len(lvk) > 999 else 3
    vocab = []
    for i, r in enumerate(rows):
        g, u = zh[i]
        if r["expression"].strip() in EXPR_FIX:
            expr, rd = EXPR_FIX[r["expression"].strip()]
        else:
            expr = NOTE_RE.sub("", r["expression"]).strip().replace("、", "; ")
            rd = clean_reading(expr, NOTE_RE.sub("", r["reading"]))
        primary = expr.split(";")[0].strip()
        kanji_in = list(dict.fromkeys(c for c in primary if KANJI_RE.match(c)))
        vocab.append({"id": f"{LEVEL}-v{i+1:04d}", "unit": u, "expression": expr, "reading": rd, "zh": g,
                      "en": r["meaning"].strip(), "kanji": kanji_in, "false_friend": ff.get(primary, "")})
    ordered = sorted(lvk.items(), key=lambda kv: kv[1]["freq"] or 9999)
    first_use = defaultdict(lambda: 99)
    if auto:
        # 依頻率平均分配漢字；沒有本級漢字的單字平均分到各單元
        for n, (c, _) in enumerate(ordered): first_use[c] = 1 + n * nunits // len(ordered)
        plain = [v for v in vocab if not any(c in lvk for c in v["kanji"])]
        for n, v in enumerate(plain): v["unit"] = 1 + n * nunits // len(plain)
    else:
        for v in vocab:
            for c in v["kanji"]:
                if c in lvk: first_use[c] = min(first_use[c], v["unit"])
    unused = [c for c, _ in ordered if first_use[c] == 99]
    kanji = []
    for c, d in ordered:
        u = first_use[c] if first_use[c] != 99 else 1 + unused.index(c) * nunits // max(1, len(unused))
        kanji.append({"id": f"{LEVEL}-k{len(kanji)+1:0{width}d}", "kanji": c, "unit": u, "traditional": trad.get(c, c),
                      "shinjitai_differs": c in trad, "zh": kzh[c], "on": [kata(x) for x in d["readings_on"]],
                      # kun 去掉「粉：デシメートル」這類片假名單位讀法
                      "kun": [x for x in d["readings_kun"] if not re.search(r"[ァ-ヺ]", x)], "strokes": d["strokes"], "freq": d["freq"],
                      "en": d["meanings"][0] if d["meanings"] else ""})
    kid = {k["kanji"]: k["id"] for k in kanji}; kunit = {k["kanji"]: k["unit"] for k in kanji}
    for v in vocab:
        v["requires_kanji"] = [kid.get(c) or known[c] for c in v["kanji"] if c in kid or c in known]
        v["unit"] = max([v["unit"]] + [kunit[c] for c in v["kanji"] if c in kunit])
    grammar = []
    for i, l in enumerate(lines(f"{LEVEL}_grammar.txt")):
        p, ex, jp, tr = l.split("|")
        grammar.append({"id": f"{LEVEL}-g{i+1:02d}", "unit": min(nunits, i // GRAMMAR_PER_UNIT[LEVEL] + 1), "pattern": p, "zh": ex,
                        "example_jp": jp, "example_zh": tr})
    if auto:
        titles = ["代表字 " + "・".join(k["kanji"] for k in kanji if k["unit"] == u)[:9] for u in range(1, nunits + 1)]
    else:
        titles = UNIT_TITLES[LEVEL]
    units = [{"unit": u, "title": t, "kanji": sum(k["unit"] == u for k in kanji), "vocab": sum(v["unit"] == u for v in vocab),
              "grammar": sum(g["unit"] == u for g in grammar)} for u, t in enumerate(titles, 1)]
    bad = [v["id"] for v in vocab if not v["reading"]]
    assert not bad, f"empty readings: {bad}"
    data = {"meta": {"level": LEVEL.upper(), "sources": [
                "Kanji: davidluzgouveia/kanji-data (MIT), readings from KANJIDIC (EDRDG)",
                "Vocabulary: jamsinclair/open-anki-jlpt-decks (MIT), based on tanos.co.uk JLPT lists (CC BY)",
                "Shinjitai→traditional: OpenCC (Apache-2.0)",
                "Traditional Chinese glosses, units, grammar points, examples: written for this project (not yet reviewed)"]},
            "units": units, "kanji": kanji, "vocab": vocab, "grammar": grammar}
    os.makedirs(os.path.join(ROOT, "content"), exist_ok=True)
    json.dump(data, open(os.path.join(ROOT, "content", f"{LEVEL}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    app = {"u": [[u["unit"], u["title"]] for u in units],
           "k": [[k["id"], k["kanji"], k["unit"], k["traditional"], k["zh"], k["on"], k["kun"]] for k in kanji],
           "v": [[v["id"], v["unit"], v["expression"], v["reading"], v["zh"], v["requires_kanji"], v["false_friend"]] for v in vocab],
           "g": [[g["id"], g["unit"], g["pattern"], g["zh"], g["example_jp"], g["example_zh"]] for g in grammar]}
    out = os.path.join(ROOT, "public", "data", f"{LEVEL}.json")
    json.dump(app, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{LEVEL}: kanji {len(kanji)}, vocab {len(vocab)}, grammar {len(grammar)}, false friends {sum(bool(v['false_friend']) for v in vocab)}")
    for u in units: print(" ", u)

main()
