"""B3 遷移端對端測試（只測 app/dist）：MVP 的 localStorage 進度 → IndexedDB。

Usage: python3 tests/migrate_e2e.py http://localhost:8770/index.html
1. 先以 MVP 格式寫入 localStorage mojowu-v1，再開 app → 畫面與 IndexedDB 都要有這份進度
2. 清掉 localStorage 後重開 → 進度仍在（確定是從 IndexedDB 讀）
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

URL = sys.argv[1]
MVP = {"cards": {"k002": {"s": 3.7145, "d": 5.1618, "due": 0, "reps": 1, "last": 0, "ok": True},
                 "k003": {"s": 3.7145, "d": 5.1618, "due": 9e15, "reps": 1, "last": 0, "ok": True}},
       "target": 0.95, "streak": 3, "lastDay": "2026-11-20", "log": {"2026-11-20": 7}, "kana": 1}
IDB = """() => new Promise((ok, ng) => { const r = indexedDB.open('mojowu'); r.onerror = () => ng(r.error);
  r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('cards')) { db.close(); return ok(null); }
    const tx = db.transaction(['cards','meta']); const out = {cards:{}, meta:{}};
    tx.objectStore('cards').openCursor().onsuccess = e => { const c = e.target.result; if (c) { out.cards[c.key] = c.value; c.continue(); } };
    tx.objectStore('meta').openCursor().onsuccess = e => { const c = e.target.result; if (c) { out.meta[c.key] = c.value; c.continue(); } };
    tx.oncomplete = () => { db.close(); ok(out); }; }; })"""

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}), args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 390, "height": 844})
        await pg.route("**/fonts.{googleapis,gstatic}.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL + "#me"); await pg.wait_for_timeout(300)
        await pg.evaluate("s => { localStorage.clear(); localStorage.setItem('mojowu-v1', s); }", json.dumps(MVP))
        await pg.evaluate("() => new Promise(ok => { const r = indexedDB.deleteDatabase('mojowu'); r.onsuccess = r.onerror = r.onblocked = () => ok(); })")
        await pg.reload(); await pg.wait_for_timeout(600)
        txt = await pg.inner_text("#main")
        if "2\n已學項目" not in txt and "2已學項目" not in txt.replace("\n", ""): errs.append("migrated cards not shown: " + txt[:80])
        if "IndexedDB" not in txt: errs.append("storage backend not IndexedDB")
        db = await pg.evaluate(IDB)
        if not db or set(db["cards"]) != {"k002", "k003"}: errs.append(f"IndexedDB cards wrong: {db and list(db['cards'])}")
        elif db["meta"].get("migratedFrom") != "localStorage:mojowu-v1" or db["meta"].get("target") != 0.95: errs.append(f"meta wrong: {db['meta']}")
        # 鏡像清掉，重開仍要有進度
        await pg.evaluate("() => localStorage.clear()")
        await pg.goto(URL + "#review"); await pg.reload(); await pg.wait_for_timeout(600)
        txt = await pg.inner_text("#main")
        if not txt.startswith("複習\n1") and "1\n張現在到期" not in txt: errs.append("after reload without localStorage, due count wrong: " + txt[:60])
        if "95%" not in txt: errs.append("target not restored from IndexedDB")
        mirror = await pg.evaluate("() => localStorage.getItem('mojowu-v1')")
        if not mirror or json.loads(mirror)["cards"].keys() != MVP["cards"].keys(): errs.append("localStorage mirror not rebuilt")
        await b.close()
    print("errors:", errs)
    if errs: sys.exit(1)

asyncio.run(main())
