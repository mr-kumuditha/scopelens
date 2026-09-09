# API reference

Base path: `/api`. All bodies and responses are JSON. Use `Authorization: Bearer <API_TOKEN>` when configured. Development requests should use the Vite proxy on port 5173; built deployments serve UI and API together on port 4000.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status, AI configuration flag, access mode |
| GET | `/projects` | List projects and requirement counts |
| POST | `/projects` | Create project |
| POST | `/sample` | Load/reuse labelled fictional example |
| GET | `/projects/:project` | Read complete project snapshot |
| POST | `/projects/:project/drafts` | Generate unsaved source-based or AI requirement drafts |
| POST | `/projects/:project/requirements` | Add evidence-linked requirement |
| PATCH | `/projects/:project/requirements/:id` | Save new version |
| POST | `/projects/:project/artifacts` | Add described work |
| POST | `/projects/:project/requirements/:id/links` | Connect artifact with exact evidence |
| POST | `/projects/:project/requirements/:id/analyses` | Schedule comparison |
| PATCH | `/projects/:project/impacts/:id` | Save review decision |

POST handlers return HTTP 201 on success; reads and updates return 200. Errors use `{ "message": "..." }`. 400 means invalid input, 401 invalid/missing configured token, 403 origin rejection, 404 missing/wrong-project record, 409 concurrency or lifecycle conflict. Unknown failures return a generic 500 response without database details.

## Create project

```json
{"name":"Studio booking","brief":"Customers can cancel before the appointment."}
```

Returns `{ "id": "uuid" }`. Name is limited to 100 characters and brief to 20,000. `sample` is an optional boolean used to label fictional demonstration content.

## Add requirement

```json
{"title":"Cancellation policy","body":"Customers can cancel before the appointment.","source":"Customers can cancel before the appointment."}
```

Returns `{ "id": "uuid" }`. Title: 150 characters. Body: 10,000. Source must be a literal excerpt from the original project brief. Codes are assigned within the project, e.g. `REQ-001`.

## Edit requirement

```json
{"title":"Cancellation policy","body":"Customers can cancel until 24 hours before the appointment.","reason":"Client changed the cancellation window.","version":1}
```

Returns `{ "version": 2 }`. Version is the expected current version, not the desired new version. A stale version produces 409. An unchanged title/body produces 400. Reason is required and limited to 500 characters.

## Add artifact

```json
{"kind":"test","title":"Cancellation boundary","description":"The cancellation test permits cancellation immediately before the appointment."}
```

Kinds: `api`, `test`, `screen`, `requirement`. Title limit: 150. Description: 4,000. Returns `{ "id": "uuid" }`.

## Connect artifact

```json
{"artifactId":"artifact-uuid","evidence":"permits cancellation immediately before the appointment"}
```

Evidence must be an exact substring of the selected artifact description. Both ends must belong to the URL's project. Duplicate relationships return 409.

## Analyze

```json
{"version":2,"useAI":false}
```

Returns `{ "id": "analysis-uuid" }` while the task runs. Poll the project snapshot until status is `complete` or `failed`. There is one active job per project. Version must be the current version and at least 2. `useAI:true` requires server configuration. The worker captures direct links regardless of AI mode.

## Review

```json
{"decision":"accepted"}
```

Allowed values: `pending`, `accepted`, `dismissed`. A repeated identical decision is a no-op. Outdated analyses and running jobs reject review. Direct impacts from failed AI analyses remain reviewable if their requirement version is current.

## Snapshot shape

```text
project, requirements[], artifacts[], links[], analyses[], impacts[],
events[], versions[], aiEnabled
```

Analyses include `before_text`, `after_text`, `version`, `status`, `mode`, `error`, and derived `stale`. Impacts include snapshot title, kind, basis, explanation, evidence, and decision. Activity is limited to the latest 100 events. Full large-project pagination is future work.

## Draft requirements

POST `/projects/:project/drafts` with `{ "useAI": false }` splits the saved brief into up to 20 sentence/line candidates. With `useAI:true`, a configured model proposes structured candidates; each source excerpt is validated against the brief. Returns `{ "mode": "source" | "ai", "drafts": [{ "title", "body", "source" }] }`. Existing exact source excerpts are excluded. Nothing is persisted until the user saves a reviewed requirement through the requirements endpoint.
