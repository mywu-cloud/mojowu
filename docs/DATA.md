# 內容資料

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `content/n5.json` | 完整 N5 資料庫（事實來源） |
| `content/N5_content.xlsx` | 給人審閱的 Excel（說明、單元總覽、漢字、單字、文法、和製漢語） |
| `public/data/n5.json` | App 讀的精簡版（由 `scripts/build_app_data.py` 產生，勿手改） |
| `scripts/n5_zh.txt` | 718 筆單字的 `索引|繁中釋義|單元`，索引＝原始 CSV 的列序（0 起） |

## 數量

| 單元 | 主題 | 漢字 | 單字 | 文法 |
| --- | --- | --- | --- | --- |
| 1 | 打招呼與自我介紹 | 13 | 48 | 6 |
| 2 | 數字與時間 | 28 | 121 | 6 |
| 3 | 家人與人物 | 7 | 43 | 6 |
| 4 | 食物與餐廳 | 1 | 52 | 6 |
| 5 | 購物與物品 | 4 | 71 | 6 |
| 6 | 交通與地點 | 11 | 81 | 6 |
| 7 | 日常動作 | 4 | 91 | 6 |
| 8 | 學校與工作 | 4 | 55 | 6 |
| 9 | 天氣與自然 | 4 | 39 | 6 |
| 10 | 描述與感受 | 3 | 117 | 6 |
| 合計 | | 79 | 718 | 60 |

和製漢語提醒 27 筆。

## 完整格式 `content/n5.json`

```jsonc
{
  "meta": { "level": "N5", "version": "0.1", "generated": "2026-11-25", "sources": [...] },
  "units":   [{ "unit": 1, "title": "打招呼與自我介紹", "kanji": 13, "vocab": 48, "grammar": 6 }],
  "kanji":   [{ "id": "k003", "kanji": "国", "unit": 1, "traditional": "國", "shinjitai_differs": true,
                "zh": "國家", "on": ["コク"], "kun": ["くに"], "strokes": 8, "freq": 3, "en": "Country" }],
  "vocab":   [{ "id": "v0144", "unit": 1, "expression": "外国", "reading": "がいこく", "zh": "外國",
                "en": "foreign country; abroad", "kanji": ["外","国"], "n5_kanji": ["外","国"],
                "requires_kanji": ["k034","k003"], "false_friend": "" }],
  "grammar": [{ "id": "g01", "unit": 1, "pattern": "AはBです", "zh": "A是B（禮貌斷定）",
                "example_jp": "私は学生です。", "example_zh": "我是學生。" }]
}
```

- 音讀一律**片假名**，訓讀平假名；訓讀中的 `.` 分隔送假名、`-` 表示接頭／接尾（比對答案時會去掉）。
- `reading` 可能含 `;` 分隔的多個讀法，或括號註記如 `けっこん (する)`。

## 精簡格式 `public/data/n5.json`

```jsonc
{ "u": [[unit, title]],
  "k": [[id, kanji, unit, traditional, zh, on[], kun[]]],
  "v": [[id, unit, expression, reading, zh, requires_kanji[], false_friend]],
  "g": [[id, unit, pattern, zh, example_jp, example_zh]] }
```

## ID 規則

- 漢字 `k###`（依字頻排序後編號）、單字 `v####`（原始 CSV 列序＋1）、文法 `g##`。
- **ID 一經發布不可改號、不可重用**。N4 之後建議加級別前綴：`n4-k001`、`n4-v0001`、`n4-g01`。

## 單元分配規則（`scripts/build_data.py`）

1. 單字的單元由 `n5_zh.txt` 人工指定（主題）。
2. 漢字的單元＝**第一個用到它的單字所在單元**；沒被任何單字用到的漢字才用 `KANJI_PIN`。
3. 一～五強制放單元 1。
4. 單字單元＝max(人工單元, 所需漢字的單元)。因規則 2，實際上不會被延後。
5. 建置時會印出各單元數量；失衡時調整 `n5_zh.txt` 的單元欄。

## N4 之後的級數（`scripts/build_level.py`）

```bash
curl -L -o n4.csv https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n4.csv
python3 scripts/build_level.py n4 kanji.json n4.csv      # 產生 content/n4.json 與 public/data/n4.json
node scripts/validate_data.mjs                            # 驗證所有級數
```

每一級需要的手寫檔（`scripts/`）：

| 檔案 | 格式 | 說明 |
| --- | --- | --- |
| `{level}_zh.txt` | `索引|繁中釋義|單元` | 索引＝原始 CSV 列序（0 起）；N4 單元依主題人工指定；N3 起省略單元欄（`索引|繁中釋義`），由 `AUTO_UNITS` 依漢字頻率自動分，標題列出代表漢字 |
| `{level}_kanji_zh.txt` | `漢字|繁中字義` | 該級每個漢字都要有 |
| `{level}_grammar.txt` | `句型|說明|日文例句|中文翻譯` | 依序每 `GRAMMAR_PER_UNIT` 條一個單元（N4 8 條、N3 6 條） |
| `{level}_false_friends.txt` | `表記|說明` | 選填，和製漢語提醒 |
| `shinjitai_trad.json` | `{新字體: 繁體}` | 全部 JLPT 漢字共用，由 OpenCC 產生 |

- 單元標題在 `build_level.py` 的 `UNIT_TITLES`。
- ID：`{level}-k001`、`{level}-v0001`、`{level}-g01`（N1 漢字 4 位數）。**永不改號**；新增只能往後編。
- 漢字單元＝第一個用到它的單字所在單元；沒被用到的漢字平均分到各單元。
- 單字的 `requires_kanji` 包含本級與較低級的漢字 ID（高於本級的漢字不列入，直接顯示）。
- 原始資料的讀音問題（`うんどうする` 帶「する」、欄位對調、空白）由 `clean_reading()` 修正（表記全為漢字才去掉「する」，`刷る|する` 不受影響）。
- 漢字卡片上的讀音最多各顯示 4 個（`MAX_READINGS`），其餘註明「另有 N 個少用讀音」；答題時所有讀音都算對。
- App 的級數清單在 `app/src/content/levels.ts` 的 `AVAILABLE`，新增一級時要加上。

## 原始資料下載

```bash
curl -L -o kanji.json https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json
curl -L -o n5.csv     https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv
```

N4–N1 單字同 repo 的 `src/n4.csv` … `src/n1.csv`；漢字用 `jlpt_new` 欄位篩選。

## 擴充到 N4–N1 的步驟

1. 下載對應 CSV，產生 `scripts/n4_zh.txt`（繁中釋義＋單元）。
2. `build_data.py` 參數化級別，輸出 `content/n4.json`；已在前級出現的漢字不重複出題。
3. 寫該級文法點（N4 約 +100、N3–N1 約 700+）。
4. 產生 `public/data/n4.json`，App 依解鎖階段載入。
5. 日語教師校對後才發布。

## 授權

見 `ATTRIBUTION.md`。重點：Tanos 清單 CC BY 需在 App 內標示；不可用 WaniKani 的部件名與口訣；不可收錄 JLPT 官方考題。
