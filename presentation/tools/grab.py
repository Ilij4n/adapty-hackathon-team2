"""Grab frames from the video page: grab.py VIDEO.html OUTDIR SPEC...  (captions off)
SPEC is SCENE:OFFSET (1-based scene, seconds into it; negative = from its end) -> fSCENE_OFFSET.png,
so the frames follow the scenes when the video is re-cut."""
import asyncio, base64, sys, os
from playwright.async_api import async_playwright
EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
async def main(src, outdir, ts):
    os.makedirs(outdir, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        await pg.goto("file://" + os.path.abspath(src))
        await pg.wait_for_function("window.__vx && window.__vx.frameAt", timeout=60000)
        await pg.wait_for_timeout(1500)
        starts = await pg.evaluate("__vx.starts")
        durs = await pg.evaluate("__vx.durs")
        for spec in ts:
            k, off = spec.split(":")
            k, off = int(k) - 1, float(off)
            t = starts[k] + (off if off >= 0 else durs[k] + off)
            r = await pg.evaluate(f"(async()=>{{const r=await window.__vx.frameAt({t},{{png:true,cap:false,steps:3}});return typeof r==='string'?r:(r&&r.png)||null}})()")
            name = os.path.join(outdir, f"f{spec.replace(':', '_')}.png")
            if r and r.startswith("data:"):
                open(name, "wb").write(base64.b64decode(r.split(",", 1)[1]))
            else:
                await pg.screenshot(path=name)
            print(name, "png" if r else "screenshot")
        await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3:]))
