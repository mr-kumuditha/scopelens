# Validation record

Build date: **9 September 2026**. This record describes local checks, not a public deployment or customer pilot.

| Check | Result |
|---|---|
| TypeScript typecheck | Passed |
| Vite frontend + compiled NestJS backend | Passed |
| Domain/database and evidence validation | 13 tests passed |
| Chrome end-to-end workflows | 4 tests passed |
| Desktop and mobile overview accessibility | Zero Axe A/AA violations in tested states |
| Review, requirements, activity, documentation, modal accessibility | Zero Axe A/AA violations in tested states |
| Phone document overflow | No horizontal document overflow at 390px |
| Production server startup guard | Rejects missing production token |
| Production API access | Missing token rejected; configured token accepted |
| Cross-origin API requests | Rejected in smoke test |
| Built frontend and security headers | Served successfully |
| Invalid request and missing record | 400 and 404 confirmed |
| Embedded database after restart | Saved project persisted |
| Dependency audit | Zero known vulnerabilities at check time |
| Formatting | Prettier check passed |

The browser workflow creates a project, reviews evidence, links an artifact, saves a version, analyzes, accepts an impact, reloads, and checks the activity record. A separate workflow confirms draft generation does not bypass human review.

The database-backed tests exercise competing writes, cross-project relationship rejection, duplicate links, source validation, historical snapshots, outdated review locks, empty analyses, and AI output validation. AI tests are structural checks; they are not model-quality evaluations.

Production smoke tests use the compiled server, a temporary isolated embedded database, an ephemeral loopback port, and a generated token that is not logged. They verify persistence across a graceful restart.

## Screenshots

- [Overview](screenshots/overview.png)
- [Change review](screenshots/review.png)
- [Mobile review](screenshots/mobile.png)

These images show the explicitly fictional Atelier example. Counts are derived from that example's stored records, not fabricated adoption metrics.

## Not verified

- Live hosted AI responses or model accuracy: no provider key was configured or used.
- External PostgreSQL server behavior: adapter provided, local checks used PGlite.
- Docker/Compose runtime: configuration supplied, image not built or deployed here.
- GitHub Actions execution: workflow supplied, no remote repository run.
- Public deployment, real-user adoption, or backup/restore drill.
- Full security audit, screen-reader audit, or every browser/device combination.

The 12ui service returned `403 missing_scope`; the final interface was designed and implemented directly. No generated 12ui result is claimed.
