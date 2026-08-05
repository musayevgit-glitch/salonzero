---
name: test-gate
description: Apply before declaring any milestone or feature complete.
---

Run the smallest relevant checks first, then the full affected suite.

Required:
- formatting;
- lint;
- strict type check;
- unit tests;
- integration tests;
- authorization and tenant-isolation tests;
- database constraint tests;
- Playwright happy path;
- Playwright permission-denied path;
- responsive viewport checks;
- accessibility smoke checks;
- production build.

Do not claim success if a command was not run.
Report exact failures.
Do not delete or weaken tests to obtain a green result.
