# Presentation (Case Desk, Adapty Hackathon Belgrade 2026, Team 2)

**To present:** open `present/deck.html` in Chrome or Edge (if the video does not load from a local file, run
`python3 -m http.server` in `present/` and open http://localhost:8000/deck.html). Press **F** for real fullscreen.
- → / Space / click: next step; ←: back. **N**: speaker notes + timer. **P**: presenter window for a second screen.
- On "Watch it", the next key starts the video (the blurred background pulls into focus). While the video plays it has
  the keys; **Esc** hands them back to the slides; when it ends the deck takes them back by itself.
- `present/video.html` is the 3:04 video as one self-contained file (audio, 3D and fonts inlined); it also plays on its own.

**Script:** `SPEAKER-NOTES.md`, word for word (single speaker: Mateja), plus likely jury questions with answers.

## Changing it (tonight)
The easiest way: edit `present/deck.html` directly. Each slide is a `<section class="slide" data-id="…">` block with plain HTML;
click steps are elements with `data-step="N"` (the section's `data-steps` is how many there are); the speaker notes
are the `notes` strings in `const META=[…]` near the end of the file, one per slide id. Bagley will
carry any change you make there back into the sources (`slides.py`, `notes.py`, `template.html`) tomorrow, so the next
rebuild keeps it. Write a line in the commit message saying what you changed and why.

The sources (`slides.py`, `notes.py`, `template.html`, `build.py`, `make.sh`, `tools/`) rebuild the deck from the video
project, but `make.sh` needs Bagley's video engine (not in this repo), so rebuilding happens on Bagley's side.
