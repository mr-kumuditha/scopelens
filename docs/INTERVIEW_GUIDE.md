# Portfolio and interview guide

## Explain the problem

“A small requirement change can affect an API, a test, and a screen. I built ScopeLens to preserve the source context and show the connected work that needs review.”

## Three-minute demonstration

1. Open the explicitly fictional booking example and explain the 24-hour cancellation change.
2. Show the before/after requirement and its preserved versions.
3. Follow an explicit API or test link to its source evidence.
4. Accept an impact and show the audit event.
5. Change the requirement again and demonstrate that old review actions are locked.
6. Explain that model suggestions are optional and never automatically accepted.

## Engineering questions to prepare for

**Why a monolith?** A small deployment needs clear transactions and low operational overhead. Separate services would add infrastructure before there is demand.

**How do you avoid lost edits?** Clients send an expected version; the server locks, compares, and updates transactionally. A competing stale write receives 409.

**Does a source quote make AI correct?** No. It proves the excerpt exists, not that the suggested impact logically follows. Human review and model evaluations remain necessary.

**What happens on provider failure?** The analysis becomes failed but its direct-link snapshots remain available. The model cannot erase the evidence-based part of the result.

**Can it scale horizontally?** Not yet. The first release uses process-local serialization and job coordination. Multiple replicas require atomic shared job claiming and per-transaction connections.

**Why embedded PostgreSQL?** Easy local setup while retaining relational constraints and SQL transactions. External PostgreSQL is configurable but needs its own operational validation.

## Honest CV wording

After running the included checks:

> Built ScopeLens, a React/TypeScript and NestJS requirement-change workbench with PostgreSQL persistence, evidence-linked dependencies, immutable version history, and human impact review. Implemented optimistic concurrency, stale-analysis protection, and database-backed and browser tests.

After separately validating a live provider, add:

> Integrated hosted-model impact suggestions with schema validation and exact-source quotation checks.

Do not claim production deployment, real users, time savings, model accuracy, enterprise security, or multi-tenant operation until independently verified.
