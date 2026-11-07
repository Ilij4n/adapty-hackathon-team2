"""Simulate the console: page in a sandboxed srcdoc iframe with the console CSP + boot script, parent answers asset requests.
Checks the deck's nested srcdoc video gets its narration audio."""
import asyncio, base64, json, os, re, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.expanduser("~/work/BagleyV3-FullProject/web-ui/src")
EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
boot = re.search(r"export const ARTIFACT_BOOT_JS = `(.*?)`\n", open(f"{WEB}/lib/artifactBoot.ts").read(), re.S).group(1)
boot = re.sub(r"\\\\(.)", r"\\1", boot)   # template-literal escapes
rs = open(f"{WEB}/components/ArtifactRender.tsx").read()
csp = "; ".join(re.findall(r'^\s+"([^"]+)",?$', rs[rs.index("const CSP = ["):rs.index("].join('; ')")], re.M))
page = open(os.path.join(HERE, "build/artifact/index.html"), encoding="utf-8").read()
head = f'<meta http-equiv="Content-Security-Policy" content="{csp}"><script>{boot}</script>'
page = page.replace("<head>", "<head>" + head, 1)
adir = os.path.join(HERE, "build/artifact/assets")
assets = {}
for root, _, fs in os.walk(adir):
    for f in fs:
        p = os.path.join(root, f); n = os.path.relpath(p, adir)
        mime = "audio/wav" if f.endswith(".wav") else "image/jpeg"
        assets[n] = (mime, base64.b64encode(open(p, "rb").read()).decode())
harness = """<!doctype html><body style="margin:0"><iframe id=f sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" allow="autoplay; fullscreen" style="width:100vw;height:100vh;border:0"></iframe>
<script>const A=%s;const f=document.getElementById('f');f.srcdoc=%s;
addEventListener('message',e=>{const d=e.data;if(!d||d.bagley!=='asset'||e.source!==f.contentWindow)return;const a=A[d.name];
if(!a){f.contentWindow.postMessage({bagley:'asset-result',name:d.name,error:'missing'},'*');return}
const b=Uint8Array.from(atob(a[1]),c=>c.charCodeAt(0));f.contentWindow.postMessage({bagley:'asset-result',name:d.name,blob:new Blob([b],{type:a[0]})},'*')});</script>""" % (json.dumps(assets), json.dumps(page).replace("</", "<\\/"))
hp = os.path.join(HERE, "build/harness.html"); open(hp, "w").write(harness)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--no-sandbox", "--autoplay-policy=document-user-activation-required", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1280, "height": 720})
        logs = []
        pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
        await pg.goto("file://" + hp)
        await pg.wait_for_timeout(2500)
        deck = pg.frames[1]
        res = []
        def check(c, m): res.append(bool(c)); print(("PASS " if c else "FAIL ") + m)
        check(await deck.evaluate("[...document.querySelectorAll('img.bg')].every(i=>i.src.startsWith('blob:'))"), "slide images resolved through the console asset loader")
        await pg.mouse.click(640, 360)   # focus the artifact like a reader would (advances to step/slide 2)
        await deck.evaluate("__deck.go(0,0)")
        for _ in range(60):
            if await deck.evaluate("document.body.classList.contains('vidready')"): break
            await pg.wait_for_timeout(500)
        check(await deck.evaluate("document.body.classList.contains('vidready')"), "video mounted inside the single page and ready behind slide 1")
        vf = [f for f in pg.frames if f.parent_frame == deck][0]
        await vf.evaluate("""(()=>{const o=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){window.__ctx=this.context;return o.apply(this,a)}})()""")
        for _ in range(40):
            s = await deck.evaluate("__deck.state()")
            if s["id"] == "video": break
            await pg.keyboard.press("ArrowRight"); await pg.wait_for_timeout(400)
        await pg.wait_for_timeout(5000)
        st = await vf.evaluate("[__vx.state(), window.__ctx&&__ctx.state, window.__ctx&&__ctx.currentTime]")
        v = st[0]
        check(v["playing"] and all(v["decoded"]) and not any(v["failed"]), f"advance key starts the video; all narration decoded (k={v['k']}, local={v['local']:.1f})")
        check(st[1] == "running" and (st[2] or 0) > 1, f"narration audio running in the console sandbox (ctx={st[1]}, t={st[2]})")
        await pg.keyboard.press("f"); await pg.wait_for_timeout(800)
        fs = await deck.evaluate("document.fullscreenElement===document.documentElement")
        check(fs, "F inside the video makes the whole deck fullscreen inside the console's frame")
        await pg.screenshot(path=os.path.join(HERE, "build/shots/artifact_video.png"))
        errs = [l for l in logs if l.startswith("error") and "violates" not in l]
        print("errors:", errs[:3])
        print("ALL PASS" if all(res) else "SOME FAILED")
        await b.close()
asyncio.run(main())
