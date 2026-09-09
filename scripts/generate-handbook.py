from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Line, Rect, String


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "ScopeLens-Project-Handbook.pdf"
SHOT = ROOT / "docs" / "screenshots"
LIVE_URL = "https://scopelens-three.vercel.app"
REPO_URL = "https://github.com/mr-kumuditha/scopelens"

INK = colors.HexColor("#10231D")
MUTED = colors.HexColor("#5F6E68")
MINT = colors.HexColor("#DDF6E8")
GREEN = colors.HexColor("#16845B")
GREEN_DARK = colors.HexColor("#0B5E3C")
LIME = colors.HexColor("#B9EA6B")
PAPER = colors.HexColor("#F7FAF7")
LINE = colors.HexColor("#D7E4DC")
BLUE = colors.HexColor("#E7F0FF")
AMBER = colors.HexColor("#FFF2C8")
RED = colors.HexColor("#FFE5E1")


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=GREEN, spaceAfter=10),
        "cover_title": ParagraphStyle("cover_title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=31, leading=35, textColor=INK, alignment=TA_LEFT, spaceAfter=12),
        "cover_sub": ParagraphStyle("cover_sub", parent=base["Normal"], fontName="Helvetica", fontSize=13, leading=19, textColor=MUTED, spaceAfter=16),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=21, leading=26, textColor=INK, spaceBefore=3, spaceAfter=12),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=GREEN_DARK, spaceBefore=12, spaceAfter=7),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=INK, spaceBefore=7, spaceAfter=4),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.3, leading=14, textColor=INK, spaceAfter=7),
        "small": ParagraphStyle("small", parent=base["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=4),
        "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.3, textColor=INK, leftIndent=13, firstLineIndent=-8, spaceAfter=4),
        "quote": ParagraphStyle("quote", parent=base["BodyText"], fontName="Helvetica-Oblique", fontSize=10.5, leading=16, textColor=GREEN_DARK, leftIndent=14, rightIndent=14, spaceAfter=8),
        "table": ParagraphStyle("table", parent=base["BodyText"], fontName="Helvetica", fontSize=8.1, leading=10.8, textColor=INK),
        "table_head": ParagraphStyle("table_head", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.1, leading=10.5, textColor=colors.white),
        "callout": ParagraphStyle("callout", parent=base["BodyText"], fontName="Helvetica", fontSize=8.9, leading=13, textColor=INK),
        "q": ParagraphStyle("q", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=9.4, leading=13, textColor=GREEN_DARK, spaceBefore=6, spaceAfter=2),
        "a": ParagraphStyle("a", parent=base["BodyText"], fontName="Helvetica", fontSize=8.9, leading=13, textColor=INK, leftIndent=8, spaceAfter=4),
    }


S = styles()


def p(text, style="body"):
    return Paragraph(text, S[style])


def bullet(text):
    return p("<b>-</b> " + text, "bullet")


def label(text, color=GREEN):
    return Table([[p(text, "table_head")]], colWidths=[150 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color), ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))


def callout(title, text, color=MINT):
    return Table([[p(f"<b>{title}</b><br/>{text}", "callout")]], colWidths=[166 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color), ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))


def table(headers, rows, widths):
    data = [[p(h, "table_head") for h in headers]] + [[p(cell, "table") for cell in row] for row in rows]
    return Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT", style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER]),
    ]))


def box(d, x, y, w, h, title, body, fill=MINT):
    d.add(Rect(x, y, w, h, rx=7, ry=7, fillColor=fill, strokeColor=LINE, strokeWidth=0.8))
    d.add(String(x + 8, y + h - 16, title, fontName="Helvetica-Bold", fontSize=8.5, fillColor=INK))
    lines = body.split("\n")
    for index, line in enumerate(lines):
        d.add(String(x + 8, y + h - 30 - (index * 10), line, fontName="Helvetica", fontSize=7.2, fillColor=MUTED))


def arrow(d, x1, y1, x2, y2, color=GREEN_DARK):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1.25))
    d.add(Line(x2, y2, x2 - 5, y2 + 3, strokeColor=color, strokeWidth=1.25))
    d.add(Line(x2, y2, x2 - 5, y2 - 3, strokeColor=color, strokeWidth=1.25))


def workflow_diagram():
    d = Drawing(470, 145)
    steps = [
        (10, "Source", "Brief sentence\nor client note", BLUE),
        (106, "Requirement", "Evidence +\nversion", MINT),
        (202, "Artifacts", "API, test,\nscreen", AMBER),
        (298, "Analysis", "Direct links +\noptional AI", colors.HexColor("#EEE5FF")),
        (394, "Review", "Accept or\ndismiss", MINT),
    ]
    for x, title, body, fill in steps:
        box(d, x, 55, 76, 52, title, body, fill)
    for i in range(len(steps) - 1):
        arrow(d, steps[i][0] + 76, 81, steps[i + 1][0], 81)
    d.add(String(10, 18, "Every decision remains traceable to the saved source and the reviewed requirement version.", fontName="Helvetica-Oblique", fontSize=8.3, fillColor=MUTED))
    return d


def architecture_diagram():
    d = Drawing(470, 208)
    box(d, 12, 128, 100, 54, "Browser", "React 19\nVite bundle", BLUE)
    box(d, 184, 128, 104, 54, "HTTP boundary", "NestJS controller\nvalidation + headers", MINT)
    box(d, 356, 128, 100, 54, "Domain service", "versions, evidence,\nreview rules", AMBER)
    box(d, 104, 28, 112, 56, "Database adapter", "PGlite locally\nPostgreSQL via URL", colors.HexColor("#EEE5FF"))
    box(d, 296, 28, 112, 56, "Analysis worker", "direct links\noptional AI request", colors.HexColor("#FCE8F2"))
    arrow(d, 112, 155, 184, 155)
    arrow(d, 288, 155, 356, 155)
    arrow(d, 400, 128, 160, 84)
    arrow(d, 408, 56, 356, 128)
    d.add(String(12, 197, "Modular-monolith foundation: one deployable service with explicit feature responsibilities.", fontName="Helvetica-Oblique", fontSize=8.3, fillColor=MUTED))
    return d


def data_diagram():
    d = Drawing(470, 170)
    entities = [
        (10, 102, 90, "Projects", "brief, sample"), (130, 102, 102, "Requirements", "code, version, source"),
        (262, 102, 90, "Artifacts", "kind, description"), (380, 102, 78, "Events", "audit trail"),
        (70, 25, 94, "Versions", "immutable history"), (196, 25, 80, "Links", "exact evidence"),
        (308, 25, 88, "Analyses", "before / after"), (404, 25, 58, "Impacts", "decision"),
    ]
    for x, y, w, title, body in entities:
        box(d, x, y, w, 42, title, body, colors.white)
    arrow(d, 100, 123, 130, 123); arrow(d, 232, 123, 262, 123); arrow(d, 100, 115, 380, 115)
    arrow(d, 174, 102, 118, 67); arrow(d, 181, 102, 236, 67); arrow(d, 307, 102, 236, 67)
    arrow(d, 196, 46, 308, 46); arrow(d, 396, 46, 404, 46)
    return d


def validation_chart():
    d = Drawing(470, 176)
    items = [
        ("TypeScript typecheck", 100, GREEN), ("Domain / database tests", 100, GREEN),
        ("Production build", 100, GREEN), ("Chrome workflow tests", 100, GREEN),
        ("Accessibility checks", 100, GREEN), ("Live Vercel health", 100, GREEN),
        ("Hosted AI quality", 0, colors.HexColor("#C9D3CE")), ("External Postgres persistence", 0, colors.HexColor("#C9D3CE")),
    ]
    for i, (name, value, color) in enumerate(items):
        y = 150 - (i * 19)
        d.add(String(5, y, name, fontName="Helvetica", fontSize=8, fillColor=INK))
        d.add(Rect(180, y - 7, 230, 9, fillColor=LINE, strokeColor=None))
        if value:
            d.add(Rect(180, y - 7, 230, 9, fillColor=color, strokeColor=None))
        d.add(String(418, y, "verified" if value else "not claimed", fontName="Helvetica-Bold", fontSize=7.5, fillColor=color if value else MUTED))
    d.add(String(5, 4, "The chart separates completed evidence from capabilities intentionally not claimed as complete.", fontName="Helvetica-Oblique", fontSize=8, fillColor=MUTED))
    return d


def screenshot(name, caption):
    image = Image(str(SHOT / name))
    image._restrictSize(166 * mm, 112 * mm)
    return KeepTogether([image, Spacer(1, 3), p(caption, "small")])


def qa(question, answer):
    return [p(question, "q"), p(answer, "a")]


story = []
story += [Spacer(1, 20 * mm), p("PROJECT HANDBOOK", "cover_kicker"), p("ScopeLens", "cover_title"), p("An evidence-first requirement change workbench", "cover_sub")]
story += [p("A complete explanation for an internship interview panel: the product problem, architecture, design choices, testing evidence, limitations, deployment model, and answers to likely questions.", "body"), Spacer(1, 5 * mm)]
story += [callout("Live demonstration", f"<link href='{LIVE_URL}' color='#0B5E3C'>{LIVE_URL}</link><br/>Public source repository: <link href='{REPO_URL}' color='#0B5E3C'>{REPO_URL}</link>", MINT), Spacer(1, 6 * mm)]
story += [p("Prepared for", "h2"), p("Kumuditha Tharinda Liyanage | HND Software Engineering internship portfolio", "body")]
story += [p("What this project shows", "h2"), bullet("Product thinking: turn an ambiguous requirement change into a reviewable decision."), bullet("Engineering discipline: constraints, transactions, lifecycle states, and explicit boundaries."), bullet("Communication: an interface and handbook that a non-technical reviewer can follow."), Spacer(1, 8 * mm)]
story += [p("Important live-demo note", "h2"), callout("Current Vercel mode", "The public site uses fictional seed data and an in-memory serverless demonstration database. It is useful for viewing the interface and health status, but it is not a durable shared workspace. Local ScopeLens persists using PGlite; a hosted handover requires the configured external PostgreSQL adapter.", AMBER)]

story += [PageBreak(), p("1. The problem and product idea", "h1"), p("Small changes become expensive when teams lose the connection between a source statement, the requirement it created, and the implementation work it could affect. A booking rule can touch a screen, an API, an automated test, and a support process. Spreadsheets and chat messages often preserve only part of that story.", "body"), p("ScopeLens gives one owner a compact workspace to record the source evidence, version a requirement, connect work artifacts with exact evidence, compare versions, and make a human review decision.", "body"), p("The core outcome", "h2"), p("A change should end as a clear answer: <b>what changed, what might be affected, what evidence supports it, and who reviewed it.</b>", "quote"), p("End-to-end product flow", "h2"), workflow_diagram(), Spacer(1, 4 * mm), table(["Actor", "Need", "ScopeLens response"], [["Product owner", "Keep the original intent", "Stores a literal source excerpt from the project brief."], ["Developer", "See affected work before coding", "Links APIs, tests, screens, and requirement artifacts."], ["Reviewer", "Avoid approving old analysis", "Locks review if the requirement version has changed."], ["Interview panel", "Assess real engineering thinking", "Shows validation, limits, and architecture decisions."]], [34 * mm, 53 * mm, 79 * mm])]

story += [PageBreak(), p("2. Experience and interface", "h1"), p("The interface is deliberately calm and compact: a clear project overview, a requirements workspace, evidence connections, and a review view. The goal is to reduce cognitive load while keeping technical evidence visible when the user needs it.", "body"), screenshot("overview.png", "Overview: fictional Atelier booking example. It visualizes project context and the current change workbench."), PageBreak(), p("Review flow", "h2"), screenshot("review.png", "Change review: before/after requirement text, linked evidence, impact status, and a human decision."), Spacer(1, 4 * mm), screenshot("mobile.png", "Mobile review: the same work can be inspected at phone width without document-level horizontal overflow.")]

story += [PageBreak(), p("3. Architecture foundation", "h1"), p("ScopeLens is intentionally a modular monolith. It has one deployable backend and a compact domain service, while its responsibilities are still separated conceptually: HTTP boundary, validation, domain rules, storage, analysis, and review. That choice keeps the first release easy to reason about and test.", "body"), architecture_diagram(), p("Why this foundation is appropriate", "h2"), table(["Decision", "Why it helps an internship project", "Trade-off"], [["React + TypeScript", "Shows component-based UI and static type safety.", "Needs disciplined state and API contracts."], ["NestJS controller + service", "Separates web concerns from business rules.", "Not split into independent services yet."], ["PGlite local / PostgreSQL external", "Runs easily locally while teaching relational constraints.", "External database needs its own deployment validation."], ["Optional AI", "Shows bounded integration, not blind automation.", "Model quality needs a labelled evaluation set."]], [42 * mm, 73 * mm, 51 * mm]), p("Request boundary", "h2"), bullet("The browser calls a same-origin JSON API."), bullet("The controller validates input and applies security headers."), bullet("The service owns rules for versioning, evidence, analysis, and review."), bullet("SQL uses parameters; user input is never interpolated as an identifier.")]

story += [PageBreak(), p("4. Data model and change lifecycle", "h1"), p("The data model does more than store screens. It encodes the relationships that make a change reviewable: a project owns requirements, artifacts, analysis records, and audit events; a requirement keeps its current state and immutable versions.", "body"), data_diagram(), p("Data integrity rules", "h2"), bullet("Each requirement receives a project-scoped code such as REQ-001."), bullet("A source excerpt must be an exact substring of the saved brief."), bullet("A requirement edit requires the version the user read. A mismatch returns HTTP 409 instead of overwriting another change."), bullet("A link must stay inside one project, be unique, and quote exact evidence from its selected artifact."), bullet("An analysis stores the compared versions and snapshots its impacts. Later edits make it stale."), bullet("A review decision is blocked when the analysis is stale or still running."), p("Change lifecycle", "h2"), table(["Step", "Stored evidence", "Protection"], [["1. Capture", "Brief and source excerpt", "Exact-match source validation"], ["2. Version", "Current requirement and immutable version row", "Expected-version check"], ["3. Connect", "Artifact description and evidence quote", "Project scope and duplicate checks"], ["4. Analyze", "Before/after text and impact snapshot", "One active job; explicit state"], ["5. Review", "Accepted or dismissed decision + event", "Reject stale analysis server-side"]], [24 * mm, 76 * mm, 66 * mm])]

story += [PageBreak(), p("5. What happens when a requirement changes", "h1"), p("Example: an appointment cancellation rule changes from 'any time before the appointment' to 'up to 24 hours before'. ScopeLens does not automatically rewrite a test or API. It makes the relevant work visible, preserves the reason for the change, and asks a human to decide.", "body"), p("Detailed flow", "h2"), table(["Moment", "System behaviour", "Why it matters"], [["Save edit", "Validates title, body, reason, and expected version. Stores a new immutable version.", "Preserves history and prevents lost updates."], ["Start analysis", "Captures the prior/current text and known direct links.", "Evidence does not disappear if an optional model fails."], ["Optional model", "Receives bounded context; returned suggestions need a valid artifact and literal quote.", "Avoids accepting invented citations."], ["Review", "User accepts or dismisses the impact.", "A decision is explicit, not inferred from a click elsewhere."], ["Edit again", "Earlier analysis is marked stale and decisions are locked.", "Prevents a reviewer from approving an old comparison."]], [31 * mm, 85 * mm, 50 * mm]), callout("The human boundary", "AI can suggest candidates only when the owner explicitly requests it. Direct evidence links work without AI. ScopeLens never claims that a source quote makes a model suggestion correct.", BLUE), p("Failure behaviour", "h2"), bullet("Invalid fields return 400 with a useful message."), bullet("Missing or wrong-project records return 404."), bullet("Competing edits, duplicate links, or outdated review return 409."), bullet("A provider failure marks analysis failed but preserves direct evidence impacts."), bullet("Unfinished jobs are marked failed after a process restart; the owner may explicitly rerun them.")]

story += [PageBreak(), p("6. Technology and resources", "h1"), table(["Area", "Technology", "Purpose in this project"], [["Frontend", "React 19, TypeScript, Vite", "Fast single-page interface with typed components and bundled assets."], ["User interface", "CSS design tokens, Lucide icons, Inter / Manrope / IBM Plex Mono", "Readable hierarchy, responsive layout, locally bundled visual assets."], ["Backend", "NestJS 12, Express 5, Zod", "HTTP routing, validation, structured error boundary."], ["Data", "PGlite, PostgreSQL adapter, pg", "Local relational persistence with an external PostgreSQL path."], ["Quality", "Vitest, Playwright, Axe, Prettier", "Domain rules, browser workflows, accessibility checks, formatting."], ["Delivery", "GitHub Actions, Vercel", "Repeatable checks and live static/serverless deployment."], ["Optional intelligence", "Hosted model adapter", "Bounded impact suggestions with schema and exact-quote validation."]], [35 * mm, 49 * mm, 82 * mm]), p("Useful resources for a reviewer", "h2"), table(["Resource", "What to read"], [["README.md", "Product summary, setup, and current deployment boundary."], ["docs/ARCHITECTURE.md", "System boundary, data model, transactions, and scaling limits."], ["docs/DECISIONS.md", "Six architecture decision records and their trade-offs."], ["docs/API.md", "Routes, request shapes, errors, and snapshot contract."], ["docs/TESTING.md", "What automated checks prove and what they do not prove."], ["docs/INTERVIEW_GUIDE.md", "Short demo flow and CV wording."], ["docs/DEPLOYMENT.md", "Local, Docker, and Vercel deployment information."]], [50 * mm, 116 * mm])]

story += [PageBreak(), p("7. Quality evidence", "h1"), p("The project treats validation as evidence. A passing test is not used to claim an unrelated result. For example, structural tests validate AI response boundaries; they do not prove model accuracy.", "body"), validation_chart(), p("Completed checks", "h2"), table(["Check", "Evidence"], [["Type safety", "TypeScript typecheck passed."], ["Domain behaviour", "13 Vitest checks passed using isolated in-memory PGlite databases and real SQL constraints."], ["Build", "Vite frontend and compiled NestJS backend build passed."], ["Browser workflow", "4 Chrome Playwright workflows passed in prior validation: project creation, evidence, versioning, analysis, review, reload, and responsive sample."], ["Accessibility", "Axe A/AA checks passed in tested overview, review, requirements, activity, modal states; phone overflow was checked at 390 px."], ["Hosted deployment", "Vercel production health endpoint returned 200 with demoMode true on 9 September 2026."], ["Dependencies", "Dependency audit reported zero known vulnerabilities at the recorded check time."]], [48 * mm, 118 * mm]), p("What is intentionally not claimed", "h2"), bullet("Hosted AI accuracy or live provider performance: no provider key or labelled evaluation dataset is configured."), bullet("Durable external PostgreSQL production persistence: adapter exists, but current Vercel site is the resettable demo configuration."), bullet("Enterprise security, user roles, multi-tenancy, disaster recovery, or a complete assistive-technology audit.")]

story += [PageBreak(), p("8. Deployment and handover", "h1"), p("There are two valid running modes, and they serve different purposes.", "body"), table(["Mode", "Storage", "Best use", "Important limit"], [["Local application", "PGlite in .data/scopelens or DATABASE_URL", "Development, portfolio demo, a single owner workspace", "Run one API process; process-local job coordination."], ["Current Vercel public demo", "In-memory serverless demonstration data", "Visual review of the interface and fictional sample", "No durable shared data. Never enter real client or personal data."], ["Hosted handover target", "External PostgreSQL via DATABASE_URL", "A real private owner workspace", "Needs database provision, token configuration, backups, and operational validation."]], [36 * mm, 45 * mm, 47 * mm, 38 * mm]), p("Local start", "h2"), callout("Commands", "1. npm install<br/>2. npm run dev<br/>3. Open http://127.0.0.1:5173<br/>4. Run npm run check before a handover.", PAPER), p("Public link", "h2"), callout("Live Vercel deployment", f"<link href='{LIVE_URL}' color='#0B5E3C'>{LIVE_URL}</link><br/>The linked production deployment is publicly reachable. Its health endpoint reports demoMode true. This is an honest portfolio demonstration, not a persistent customer data service.", MINT), p("What a production handover should add", "h2"), bullet("Provision an external PostgreSQL service and set DATABASE_URL in Vercel."), bullet("Set a strong API_TOKEN (at least 32 characters) and keep it out of the repository."), bullet("Add user authentication and authorization before sharing across people."), bullet("Set backup, restore, retention, observability, and incident responsibilities."), bullet("Replace the process-local analysis queue with database-backed job claiming before replicas.")]

story += [PageBreak(), p("9. Interview panel answers", "h1"), p("Use these answers as a guide. Keep them conversational and connect each answer to a screen or code path where possible.", "body")]
for q, a in [
    ("1. What problem does ScopeLens solve?", "It makes requirement changes reviewable. It keeps the original source, versions the requirement, records affected artifacts with evidence, and requires a human decision before the work is treated as reviewed."),
    ("2. Why did you choose this project?", "It is small enough to finish well, but it demonstrates product thinking, relational data modelling, API design, concurrency, lifecycle states, testing, accessibility, and deployment boundaries."),
    ("3. Why use a modular monolith instead of microservices?", "There is one owner and one small workflow. A monolith keeps transactions and debugging simple. I separated responsibilities in the code so the application can split by feature only when the product needs that complexity."),
    ("4. How do you avoid two people overwriting the same requirement?", "The client sends the version it read. The server checks it inside the edit transaction. If it differs from the stored version, the API returns HTTP 409 and the user must refresh before editing again."),
    ("5. What is immutable in the data model?", "Requirement versions and analysis snapshots are preserved. The current requirement changes, but the previous body, reason, and version remain available for audit and comparison."),
    ("6. How do you prove a requirement came from the brief?", "A source excerpt must be a literal substring of the saved project brief. This preserves provenance, but it does not claim that the requirement is semantically perfect."),
    ("7. Why does artifact evidence require an exact quote?", "It creates a checkable connection. A reviewer can see the precise part of a test, API description, or screen note that supports the impact. It limits invented citations."),
    ("8. Does optional AI decide what needs changing?", "No. AI is only an explicit suggestion path. Direct user-recorded links are collected deterministically. AI suggestions need schema validation and exact evidence; the user still accepts or dismisses each impact."),
    ("9. What happens when the model provider fails?", "The analysis record becomes failed and preserves direct-link impacts. This protects the evidence-based workflow from an external provider failure."),
    ("10. Why can an old review not be accepted?", "A review belongs to one requirement version. If the requirement changes again, the prior analysis no longer describes the current state, so the server blocks a decision until a new comparison is run."),
]:
    story += qa(q, a)

story += [PageBreak(), p("10. More interview answers and next steps", "h1")]
for q, a in [
    ("11. Why PGlite locally?", "It gives the project a real relational SQL engine without making a reviewer install Docker or a separate database. The same domain rules can use an external PostgreSQL adapter when deployed."),
    ("12. Can the project scale horizontally today?", "No. The initial release has process-local serialization and job coordination. Horizontal scale needs atomic job claims in the database, per-transaction connections, migrations, and distributed concurrency tests."),
    ("13. What security exists today?", "The server uses input validation, parameterized SQL, security headers, same-origin checks, and a strong owner token for hosted mode. It is not a multi-user enterprise security design; roles and identity are explicitly future scope."),
    ("14. Why is the Vercel site a demo instead of a full shared workspace?", "Serverless instances do not share an in-memory database. I exposed the interface with fictional sample data for a safe public portfolio demonstration. A full handover needs external PostgreSQL and private access configuration."),
    ("15. How would you evaluate the AI feature?", "I would build a human-labelled set of changes and expected affected artifacts, including no-impact and adversarial cases. I would report precision, recall, valid-evidence rate, latency, cost, model, prompt version, sample size, and date."),
    ("16. What did testing prove?", "The domain tests prove specific constraints and lifecycle rules; browser checks prove selected user journeys and accessibility states. They do not prove hosted database operations, model quality, or every device and browser."),
    ("17. What would you build next?", "First, durable hosted PostgreSQL and private authentication. Next, database-backed analysis jobs, artifact import integrations, team roles, a labelled AI evaluation harness, and backup/restore verification."),
    ("18. Give a 60-second project introduction.", "ScopeLens is a requirement-change workbench. When a client changes a rule, developers need to know what work might be affected and why. I store the original source, version each requirement, connect APIs, tests, or screens with exact evidence, compare the old and new requirement, and require a human review decision. I chose a modular monolith with React, NestJS, and PostgreSQL concepts because it keeps the core transaction rules understandable. The public Vercel site is a safe fictional demo; a real shared workspace would use external PostgreSQL and authentication."),
]:
    story += qa(q, a)

story += [p("CV-ready description", "h2"), callout("Use after describing the project accurately", "Built ScopeLens, a React/TypeScript and NestJS requirement-change workbench with PostgreSQL-compatible persistence, evidence-linked artifacts, immutable requirement history, and human impact review. Implemented optimistic concurrency, stale-analysis protection, database-backed tests, responsive UI, and a public Vercel demonstration.", MINT), p("Closing note", "h2"), p("The strongest part of this project is not its size. It is the care in its boundaries: it identifies what the system can prove, preserves evidence for decisions, and states clearly what must be added before real user data is trusted to a hosted environment.", "quote")]


document = SimpleDocTemplate(
    str(OUT), pagesize=A4, rightMargin=22 * mm, leftMargin=22 * mm,
    topMargin=18 * mm, bottomMargin=18 * mm, title="ScopeLens Project Handbook", author="Kumuditha Tharinda Liyanage",
)
document.build(story)
print(OUT)
