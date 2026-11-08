#!/usr/bin/env python3
"""Build the Case Desk deck.

    build.py offline   -> present/ (deck.html + video.html + img/ + fonts.css), casedesk-present.zip
    build.py artifact  -> build/artifact/index.html + build/artifact/assets/ (bg/*.jpg, audio/...)

Inputs: build/frames/fNNN.png (tools/grab.py), build/video/*.standalone.html (vx standalone),
build/vxpage/*.html + assets/ (vx build, asset: audio). make.sh produces all of them.
"""
import base64, gzip, html, json, os, re, shutil, sys, zipfile
from PIL import Image, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from slides import SLIDES

B = os.path.join(HERE, "build")
FONTS_CACHE = os.path.expanduser("~/work/projects/video-explainer/.cache/fonts.css")
GFONTS = ("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700"
          "&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap")

# background image per slide: "scene:seconds-into-it" (negative = from the scene's end), blur radius, brightness
BGS = {"f0": ("1:0", 0, 1.0),     # the video's first frame, sharp: placeholder under the live video on the opening slides
       "s3": ("3:7", 16, .6), "s5": ("5:-4", 16, .6), "s8": ("8:-1", 14, .6),
       # primer thumbnails (slide "What you'll see"): crop (x0,y0,x1,y1 as fractions), light blur so they hint, not spoil
       "p_help": ("3:3", 3, .95, (0.215, 0.07, 0.44, 0.80)), "p_console": ("5:-8", 3, .95, (0.04, 0.06, 0.96, 0.78))}

ICONS = {
    "msg": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "db": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
}


def icon(n):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>')


def make_bgs(dest):
    os.makedirs(dest, exist_ok=True)
    for f in os.listdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static_img')):  # real UI shots + the architecture drawing, crisp
        im = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static_img', f)).convert('RGB')
        im.thumbnail((2000, 2000), Image.LANCZOS)
        im.save(os.path.join(dest, os.path.splitext(f)[0] + '.jpg'), quality=90, optimize=True)
    for name, (t, blur, light, *crop) in BGS.items():
        im = Image.open(os.path.join(B, "frames", f"f{t.replace(':', '_')}.png")).convert("RGB")
        if crop:
            x0, y0, x1, y1 = crop[0]
            im = im.crop((int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)))
            im.thumbnail((900, 900), Image.LANCZOS)
            im = ImageEnhance.Brightness(im.filter(ImageFilter.GaussianBlur(blur))).enhance(light)
            im.save(os.path.join(dest, f"{name}.jpg"), quality=82, optimize=True)
            continue
        im = im.resize((1920, 1080), Image.LANCZOS)
        if blur:
            im = im.filter(ImageFilter.GaussianBlur(blur))
            im = ImageEnhance.Brightness(im).enhance(light)
            im = im.resize((1600, 900), Image.LANCZOS)
        im.save(os.path.join(dest, f"{name}.jpg"), quality=88 if not blur else 78, optimize=True, progressive=True)


def words(t):
    return len(re.sub(r"\[[^\]]*\]", "", t).split())


def deck_html(img_prefix, fonts_tag, video_tag, extra_head=""):
    secs = []
    for i, s in enumerate(SLIDES):
        body = re.sub(r"\{\{i:(\w+)\}\}", lambda m: icon(m.group(1)), s["html"]).replace("{{img}}", img_prefix)
        steps = max([int(x) for x in re.findall(r'data-step="(\d+)"', body)] or [0])
        bgk = s.get("bg")
        if bgk == "live":   # the paused video shows through; its first frame sits here until the video is ready
            bg = f'<img class="bg poster" alt="" src="{img_prefix}f0.jpg"><div class="vign soft"></div>'
        elif bgk:
            bg = f'<img class="bg" alt="" src="{img_prefix}{bgk}.jpg"><div class="vign"></div>'
        else:
            bg = ""
        cls = "slide video" if s.get("video") else ("slide live" if bgk == "live" else "slide")
        inner = "" if s.get("video") else f'{bg}<div class="content c-{s["id"]}">{body}</div>'
        secs.append(f'<section class="{cls}" data-steps="{steps}" data-id="{s["id"]}">{inner}</section>')
    meta = [dict(id=s["id"], notes=s["notes"], secs=s["secs"]) for s in SLIDES]
    page = TEMPLATE.replace("<!--FONTS-->", fonts_tag).replace("<!--HEAD-->", extra_head) \
        .replace("<!--SLIDES-->", "\n".join(secs)).replace("<!--VIDEO-->", video_tag).replace("/*META*/[]", json.dumps(meta, ensure_ascii=False))
    return page


BRIDGE = r"""<style>#big{display:none!important}
html.deckbg #chap,html.deckbg #cap,html.deckbg #note,html.deckbg #bar{visibility:hidden!important}</style>
<script>/* Case Desk deck bridge: the deck shows this paused on frame 0 behind its opening slides, starts it, and gets keys back */
(()=>{if(parent===window)return;const P=m=>{try{parent.postMessage({casedeck:m},'*')}catch(e){}};
const V=()=>window.__vx,R=document.documentElement;R.classList.add('deckbg');
document.addEventListener('keydown',e=>{const k=e.key,v=V();
 if(armed){if(e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();e.stopImmediatePropagation();
   if(['ArrowRight','PageDown',' ','Enter'].includes(k))start();else P({key:k});return}
 if(k==='Escape'){if(!document.fullscreenElement){e.stopImmediatePropagation();P('back')}return}
 if(k==='PageDown'){e.preventDefault();e.stopImmediatePropagation();if(v&&v.state().ended)P('next');else if(v)v.toggle();return}
 if(k==='PageUp'){e.preventDefault();e.stopImmediatePropagation();P('back');return}
 if((k==='f'||k==='F')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();e.stopImmediatePropagation();P('fs');return}
},true);
/* the player's own fullscreen button makes the DECK fullscreen, never just this frame */
/* armed = the deck's last slide before the video is up and this frame has focus, so the presenter's own key/click
   lands HERE: a real user gesture in this frame, so the narration's AudioContext may start (autoplay policy) */
let armed=false;function start(){armed=false;R.classList.remove('deckbg');const v=V(),x=document.getElementById('vx');x&&x.classList.add('idle');if(v){if(v.state().ended)v.seek(0);v.play()}P('advance')}
document.addEventListener('pointerdown',e=>{if(armed){e.preventDefault();e.stopImmediatePropagation();start()}},true);
document.addEventListener('click',e=>{if(armed||R.classList.contains('deckbg')){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#bfs')){e.preventDefault();e.stopImmediatePropagation();P('fs')}},true);
let lm=0;document.addEventListener('pointermove',()=>{const t=Date.now();if(t-lm>400){lm=t;P('move')}},{passive:true});
const theater=()=>{const x=document.getElementById('vx');if(x&&!x.classList.contains('theater')){x.classList.add('theater');dispatchEvent(new Event('resize'))}};
addEventListener('message',e=>{const d=e.data&&e.data.casedeck,v=V();if(!d||!v)return;
 if(d==='play'){R.classList.remove('deckbg');const x=document.getElementById('vx');x&&x.classList.add('idle');if(v.state().ended)v.seek(0);v.play()}
 else if(d==='pause')v.pause();
 else if(d==='bg'){armed=false;v.pause();v.seek(0);R.classList.add('deckbg')}
 else if(d==='arm'){armed=true;if(v.state().local>0||v.state().k>0){v.pause();v.seek(0)}R.classList.add('deckbg')}
 else if(d==='disarm')armed=false});
let was=null,wasEnd=false,ready=false;setInterval(()=>{const v=V();if(!v)return;theater();
 if(!ready){ready=true;requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>P('ready'),150)))}
 const s=v.state();if(s.playing!==was){was=s.playing;P(s.playing?'playing':'paused')}
 if(s.ended&&!wasEnd)P('ended');wasEnd=!!s.ended},200);
theater();})();</script>"""


def build_offline():
    out = os.path.join(HERE, "present")
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    make_bgs(os.path.join(out, "img"))
    vids = [f for f in os.listdir(os.path.join(B, "video")) if f.endswith(".standalone.html")]
    assert len(vids) == 1, vids
    v = open(os.path.join(B, "video", vids[0]), encoding="utf-8").read()
    ext = re.findall(r'<(?:script|link|img|audio|source)\b[^>]*\b(?:src|href)="(https?:[^"]+)"', v)
    assert not ext, f"video still loads from the network: {ext}"
    i = v.rfind("</body>")
    v = v[:i] + BRIDGE + v[i:] if i >= 0 else v + BRIDGE
    open(os.path.join(out, "video.html"), "w", encoding="utf-8").write(v)
    shutil.copyfile(FONTS_CACHE, os.path.join(out, "fonts.css"))
    tag = '<iframe id="vid" data-src="video.html" title="Case Desk demo video" allow="fullscreen; autoplay" tabindex="-1"></iframe>'
    page = deck_html("img/", '<link rel="stylesheet" href="fonts.css">', tag)
    open(os.path.join(out, "deck.html"), "w", encoding="utf-8").write(page)
    open(os.path.join(out, "README.txt"), "w").write(README)
    z = os.path.join(HERE, "casedesk-present.zip")
    if os.path.exists(z):
        os.remove(z)
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(out):
            for f in sorted(files):
                p = os.path.join(root, f)
                zf.write(p, os.path.join("casedesk-present", os.path.relpath(p, out)))
    print("offline:", out, f"deck {len(page):,} chars, video {len(v):,} chars;", z, f"{os.path.getsize(z) / 1e6:.1f} MB")


def build_artifact():
    out = os.path.join(B, "artifact")
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(os.path.join(out, "assets"))
    make_bgs(os.path.join(out, "assets", "bg"))
    vp = os.path.join(B, "vxpage")
    pages = [f for f in os.listdir(vp) if f.endswith(".html") and "standalone" not in f]
    assert len(pages) == 1, pages
    v = open(os.path.join(vp, pages[0]), encoding="utf-8").read()
    shutil.copytree(os.path.join(vp, "assets", "audio"), os.path.join(out, "assets", "audio"))
    names = sorted(set(re.findall(r'asset:(audio/[A-Za-z0-9_./-]+)', v)))
    # srcdoc child gets no console boot script: the deck resolves the audio (hidden <audio asset:> here),
    # hands the child a copy of the boot script and answers its asset requests with the Blobs (template.html).
    i = v.rfind("</body>")
    v = v[:i] + BRIDGE + v[i:]
    packed = base64.b64encode(gzip.compress(v.encode("utf-8"), 9)).decode()
    audio = "".join(f'<audio class="vxa" preload="auto" src="asset:{n}"></audio>' for n in names)
    tag = ('<iframe id="vid" data-srcdoc="1" title="Case Desk demo video" allow="fullscreen; autoplay" tabindex="-1"></iframe>'
           f'<div id="vxsrc" hidden>{packed}</div>{audio}')
    page = deck_html("asset:bg/", f'<link rel="stylesheet" href="{GFONTS}">', tag)
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(page)
    print("artifact:", out, f"{len(page):,} chars (cap 1,000,000); audio assets: {len(names)}")
    assert len(page) < 1_000_000


README = """CASE DESK — presentation (offline)

Open deck.html in Chrome or Edge (double-click). Press F for fullscreen.
  → / Space / PageDown / click   next step or slide
  ← / PageUp                      back
  N   speaker notes + timer (T resets the timer)
  P   presenter window (for a second screen; keys work there too)
Video slide: Space (or click, or the clicker) plays it. While it has focus, keys go to the video.
  Esc = back to the slides (then → for the closing slide). When the video ends the deck takes the keys back.
No internet needed. If the browser blocks the video inside a file:// page, run:
  python3 -m http.server 8000   (in this folder)   and open http://localhost:8000/deck.html
"""

TEMPLATE = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()

if __name__ == "__main__":
    what = sys.argv[1:] or ["offline", "artifact"]
    if what == ["times"]:   # frame seconds make.sh grabs
        print(" ".join(dict.fromkeys(v[0] for v in BGS.values())))
        sys.exit(0)
    if "offline" in what:
        build_offline()
    if "artifact" in what:
        build_artifact()
    if "notes" in what or "offline" in what:
        import notes
        notes.write(os.path.join(HERE, "SPEAKER-NOTES.md"))
