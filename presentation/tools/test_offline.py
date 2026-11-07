"""Offline end-to-end test of present/deck.html (Playwright, offline=True, real key presses)."""
import asyncio, os, sys
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
SHOTS = os.path.join(HERE, "build", "shots")
ok_all = True


def check(cond, msg):
    global ok_all
    ok_all &= bool(cond)
    print(("PASS " if cond else "FAIL ") + msg)


async def main():
    os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, headless=True,
                                    args=["--no-sandbox", "--autoplay-policy=document-user-activation-required", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        ctx = await b.new_context(viewport={"width": int(os.environ.get("VW", 1600)), "height": int(os.environ.get("VH", 900))}, offline=True)
        pg = await ctx.new_page()
        errs, net = [], []
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("request", lambda r: (not r.url.startswith(("file:", "data:", "blob:", "about:"))) and net.append(r.url))
        await pg.goto("file://" + os.path.join(HERE, "present", "deck.html"))
        await pg.wait_for_timeout(1200)
        st = lambda: pg.evaluate("__deck.state()")
        n = await pg.evaluate("document.querySelectorAll('#stage .slide').length")
        vid_i = await pg.evaluate("[...document.querySelectorAll('#stage .slide')].findIndex(s=>s.classList.contains('video'))")
        fsel = "document.fullscreenElement===document.documentElement"
        await pg.keyboard.press("f"); await pg.wait_for_timeout(600)
        check(await pg.evaluate(fsel), "F on a slide makes the whole deck fullscreen (fullscreenElement === documentElement)")
        sz = await pg.evaluate("[innerWidth,innerHeight,document.getElementById('stage').getBoundingClientRect().width]")
        check(sz[2] > 0 and abs(sz[2] - min(sz[0], sz[1] * 16 / 9)) < 3, f"stage re-fits the fullscreen viewport ({sz})")
        await pg.keyboard.press("f"); await pg.wait_for_timeout(600)
        check(not await pg.evaluate("!!document.fullscreenElement"), "F again exits fullscreen")
        await pg.mouse.move(800, 400); await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.getElementById('fsb').classList.contains('vis')"), "corner fullscreen button appears on mouse move")
        await pg.click("#fsb"); await pg.wait_for_timeout(600)
        check(await pg.evaluate(fsel), "corner button makes the deck fullscreen")
        await pg.evaluate("document.fullscreenElement&&document.exitFullscreen()"); await pg.wait_for_timeout(500)
        check((await st())["cur"] == 0 and not await pg.evaluate("!!document.fullscreenElement"), "after exit the deck still on slide 1 and keys work")
        # the video is mounted at once, paused on frame 0 behind the opening slides
        for _ in range(60):
            if await pg.evaluate("document.body.classList.contains('vidready')"): break
            await pg.wait_for_timeout(500)
        fr = next((f for f in pg.frames if f.url.endswith("video.html")), None)
        check(fr is not None and await pg.evaluate("document.body.classList.contains('vidready')"), "video mounted at open and ready behind slide 1")
        await fr.evaluate("""(()=>{window.__starts=[];const o=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){__starts.push(this.context.state);window.__ctx=this.context;return o.apply(this,a)}})()""")
        ov = await fr.evaluate("[getComputedStyle(document.getElementById('big')).display, getComputedStyle(document.getElementById('bar')).visibility, getComputedStyle(document.getElementById('chap')).visibility, __vx.state().local, __vx.state().k]")
        check(ov[0] == "none" and ov[1] == "hidden" and ov[2] == "hidden" and ov[3] == 0 and ov[4] == 0, f"behind the slides: no poster overlay, no controls/title, paused at 0:00 ({ov})")
        from PIL import Image, ImageChops, ImageStat
        import io
        box = await pg.evaluate("(()=>{const r=document.getElementById('stage').getBoundingClientRect();return [r.left+r.width*.7,r.top+r.height*.05,r.left+r.width*.97,r.top+r.height*.95]})()")
        live = Image.open(io.BytesIO(await pg.screenshot())).convert("RGB").crop(tuple(int(v) for v in box))
        await pg.evaluate("document.body.classList.remove('vidready')"); await pg.wait_for_timeout(300)
        post = Image.open(io.BytesIO(await pg.screenshot())).convert("RGB").crop(tuple(int(v) for v in box))
        await pg.evaluate("document.body.classList.add('vidready')")
        diff = sum(ImageStat.Stat(ImageChops.difference(live, post)).mean) / 3
        live.save(os.path.join(SHOTS, "seam_live.png")); post.save(os.path.join(SHOTS, "seam_poster.png"))
        check(diff < 12, f"live paused video matches the grabbed first frame (mean pixel diff {diff:.1f}/255)")
        # walk slides 1..video-1 with → (every step), screenshot the final state of each step
        while True:
            s = await st()
            if s["cur"] == vid_i:
                break
            await pg.screenshot(path=os.path.join(SHOTS, f"s{s['cur'] + 1}_{s['step']}.png"))
            fonts = await pg.evaluate("document.fonts.check('700 40px \"Bricolage Grotesque\"')")
            imgok = await pg.evaluate("(()=>{const i=document.querySelector('.slide.on img.bg');return !i||(i.complete&&i.naturalWidth>0)})()")
            if s["step"] == 0:
                check(imgok and fonts, f"slide {s['cur'] + 1} renders (bg image loaded, fonts loaded offline)")
            await pg.keyboard.press("ArrowRight")
            await pg.wait_for_timeout(650)
        await pg.wait_for_timeout(300)
        s = await st()
        check(s["active"] == "vid" and not s["deckKeys"], f"on video slide the iframe has focus ({s})")
        await pg.screenshot(path=os.path.join(SHOTS, f"s{vid_i + 1}_0_start.png"))
        await pg.wait_for_timeout(4000)
        a0 = (await fr.evaluate("__vx.state()"))["local"]
        await pg.wait_for_timeout(2000)
        v = await fr.evaluate("__vx.state()")
        check(v["playing"] and v["local"] > 0.5, f"the advance key itself starts the video (local={v['local']:.1f}s, clock={v['clock']})")
        check(not any(v["failed"]) and all(v["decoded"]), f"narration audio decoded, none failed (decoded={v['decoded']}, failed={v['failed']})")
        sts = await fr.evaluate("[window.__starts, window.__ctx&&__ctx.state, window.__ctx&&__ctx.currentTime]")
        check(sts[0] and sts[1] == "running" and sts[2] > 1, f"narration plays: AudioContext running, its clock moving (start states={sts[0]}, now={sts[1]}, t={sts[2]})")
        await pg.screenshot(path=os.path.join(SHOTS, f"s{vid_i + 1}_1_playing.png"))
        t1 = (await fr.evaluate("__vx.state()"))
        await pg.keyboard.press("ArrowRight")
        await pg.wait_for_timeout(500)
        t2 = await fr.evaluate("__vx.state()")
        s = await st()
        g = await fr.evaluate("__vx.starts")
        dt = (g[t2["k"]] + t2["local"]) - (g[t1["k"]] + t1["local"])
        check(s["cur"] == vid_i and dt > 3, f"→ while video focused seeks the video (+{dt:.1f}s), deck stays")
        await pg.keyboard.press("n")
        await pg.wait_for_timeout(600)
        t3 = await fr.evaluate("__vx.state()")
        s = await st()
        check(s["cur"] == vid_i and t3["k"] == t2["k"] + 1, f"N while video focused = next video scene (scene {t2['k']}→{t3['k']}), deck notes not toggled")
        notes_open = await pg.evaluate("document.body.classList.contains('shownotes')")
        check(not notes_open, "deck notes not opened by the N press inside the video")
        await pg.keyboard.press("PageDown")
        await pg.wait_for_timeout(500)
        t4 = await fr.evaluate("__vx.state()")
        check(t4["k"] == t3["k"] and not t4["playing"], f"clicker PageDown inside video = pause, no scene skip (k={t4['k']}, playing={t4['playing']})")
        await pg.keyboard.press("PageDown")
        await pg.wait_for_timeout(500)
        check((await fr.evaluate("__vx.state()"))["playing"], "second PageDown resumes")
        await pg.keyboard.press("f"); await pg.wait_for_timeout(700)
        s = await st()
        check(await pg.evaluate(fsel) and s["cur"] == vid_i, f"F inside the video makes the DECK fullscreen ({await pg.evaluate('document.fullscreenElement&&document.fullscreenElement.tagName')})")
        vw = await pg.evaluate("[document.getElementById('vid').getBoundingClientRect().width, innerWidth]")
        check(vw[0] == vw[1], f"video iframe fills the fullscreen width ({vw})")
        await pg.screenshot(path=os.path.join(SHOTS, "video_fullscreen.png"))
        await fr.evaluate("document.getElementById('bfs').click()"); await pg.wait_for_timeout(700)
        check(not await pg.evaluate("!!document.fullscreenElement") and not await fr.evaluate("!!document.fullscreenElement"),
              "the player's own fullscreen button is routed to the deck (toggled deck fullscreen off; the iframe never went fullscreen itself)")
        await pg.keyboard.press("f"); await pg.wait_for_timeout(700)
        check(await pg.evaluate(fsel), "F inside the video again: deck fullscreen")
        await pg.evaluate("document.fullscreenElement&&document.exitFullscreen()"); await pg.wait_for_timeout(1500)   # (a real Esc here would just leave fullscreen, as browsers do)
        check(not await pg.evaluate("!!document.fullscreenElement") and (await st())["cur"] == vid_i, "after leaving fullscreen the deck is still on the video slide")
        await pg.evaluate("document.fullscreenElement&&document.exitFullscreen()"); await pg.wait_for_timeout(500)
        print("DBG before Esc", await pg.evaluate("[!!document.fullscreenElement, document.activeElement&&document.activeElement.id, document.hasFocus()]"), await fr.evaluate("[document.hasFocus(), !!document.fullscreenElement]"))
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(600)
        s = await st()
        v = await fr.evaluate("__vx.state()")
        check(s["deckKeys"] and not v["playing"], f"Esc returns keys to the deck and pauses ({s['active']}, playing={v['playing']})")
        await pg.screenshot(path=os.path.join(SHOTS, f"s{vid_i + 1}_2_esc.png"))
        await pg.keyboard.press("ArrowRight")
        await pg.wait_for_timeout(700)
        s = await st()
        check(s["cur"] == vid_i + 1, f"then → goes to the next slide (cur={s['cur'] + 1})")
        # back into the video, play to the end: deck takes keys back by itself
        await pg.keyboard.press("ArrowLeft")
        await pg.wait_for_timeout(800)
        s = await st()
        check(s["cur"] == vid_i and s["active"] == "vid", f"← from close returns to the video slide, video focused ({s})")
        await pg.wait_for_timeout(500)
        check((await fr.evaluate("__vx.state()"))["playing"], "re-entering the video slide resumes playing")
        await fr.evaluate("__vx.seek(__vx.total-2.5)")
        for _ in range(30):
            await pg.wait_for_timeout(500)
            s = await st()
            if s["vidState"] == "ended":
                break
        s = await st()
        check(s["deckKeys"] and s["vidState"] == "ended", f"video end hands keys back to the deck ({s})")
        await pg.keyboard.press("ArrowRight")
        await pg.wait_for_timeout(700)
        s = await st()
        check(s["cur"] == vid_i + 1, "→ after the end goes to the closing slide")
        for k in range(await pg.evaluate("+document.querySelector('.slide.on').dataset.steps") + 1):
            await pg.wait_for_timeout(700)
            await pg.screenshot(path=os.path.join(SHOTS, f"s{vid_i + 2}_{k}.png"))
            await pg.keyboard.press("ArrowRight")
            await pg.wait_for_timeout(600)
        await pg.keyboard.press("n")
        await pg.wait_for_timeout(700)
        vis = await pg.evaluate("getComputedStyle(document.getElementById('notes')).display!=='none'&&document.getElementById('ntx').textContent.length>50")
        check(vis, "N shows the speaker notes + timer")
        await pg.screenshot(path=os.path.join(SHOTS, "notes.png"))
        await pg.keyboard.press("Home")
        await pg.wait_for_timeout(500)
        check((await st())["cur"] == 0, "Home goes back to slide 1")
        check(not net, f"no network requests ({net[:3]})")
        verrs = [e for e in errs if "video.html" in e]
        derrs = [e for e in errs if "video.html" not in e]
        check(not derrs, f"no deck console errors ({derrs[:3]})")
        if verrs:
            print(f"WARN the video itself logs {len(verrs)} error(s): {verrs[0].splitlines()[0]}  (video source, not the deck)")
        await b.close()
    print("ALL PASS" if ok_all else "SOME FAILED")
    sys.exit(0 if ok_all else 1)

asyncio.run(main())
