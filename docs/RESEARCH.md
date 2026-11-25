# 研究摘要（2026-11）

完整版含引用：開發規劃文件 https://claude.ai/artifact/WARf2hfP39BWQtSSLBr1MM

## 競品

主流 App 各自只做好一件事，沒有一款能單獨從零帶到 N1，也沒有一款為繁中母語者設計。

| App | 定位 | 涵蓋 | 架構重點 | 弱點 |
| --- | --- | --- | --- | --- |
| [Duolingo](https://www.duolingodata.com/dat/jafen221.html) | 遊戲化習慣 | CEFR A1–B1，實際約 N5–初 N4 | 區段→單元→關卡→課，線性；連續天數、聯賽、愛心 | 文法不解釋、漢字少 |
| [LingoDeer](https://play.google.com/store/apps/details?id=com.lingodeer) | 文法優先課程 | A1–B1 | 等級→主題→課；Learning Tips；知識卡 | 中級以後變薄 |
| [WaniKani](https://knowledge.wanikani.com/WaniKani/srs-stages/) | 漢字＋語彙 SRS | 60 級、約 2,000 漢字、6,000 單字 | 部件→漢字→單字，Guru 才解鎖；9 階 SRS | 無文法；強制從 1 級開始 |
| [Bunpro](https://community.bunpro.jp/t/bunpro-faq-frequently-asked-questions) | 文法 SRS | N5–N1，900+ 文法點 | 每級 10 課；例句填空**手動輸入** | 不是完整入門課 |
| [renshuu](https://apps.apple.com/app/id1542730063) | 全方位可自訂 | N5–N1、漢檢 | 教科書/JLPT 路徑；弱項自動排前；吉祥物、金幣 | 上手難 |
| [Anki](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm) | 通用字卡 | 依牌組 | SM-2，23.10 起可選 FSRS（可設目標記憶率） | 無內建課程 |
| MOJi 辭書 / MOJiTest | 中文圈辭典＋題庫 | N5–N1 | 歷年考題、錯題本、自習室、打卡 | 缺學習路徑 |

**採用**：WaniKani 的解鎖鏈、Bunpro 的輸入式作答、Anki 的 FSRS、Duolingo 的留存機制（但不用懲罰式愛心）、MOJi 的錯題本概念。

留存參考：Duolingo 既有用戶次日留存約 84%（2026 Q2 股東信）；一次「連續天數復活」活動拉回 1,500 萬人。

## JLPT 規格

- 各級滿分 180。N1–N3 三分項（語言知識、讀解、聽解）各 0–60，每項最低 19 分；N4–N5 兩分項（語言知識・讀解 0–120 需 38、聽解 0–60 需 19）。[官網](https://jlpt.jp/e/topics/201101311296451824.html)
- 總分合格線：N1 100、N2 90、N3 95、N4 90、N5 80。

| 等級 | 漢字（約，累計） | 語彙（約，累計） | 學習時數：有漢字背景 | 無漢字背景 | CEFR |
| --- | --- | --- | --- | --- | --- |
| N5 | 100 | 800 | 250–450 | 325–600 | A1–A2 |
| N4 | 300 | 1,500 | 400–700 | 575–1,000 | A2 |
| N3 | 650 | 3,750 | 700–1,100 | 950–1,700 | B1 |
| N2 | 1,000 | 6,000 | 1,150–1,800 | 1,600–2,800 | B1–B2 |
| N1 | 2,000 | 約 10,000（估計） | 1,700–2,600 | 3,000–4,800 | B2–C1 |

JLPT 自 2010 年起不公布官方字表；字數為業界依歷屆考題估計（Tanos、Sakuraflow、Japonin）。時數來源：[JLPT Guide](https://en.wikibooks.org/wiki/JLPT_Guide/About_JLPT)。
