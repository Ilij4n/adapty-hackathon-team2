#!/usr/bin/env bash
# Rebuild everything from the video folder (default: the Case Desk demo). One command after the video changes:
#   ./make.sh [VIDEO_DIR]
# Never touches VIDEO_DIR/out — both video builds go to build/ via --out.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
VDIR="${1:-/home/agent/work/explainers/casedesk-demo}"
VX="$HOME/work/projects/video-explainer/vx.py"
cd "$HERE"
rm -rf build/video build/vxpage build/frames
python3 "$VX" standalone "$VDIR/spec.json" --out build/video | tail -3       # offline: audio+three+fonts inlined
python3 "$VX" build "$VDIR/spec.json" --out build/vxpage | tail -3           # console artifact: asset: audio
# slide backgrounds (seconds into the video; keep in step with BGS in build.py if scenes move)
python3 tools/grab.py build/video/*.standalone.html build/frames $(python3 build.py times)
python3 build.py offline artifact
echo "done: present/ casedesk-present.zip build/artifact/ SPEAKER-NOTES.md"
