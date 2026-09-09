# Testing strategy

## Domain and database checks

`npm test` runs Vitest against isolated in-memory PGlite databases. These tests use actual SQL transactions, constraints, and persisted records, rather than mocking repository behavior.

Covered invariants include competing edits, version history, exact brief evidence, exact artifact evidence, duplicate links, wrong-project references, stale review decisions, first-version analysis rejection, empty results, and AI artifact/citation validation.

## Browser checks

Start `npm run dev`, then run `npm run test:e2e`. Playwright uses installed Google Chrome. The CI definition installs Chrome automatically; for a new developer machine, install Chrome or run `npx playwright install chrome`.

The end-to-end workflow creates a project, adds a requirement and artifact, connects evidence, saves a new version, analyzes, accepts an impact, reloads, and verifies persistence and history. A second test checks the labelled example at desktop and phone sizes with Axe and verifies no document-level horizontal overflow.

Browser tests create their own project data in the connected local database. Run them against a disposable test instance when preserving a personal workspace matters. They do not delete user projects.

## AI evaluation

Schema/citation unit tests verify output boundaries, not model quality. Before enabling a provider for users, prepare a human-labelled dataset of requirement changes and expected affected artifacts. Include no-impact changes, confusingly similar artifacts, incorrect quotations, unrelated artifacts, and adversarial instructions embedded in source text.

Measure precision (correct suggestions / returned suggestions), recall (found expected impacts / all expected impacts), valid evidence rate, request latency, and actual provider cost. Report sample size, model, prompt version, and date. Keep held-out cases and compare prompt changes. Do not publish accuracy percentages from structural tests.

The repository does not include fabricated quality metrics. Live model evaluation remains pending until a provider and labelled dataset are configured.

## Manual checks

- Create a project and use the complete flow without sample content.
- Open two browser tabs and attempt edits from the same version.
- Inspect empty, loading, failed, and outdated states.
- Navigate with Tab, Shift+Tab, Enter, and Escape.
- Inspect phone, tablet, and desktop widths and reduced-motion behavior.
- Exercise access-token rejection before sharing a hosted instance.
- Test backup/restore before relying on the application for important records.

## Evidence boundaries

Passing embedded tests does not prove hosted PostgreSQL operation, a full security assessment, assistive-technology compatibility, or production deployment. See VALIDATION.md for the precise checks run during this build.

## Built-server smoke test

After `npm run build`, run `npm run test:production`. This creates an isolated temporary database and an ephemeral local port. It verifies the production token startup guard, unauthorized access, static UI serving, security headers, cross-origin rejection, input validation, unknown-record handling, and persistence across a graceful server restart. It only stops the subprocesses it creates and removes its own temporary database.
