# Screen-capture demo (1:50, no sound)

On YouTube: https://youtu.be/uBp6_sqRI8c

`case-desk-demo.mp4` is a backup video for the submission form (limit 2:00). It shows real clicks in the real app,
with real Claude replies, recorded on a separate demo server with the same code as `main`. The time spent waiting
for Claude is cut out.

1. Marko writes in Serbian; Claude answers in Serbian from his Adapty profile (mock Adapty, Lumen seed data).
2. Ava: "I paid but have no premium". Premium is only requested; the developer has to OK it.
3. Console: one click on "Give Ava 3 days of premium" calls the Adapty grant.
4. Back in the app, Ava sees it was approved.
5. Isla asks for a person. Case Desk drafts a checked reply as ghost text in the composer; Tab takes it, Enter
   sends it as "Lumen team", and the case is marked resolved. (Design: v6, strips.)
6. Rules: the owner decides what Case Desk may do on its own.

The narrated 3D demo used in the live presentation is in `presentation/present/video.html`.
