# User guide

## A five-minute example

1. On the empty workspace, choose **Explore example**. This creates a fictional Atelier booking project, three requirements, three artifacts, and a saved policy change. Its EXAMPLE PROJECT label distinguishes it from your work.
2. Overview shows counts derived from the database, the latest before/after change, and a diagram of up to three direct connections.
3. Open **Change review**. The policy moved from cancellation before the appointment to a 24-hour cutoff.
4. Inspect the API, test, and screen cards. Expand your reasoning from each quoted artifact description; a link indicates a review target, not a proven bug.
5. Choose **Accept impact** for work needing attention, or **Dismiss** if it does not. **Reopen review** returns a decision to pending.
6. Open **Activity log** to see the recorded decision and requirement versions.
7. **Export report** downloads the project's requirements, artifacts, links, versions, analyses, impacts, and events as JSON.

## Your own project

Choose **New project**, enter a name and the original brief, then create requirement cards from it. Each card needs a concise title, precise behavior, and an exact source excerpt from that brief. Choose **Draft from brief** for sentence-based candidates, then **Review & edit** and Save. With a provider configured, **Generate AI drafts** proposes structured candidates with validated source excerpts. Neither method saves anything without your review. Source-based drafting is explicitly labelled and is not AI.

Add connected work as API descriptions, test cases, screens, or related-requirement descriptions. Click **Connect artifact**, choose both ends, and save a verbatim evidence excerpt from the artifact description. A dependency must belong to the same project.

## Making a change

Edit the requirement and give a reason. The previous version remains in history. Select **Analyze** on a requirement with version 2 or later. The comparison is always between the current and immediately previous versions, not any arbitrary pair.

If another browser edited the record first, your save is rejected. Copy your unsaved wording if needed, close the dialog, refresh the workspace, and reopen the latest requirement. This prevents silent overwrites.

## Interpreting impact

- **Linked dependency:** a human explicitly connected this artifact. Consider whether this particular change affects it.
- **AI suggestion:** the model proposed a possible connection and supplied a validated quotation. You must still check the reasoning.
- **Outdated snapshot:** the requirement has changed again. Run a new analysis; old decisions are preserved but further review is locked.
- **No impacts:** no applicable saved links/suggestions were returned. This is not proof that a change has no consequences.

The dependency diagram displays up to three direct connections to keep it readable. The requirement count, artifact list, and analysis contain the complete set of saved direct links.

## Optional AI

The server owner configures the provider. **Analyze with AI** then appears in Change review. Selecting it sends the changed requirement and a bounded set of unlinked artifact descriptions to that provider. Only use content you intend to share with your configured provider. Without configuration, linked analysis remains available.

## Data and access

The project selector switches workspaces without deleting data. Your last selected project is remembered by the browser. The actual records live in PostgreSQL, not browser storage. JSON export is a portable report; database backup is a separate operation.

A remotely hosted instance asks for the owner token through **Workspace connection**. The token is shared-owner access, not an individual user account. There are no team invitations or permissions in this release.
