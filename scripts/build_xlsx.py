import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

src, out = sys.argv[1:3]
d = json.load(open(src, encoding="utf-8"))
F = "Arial"
HEAD = PatternFill("solid", start_color="C23B22")
ZEBRA = PatternFill("solid", start_color="F7F3EA")
thin = Side(style="thin", color="E6DED0")

wb = Workbook()

def table(ws, headers, rows, widths):
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(name=F, bold=True, color="FFFFFF"); c.fill = HEAD
        c.alignment = Alignment(vertical="center", wrap_text=True)
    for r in rows:
        ws.append(r)
    for i, row in enumerate(ws.iter_rows(min_row=2), start=2):
        for c in row:
            c.font = Font(name=F); c.alignment = Alignment(vertical="top", wrap_text=True)
            c.border = Border(bottom=thin)
            if i % 2 == 0: c.fill = ZEBRA
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions

# 說明
ws = wb.active; ws.title = "說明"
lines = [
 ("日語學習 APP・N5 內容資料庫 v0.1", True),
 ("產生日期：2026-11-25", False), ("", False),
 ("工作表", True),
 ("單元總覽：10 個主題單元，漢字/單字/文法數量以公式即時統計", False),
 ("漢字：N5 漢字 79 字，含音讀、訓讀、繁體對照、所屬單元", False),
 ("單字：N5 單字 718 筆，含讀音、中文、英文、所需漢字、和製漢語提醒", False),
 ("文法：N5 文法 60 點，每單元 6 點，含中文說明與例句", False),
 ("和製漢語：中文使用者容易誤解的單字", False), ("", False),
 ("解鎖規則", True),
 ("單字的「所需漢字」學到熟練後才解鎖；每個漢字排在第一個用到它的單元，所以不會延後任何單字。", False),
 ("U2 數字與時間的漢字特別多（日期、星期），建議 App 內拆成兩週完成。", False),
 ("單字中不屬於 N5 的漢字（如 駅、鉛筆）以注音假名顯示，不列入解鎖條件。", False), ("", False),
 ("資料來源與授權", True),
 ("漢字：davidluzgouveia/kanji-data（MIT），讀音源自 KANJIDIC；未使用其中 WaniKani 欄位。", False),
 ("單字：jamsinclair/open-anki-jlpt-decks（MIT），原始清單來自 tanos.co.uk（CC BY）。商用時須標註出處。", False),
 ("中文釋義、單元分類、文法點與例句：本專案自行撰寫，上線前建議由日語教師校對。", False),
 ("JLPT 自 2010 年起不公布官方字表，N5 範圍為業界依歷屆考題整理的估計。", False),
]
for t, b in lines:
    ws.append([t]); ws.cell(ws.max_row, 1).font = Font(name=F, bold=b, size=14 if ws.max_row == 1 else 11)
ws.column_dimensions["A"].width = 110

# 單元總覽 with formulas
ws = wb.create_sheet("單元總覽")
rows = []
for i, u in enumerate(d["units"], start=2):
    rows.append([u["unit"], u["title"], f"=COUNTIF(漢字!$C:$C,A{i})", f"=COUNTIF(單字!$B:$B,A{i})",
                 f"=COUNTIF(文法!$B:$B,A{i})"])
table(ws, ["單元", "主題", "漢字數", "單字數", "文法數"], rows, [8, 22, 10, 10, 10])
n = len(rows) + 2
ws.cell(n, 2, "合計").font = Font(name=F, bold=True)
for col in "CDE":
    ws[f"{col}{n}"] = f"=SUM({col}2:{col}{n-1})"; ws[f"{col}{n}"].font = Font(name=F, bold=True)

ws = wb.create_sheet("漢字")
table(ws, ["ID", "漢字", "單元", "繁體", "新字體不同", "中文字義", "音讀", "訓讀", "筆畫", "頻率排名", "英文"],
      [[k["id"], k["kanji"], k["unit"], k["traditional"], "是" if k["shinjitai_differs"] else "",
        k["zh"], "、".join(k["on"]), "、".join(k["kun"]), k["strokes"], k["freq"], k["en"]] for k in d["kanji"]],
      [7, 6, 6, 6, 10, 16, 16, 22, 6, 9, 16])

ws = wb.create_sheet("單字")
table(ws, ["ID", "單元", "單字", "讀音", "中文", "英文", "所需 N5 漢字", "和製漢語提醒"],
      [[v["id"], v["unit"], v["expression"], v["reading"], v["zh"], v["en"], "".join(v["n5_kanji"]),
        v["false_friend"]] for v in d["vocab"]],
      [8, 6, 16, 18, 22, 32, 12, 30])

ws = wb.create_sheet("文法")
table(ws, ["ID", "單元", "句型", "說明", "例句", "中譯"],
      [[g["id"], g["unit"], g["pattern"], g["zh"], g["example_jp"], g["example_zh"]] for g in d["grammar"]],
      [6, 6, 26, 30, 40, 28])

ws = wb.create_sheet("和製漢語")
table(ws, ["單字", "讀音", "日文意思", "提醒"],
      [[v["expression"], v["reading"], v["zh"], v["false_friend"]] for v in d["vocab"] if v["false_friend"]],
      [12, 16, 22, 40])

wb.save(out)
print("saved", out)
