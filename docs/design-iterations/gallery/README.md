# Gallery builder

Builds the comparison page published as the "Case Desk Design Iterations" artifact.

```
uv run python tests/design_shots.py --variants 0,1,2,3,4 --out /tmp/shots
cd docs/design-iterations/gallery && uv run --with pillow python build.py /tmp/shots data.json
```

It converts the screenshots to WebP under `img/` and writes `index.html` (both are build output, not committed).
