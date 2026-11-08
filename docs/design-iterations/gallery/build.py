"""Build the design-iterations gallery: shots/<vN>/*.png -> gallery/img/<vN>/*.webp + gallery/index.html.

    uv run --with pillow python build.py <shots_dir> <data.json>
"""
import html
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
shots, data = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text())
IMG = HERE / "img"

# (file stem, caption, kind) in the order they appear in each iteration's section
DESK = [
    ("console-ava-1440-light", "Console, Ava's grant waiting for an OK", "wide"),
    ("console-ava-1440-dark", "Same, dark", "wide"),
    ("console-dylan-1440-light", "An injection attempt, escalated to a person", "wide"),
    ("console-nikola-1440-dark", "A Serbian Cyrillic case, dark", "wide"),
    ("console-approved-1440-light", "After one click on approve", "wide"),
    ("console-dylan-details-1440-light", "The technical record, open (full page)", "wide"),
    ("help-reply-marko-1440-light", "Help on a laptop: Marko writes in Serbian", "wide"),
    ("help-reply-marko-1440-dark", "Same, dark", "wide"),
]
PHONE = [
    ("console-list-390-light", "Console on a phone"),
    ("console-ava-390-dark", "A case, dark"),
    ("help-reply-ava-390-light", "Help: Ava asks for premium"),
    ("help-reply-ava-390-dark", "Same, dark"),
    ("help-ava-granted-390-light", "After the team approves"),
]


def convert(v: str, stem: str, max_h: int | None = None) -> tuple[str, int, int] | None:
    src = shots / v / f"{stem}.png"
    if not src.exists():
        return None
    out = IMG / v / f"{stem}.webp"
    out.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    if max_h and im.height > max_h:
        im = im.crop((0, 0, im.width, max_h))
    im.save(out, "WEBP", quality=82, method=6)
    return f"img/{v}/{stem}.webp", im.width, im.height


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def figure(src, w, h, cap, cls):
    return (f'<figure class="{cls}"><button class="zoom" type="button" data-src="{src}" data-cap="{esc(cap)}" '
            f'aria-label="Enlarge: {esc(cap)}"><img src="{src}" width="{w}" height="{h}" alt="{esc(cap)}" '
            f'loading="lazy" decoding="async"></button><figcaption>{esc(cap)}</figcaption></figure>')


sections = []
for it in data["iterations"]:
    v = it["v"]
    desk, phone = [], []
    for stem, cap, _ in DESK:
        r = convert(v, stem, max_h=2600 if "details" in stem else None)
        if r:
            desk.append(figure(*r, cap, "shot wide"))
    for stem, cap in PHONE:
        r = convert(v, stem)
        if r:
            phone.append(figure(*r, cap, "shot phone"))
    swatches = "".join(
        f'<li><span class="sw" style="background:{esc(c)}"></span><span class="sw-name">{esc(n)}</span>'
        f'<code>{esc(c)}</code></li>' for n, c in it.get("palette", []))
    paras = "".join(f"<p>{esc(p)}</p>" for p in it["why"])
    q = "" if v == "v0" else f"?v={v[1:]}"
    facts = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(val)}</dd></div>" for k, val in it["facts"])
    pick = f'<p class="pick">{esc(it["mark"])}</p>' if it.get("mark") else ""
    sections.append(f'''
<section class="it" id="{v}" aria-labelledby="{v}-h">
  <header class="it-head">
    <p class="it-url"><code>/console{q}</code> <code>/help{q}</code></p>
    <h2 id="{v}-h">{esc(it["name"])}</h2>
    {pick}
    <p class="lede">{esc(it["lede"])}</p>
  </header>
  <div class="it-body">
    <div class="it-text">{paras}<dl class="facts">{facts}</dl>{f'<ul class="palette" aria-label="Core colours">{swatches}</ul>' if swatches else ""}</div>
    <div class="it-shots">
      <div class="desk">{"".join(desk[:2])}</div>
      <div class="phones">{"".join(phone)}</div>
      <details class="more-shots"><summary>{len(desk) - 2} more screens: escalation, Cyrillic, approval, technical record, help on a laptop</summary><div class="desk">{"".join(desk[2:])}</div></details>
    </div>
  </div>
</section>''')

nav = "".join(f'<li><a href="#{it["v"]}"><span class="nv">{esc(it["short"])}</span> {esc(it["name"])}</a></li>'
              for it in data["iterations"])
page = (HERE / "template.html").read_text()
page = page.replace("{{NAV}}", nav).replace("{{SECTIONS}}", "\n".join(sections))
for k, val in data["text"].items():
    page = page.replace("{{" + k + "}}", val)
# a standalone page (the template is written as an artifact body: title, styles, then content)
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        + page.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1) + "\n</body>\n</html>\n")
(HERE / "index.html").write_text(page)
print("wrote", HERE / "index.html", sum(f.stat().st_size for f in IMG.rglob("*.webp")) // 1024, "KB of images")
