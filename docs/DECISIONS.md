# Architecture decision records

## ADR-001 — One deployable backend

**Decision:** NestJS application with a compact domain service, one database, and an in-process worker.

**Reason:** The project needs understandable transactions and a low operational burden. Separate network services would add failure modes without demonstrated need.

**Consequence:** One server process is supported. Split the service into feature modules as its size grows; adopt a durable job queue and separate worker before horizontal scaling.

## ADR-002 — Embedded PostgreSQL for local use

**Decision:** PGlite locally, `pg` for an external PostgreSQL database, with shared parameterized SQL.

**Reason:** The application should start without a Docker daemon or database installation while teaching relational constraints and transaction semantics.

**Consequence:** PGlite database-backed tests exercise real PostgreSQL behavior, but they do not establish identical performance or operational behavior on an external server. External PostgreSQL must be validated separately before deployment.

## ADR-003 — Explicit relationships before model suggestions

**Decision:** Snapshot direct links deterministically; use a hosted model only for additional unlinked candidates on explicit request.

**Reason:** A relationship the user recorded is stronger provenance than an unconstrained model guess. The main workflow must function without credentials or inference cost.

**Consequence:** Discovery coverage depends on the supplied artifacts. Exact quotation validation rejects invented citations but does not prove semantic relevance.

## ADR-004 — Version checks at the write boundary

**Decision:** Every edit submits the version it read; every review checks current requirement version against the analysis version.

**Reason:** UI state can become stale. A server-enforced invariant is necessary even if buttons are disabled in the browser.

**Consequence:** Users may need to reopen an editor after a competing change. This is preferable to losing another change silently.

## ADR-005 — Single-owner authentication for the first release

**Decision:** Local loopback use is frictionless; hosted use requires one strong access token.

**Reason:** Full team identity, recovery, invitations, and roles are a separate product/security scope. The implementation should not imply those controls exist.

**Consequence:** This release is suitable for a local portfolio demonstration or a private owner workspace. Shared team deployment requires OIDC/session authentication and explicit per-user authorization.

## ADR-006 — Review decisions do not mutate artifacts

**Decision:** Accept/dismiss records assessment only.

**Reason:** The artifact is evidence. Automatically rewriting it would collapse the distinction between a proposed impact and completed implementation.

**Consequence:** Actual development work remains a separate task. A future integration could create a reviewed issue after explicit authorization.
