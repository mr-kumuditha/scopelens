# Scope and roadmap

## v0.1 — implemented

Single-owner local workspace; projects, source-based and optional AI drafts, and reviewed evidence-backed requirements; versions and change reasons; artifact links; deterministic direct-impact snapshots; background analysis; optional hosted-model suggestions; exact evidence validation; review decisions; stale-result protection; activity; JSON report export; responsive UI; setup and engineering documentation.

## Next: validate with real users

Pilot with one student team or developer who manages a small project. Observe how they write requirements and link tests. Measure whether the review flow helps them notice impacts they would otherwise miss. No adoption or time-saving claims exist yet.

## v0.2 — improve input and evaluation

- A checked-in, human-labelled impact dataset and provider evaluation runner.
- Change-specific deterministic explanations where supported by structured rules.
- Title-only changes and arbitrary historical comparisons made explicit in the diff view.
- Artifact editing/versioning and relationship editing, with analysis staleness for dependency changes.
- Pagination, project archive, and an intentional import/restore workflow.

## v0.3 — team collaboration

OIDC or session authentication, project membership, roles, per-user audit identity, invitations, rate limiting, and authorization tests. Replace the shared owner token before positioning it as a team SaaS product.

## Later, only if validated

Read-only repository integration, explicit requirement-to-test links, durable external workers, distributed job claiming, transitive relationship traversal with cycle handling, observability, and reviewed issue creation. Each should solve a observed user need.

## Current constraints

- Draft generation is review-only; no repository indexing, embeddings, or code edits.
- Direct relationships only; the diagram shows up to three for readability.
- One API process, including when external PostgreSQL is configured.
- AI suggestions consider at most 30 unlinked artifacts per analysis.
- Interrupted jobs fail rather than automatically resume.
- AI quality is unmeasured until a real provider is evaluated.
- Single-owner access; no claims of tenant isolation between people.
- Latest 100 audit events are returned in the snapshot/report.
