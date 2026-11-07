# The demo video (3:04, 8 scenes)

Built with Bagley's video engine (a separate repo, not included here). This folder is the video's source:
- `spec.json`: the final narration, one sentence per beat, and the scene list.
- `scenes/N.js`: each scene (3D low-poly + 2D cards), `shared.js` / `bridges.js`: shared helpers and transitions.
- `audio/sceneN.wav`: the narration clips (Bagley's voice), with word timings in `sceneN.words.json`.
- `BRIEF.md`: the facts every on-screen string must come from; `FACTS-ilijan.md`: the sourced research behind the
  hook (real App Store reviews, RevenueCat, Adapty pricing, what Adapty can and can't see).

The playable file is `../presentation/present/video.html`.

**Changing it:** the video is final for now. If something should change, write it down (scene, time stamp, what and
why) in an issue or a note here, and Bagley rebuilds it. Text changes in narration need new voice clips, so they take
longer than visual tweaks.
