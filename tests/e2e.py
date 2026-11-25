"""End-to-end smoke test for public/index.html.

Usage: python3 tests/e2e.py http://localhost:8765/index.html /tmp/shot
Runs a lesson, a review, a kana drill and the practice test; prints JS errors (expect errors: []).
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

URL = sys.argv[1]
SHOT = sys.argv[2]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}), args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 390, "height": 844})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.screenshot(path=SHOT + "_home.png")
        # lesson 1
        await pg.click("[data-act=lesson]")
        for _ in range(5):
            await pg.click("[data-act=lnext]")
        await pg.screenshot(path=SHOT + "_quiz.png")
        n = 0
        while await pg.locator("#ans, [data-pick]").count() and n < 30:
            n += 1
            if await pg.locator("[data-pick]").count():
                # grammar: click the right option
                idx = await pg.evaluate("""() => { const t=document.querySelector('.card p').textContent; return [...document.querySelectorAll('[data-pick]')].findIndex(b=>b.textContent.length>0 && window.__right===undefined ? false : false); }""")
                await pg.locator("[data-pick]").first.click()
            else:
                # type the romaji of a wrong answer first time to exercise requeue, otherwise empty→ skip
                await pg.fill("#ans", "xxx" if n == 1 else "")
                if n == 1:
                    await pg.click("[data-act=check]")
                else:
                    # reveal answer by submitting wrong then read correct? instead pull from feedback after wrong
                    await pg.fill("#ans", "zzz"); await pg.click("[data-act=check]")
            await pg.wait_for_timeout(50)
            if n == 2: await pg.screenshot(path=SHOT + "_fb.png")
            await pg.click("[data-act=next]")
            if n > 12: break
        await pg.click("[data-act=quit]")
        # state check
        st = await pg.evaluate("() => JSON.parse(localStorage.getItem('mojowu-v1'))")
        print("cards after lesson:", len(st["cards"]), "streak", st["streak"])
        # romaji converter + answer check via reload-free eval of a sample
        await pg.goto(URL + "#path"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOT + "_path.png")
        await pg.evaluate("() => { const s=JSON.parse(localStorage.getItem('mojowu-v1')); for (const c of Object.values(s.cards)) c.due=0; localStorage.setItem('mojowu-v1', JSON.stringify(s)); }")
        await pg.goto(URL + "#review"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click("[data-act=review]")
        await pg.screenshot(path=SHOT + "_review.png")
        await pg.click("[data-act=quit]")
        # kana
        await pg.goto(URL + "#kana"); await pg.wait_for_timeout(300)
        await pg.click("[data-act=kana]")
        for i in range(10):
            await pg.fill("#ans", "ka"); await pg.press("#ans", "Enter"); await pg.wait_for_timeout(30)
            await pg.click("[data-act=next]")
        await pg.screenshot(path=SHOT + "_kana.png")
        # test
        await pg.goto(URL + "#jlpt"); await pg.wait_for_timeout(300)
        await pg.click("[data-act=test]")
        for i in range(15):
            await pg.locator("[data-tpick]").first.click(); await pg.click("[data-act=tnext]")
        await pg.screenshot(path=SHOT + "_test.png", full_page=True)
        await pg.goto(URL + "#me"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOT + "_me.png")
        await pg.emulate_media(color_scheme="dark"); await pg.goto(URL + "#home"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOT + "_dark.png")
        print("errors:", errs)
        await b.close()

asyncio.run(main())
