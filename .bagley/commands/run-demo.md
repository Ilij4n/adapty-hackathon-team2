---
description: Start a local Case Desk demo (own port, own DB, seeded, Night Shift bubbles) and print the URLs
---
Run a local Case Desk demo without touching the live one:

1. `uv sync` (once).
2. Pick a free port P (not 8100) and run
   `CASEDESK_DB=/tmp/casedesk-$P.db CASEDESK_DESIGN=6 uv run python -m casedesk.demo --port $P --fresh --seed`
   in the background. Add `--llm claude-cli` only if a Claude login is available; otherwise templates answer.
3. Print http://localhost:$P/help, /console and the picker users (`/api/demo/users`).
4. To show a grant: in /help pick "Ava (00239)" and send "I paid but have no premium"; approve in /console.
5. Stop the server when done.
