"""Screenshot every slide with all steps shown -> build/shots/all_N.png + /tmp/deck_all.png sheet."""
import asyncio, os
from playwright.async_api import async_playwright
from PIL import Image
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        await pg.goto("file://" + os.path.join(HERE, "present/deck.html"))
        await pg.wait_for_function("document.body.classList.contains('vidready')", timeout=60000)
        n = await pg.evaluate("document.querySelectorAll('#stage .slide').length")
        out = []
        for i in range(n):
            await pg.evaluate(f"__deck.go({i}, +document.querySelectorAll('#stage .slide')[{i}].dataset.steps)")
            await pg.wait_for_timeout(1500)
            f = os.path.join(HERE, f"build/shots/all_{i + 1}.png"); await pg.screenshot(path=f); out.append(f)
        await b.close()
    W, H = 640, 360; sh = Image.new("RGB", (W * 3, H * ((len(out) + 2) // 3)))
    for k, f in enumerate(out):
        sh.paste(Image.open(f).convert("RGB").resize((W, H)), ((k % 3) * W, (k // 3) * H))
    sh.save("/tmp/deck_all.png")
asyncio.run(main())
