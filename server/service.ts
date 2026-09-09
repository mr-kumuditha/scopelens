import { randomUUID } from "node:crypto";
import { HttpException } from "@nestjs/common";
import { z } from "zod";
import { type Db, migration } from "./database.js";
import {
  aiConfigured,
  suggestImpacts,
  draftFromBrief,
  extractRequirements,
  type Artifact,
} from "./ai.js";
const id = () => randomUUID();
const text = (max = 10000) => z.string().trim().min(1).max(max);
const fail = (message: string, status = 400): never => {
  throw new HttpException(message, status);
};
export class ScopeService {
  private queue: Promise<unknown> = Promise.resolve();
  private tasks = new Set<Promise<void>>();
  constructor(
    public db: Db,
    public readonly demoMode = false,
  ) {}
  async init() {
    // Each statement is a separate query for compatibility with pg and PGlite.
    for (const sql of migration.split(";").filter((s) => s.trim()))
      await this.db.query(sql);
    await this.db.query(
      "UPDATE analyses SET status='failed', error='Analysis interrupted by a restart. Run a new analysis.' WHERE status IN ('queued','running')",
    );
  }
  async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
  async tx<T>(fn: () => Promise<T>): Promise<T> {
    return this.exclusive(async () => {
      await this.db.query("BEGIN");
      try {
        const result = await fn();
        await this.db.query("COMMIT");
        return result;
      } catch (e) {
        await this.db.query("ROLLBACK");
        throw e;
      }
    });
  }
  async one(sql: string, params: unknown[]) {
    const row = (await this.db.query<any>(sql, params)).rows[0];
    if (!row) return fail("This record was not found.", 404);
    return row;
  }
  async event(project: string, action: string, detail: string) {
    await this.db.query(
      "INSERT INTO events(id,project_id,action,detail) VALUES($1,$2,$3,$4)",
      [id(), project, action, detail],
    );
  }
  async projects() {
    return this.exclusive(
      async () =>
        (
          await this.db.query(
            "SELECT p.*, (SELECT count(*)::int FROM requirements r WHERE r.project_id=p.id) AS requirement_count FROM projects p ORDER BY created_at DESC",
          )
        ).rows,
    );
  }
  async createProject(raw: unknown) {
    const input = z
      .object({
        name: text(100),
        brief: text(20000),
        sample: z.boolean().optional(),
      })
      .parse(raw);
    return this.tx(async () => {
      const projectId = id();
      await this.db.query(
        "INSERT INTO projects(id,name,brief,sample) VALUES($1,$2,$3,$4)",
        [projectId, input.name, input.brief, input.sample || false],
      );
      await this.event(projectId, "Project created", input.name);
      return { id: projectId };
    });
  }
  async snapshot(project: string) {
    return this.exclusive(async () => {
      const p = await this.one("SELECT * FROM projects WHERE id=$1", [project]);
      const requirements = (
        await this.db.query(
          "SELECT r.*, (SELECT count(*)::int FROM links l WHERE l.requirement_id=r.id) AS link_count FROM requirements r WHERE project_id=$1 ORDER BY code",
          [project],
        )
      ).rows;
      const artifacts = (
        await this.db.query(
          "SELECT * FROM artifacts WHERE project_id=$1 ORDER BY kind,title",
          [project],
        )
      ).rows;
      const links = (
        await this.db.query(
          "SELECT l.* FROM links l JOIN requirements r ON r.id=l.requirement_id WHERE r.project_id=$1",
          [project],
        )
      ).rows;
      const analyses = (
        await this.db.query(
          "SELECT a.*, r.title AS requirement_title, r.code, (a.version <> r.version) AS stale FROM analyses a JOIN requirements r ON r.id=a.requirement_id WHERE a.project_id=$1 ORDER BY a.created_at DESC",
          [project],
        )
      ).rows;
      const impacts = (
        await this.db.query(
          "SELECT i.* FROM impacts i JOIN analyses a ON a.id=i.analysis_id WHERE a.project_id=$1",
          [project],
        )
      ).rows;
      const events = (
        await this.db.query(
          "SELECT * FROM events WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100",
          [project],
        )
      ).rows;
      const versions = (
        await this.db.query(
          "SELECT v.* FROM versions v JOIN requirements r ON r.id=v.requirement_id WHERE r.project_id=$1 ORDER BY v.version DESC",
          [project],
        )
      ).rows;
      return {
        project: p,
        requirements,
        artifacts,
        links,
        analyses,
        impacts,
        events,
        versions,
        aiEnabled: aiConfigured(),
        demoMode: this.demoMode,
      };
    });
  }
  async drafts(project: string, raw: unknown) {
    const input = z.object({ useAI: z.boolean().default(false) }).parse(raw);
    const snapshot = await this.snapshot(project);
    if (input.useAI && !aiConfigured())
      fail("Configure AI_API_KEY and AI_MODEL on the server first.");
    const candidates = input.useAI
      ? await extractRequirements(snapshot.project.brief)
      : draftFromBrief(snapshot.project.brief);
    const existing = new Set(snapshot.requirements.map((r: any) => r.source));
    return {
      mode: input.useAI ? "ai" : "source",
      drafts: candidates.filter((d) => !existing.has(d.source)),
    };
  }
  async addRequirement(project: string, raw: unknown) {
    const input = z
      .object({ title: text(150), body: text(), source: text(20000) })
      .parse(raw);
    return this.tx(async () => {
      const p = await this.one("SELECT * FROM projects WHERE id=$1", [project]);
      if (!p.brief.includes(input.source))
        fail("Source evidence must be an exact excerpt from the saved brief.");
      const count = (
        await this.db.query<any>(
          "SELECT count(*)::int AS n FROM requirements WHERE project_id=$1",
          [project],
        )
      ).rows[0].n;
      const reqId = id(),
        code = `REQ-${String(count + 1).padStart(3, "0")}`;
      await this.db.query(
        "INSERT INTO requirements(id,project_id,code,title,body,source) VALUES($1,$2,$3,$4,$5,$6)",
        [reqId, project, code, input.title, input.body, input.source],
      );
      await this.db.query(
        "INSERT INTO versions(id,requirement_id,version,body,title,reason) VALUES($1,$2,1,$3,$4,$5)",
        [id(), reqId, input.body, input.title, "Initial requirement"],
      );
      await this.event(
        project,
        "Requirement added",
        `${code} · ${input.title}`,
      );
      return { id: reqId };
    });
  }
  async editRequirement(project: string, reqId: string, raw: unknown) {
    const input = z
      .object({
        title: text(150),
        body: text(),
        reason: text(500),
        version: z.number().int().positive(),
      })
      .parse(raw);
    return this.tx(async () => {
      const req = await this.one(
        "SELECT * FROM requirements WHERE id=$1 AND project_id=$2 FOR UPDATE",
        [reqId, project],
      );
      if (req.version !== input.version)
        fail(
          "This requirement changed since you opened it. Refresh and review the latest version.",
          409,
        );
      if (req.body === input.body && req.title === input.title)
        fail("Make a change before saving a new version.");
      await this.db.query(
        "UPDATE requirements SET body=$1,title=$2,version=version+1 WHERE id=$3",
        [input.body, input.title, reqId],
      );
      await this.db.query(
        "INSERT INTO versions(id,requirement_id,version,body,title,reason) VALUES($1,$2,$3,$4,$5,$6)",
        [id(), reqId, req.version + 1, input.body, input.title, input.reason],
      );
      await this.event(
        project,
        "Requirement updated",
        `${req.code} · v${req.version} → v${req.version + 1} · ${input.reason}`,
      );
      return { version: req.version + 1 };
    });
  }
  async addArtifact(project: string, raw: unknown) {
    const input = z
      .object({
        kind: z.enum(["api", "test", "screen", "requirement"]),
        title: text(150),
        description: text(4000),
      })
      .parse(raw);
    return this.tx(async () => {
      await this.one("SELECT id FROM projects WHERE id=$1", [project]);
      const key = id();
      await this.db.query(
        "INSERT INTO artifacts(id,project_id,kind,title,description) VALUES($1,$2,$3,$4,$5)",
        [key, project, input.kind, input.title, input.description],
      );
      await this.event(project, "Artifact added", input.title);
      return { id: key };
    });
  }
  async link(project: string, reqId: string, raw: unknown) {
    const input = z
      .object({ artifactId: text(100), evidence: text(4000) })
      .parse(raw);
    return this.tx(async () => {
      const req = await this.one(
        "SELECT * FROM requirements WHERE id=$1 AND project_id=$2",
        [reqId, project],
      );
      const artifact = await this.one(
        "SELECT * FROM artifacts WHERE id=$1 AND project_id=$2",
        [input.artifactId, project],
      );
      if (!artifact.description.includes(input.evidence))
        fail(
          "Evidence must be an exact excerpt from the artifact description.",
        );
      const exists = (
        await this.db.query(
          "SELECT id FROM links WHERE requirement_id=$1 AND artifact_id=$2",
          [reqId, input.artifactId],
        )
      ).rows.length;
      if (exists) fail("This artifact is already linked.", 409);
      await this.db.query(
        "INSERT INTO links(id,requirement_id,artifact_id,evidence) VALUES($1,$2,$3,$4)",
        [id(), reqId, input.artifactId, input.evidence],
      );
      await this.event(
        project,
        "Dependency linked",
        `${req.code} → ${artifact.title}`,
      );
      return { ok: true };
    });
  }
  async analyze(project: string, reqId: string, raw: unknown) {
    const input = z
      .object({
        version: z.number().int().positive(),
        useAI: z.boolean().default(false),
      })
      .parse(raw);
    const analysisId = await this.tx(async () => {
      const req = await this.one(
        "SELECT * FROM requirements WHERE id=$1 AND project_id=$2",
        [reqId, project],
      );
      if (req.version !== input.version)
        fail("Refresh before analyzing the latest version.", 409);
      if (req.version < 2)
        fail(
          "Edit the requirement first. Analysis compares two saved versions.",
        );
      if (input.useAI && !aiConfigured())
        fail("Configure AI_API_KEY and AI_MODEL on the server first.");
      const active = (
        await this.db.query(
          "SELECT id FROM analyses WHERE project_id=$1 AND status IN ('queued','running')",
          [project],
        )
      ).rows;
      if (active.length)
        fail(
          "An analysis is already running. Please wait for it to finish.",
          409,
        );
      const previous = await this.one(
        "SELECT * FROM versions WHERE requirement_id=$1 AND version=$2",
        [reqId, req.version - 1],
      );
      const key = id();
      await this.db.query(
        "INSERT INTO analyses(id,project_id,requirement_id,version,before_text,after_text,status,mode) VALUES($1,$2,$3,$4,$5,$6,'queued',$7)",
        [
          key,
          project,
          reqId,
          req.version,
          previous.body,
          req.body,
          input.useAI ? "ai" : "linked",
        ],
      );
      // Copy explicit links now: later link edits cannot change the recorded evidence.
      const linked = (
        await this.db.query<any>(
          "SELECT a.*,l.evidence FROM links l JOIN artifacts a ON a.id=l.artifact_id WHERE l.requirement_id=$1",
          [reqId],
        )
      ).rows;
      for (const a of linked)
        await this.db.query(
          "INSERT INTO impacts(id,analysis_id,artifact_id,title,kind,basis,explanation,evidence) VALUES($1,$2,$3,$4,$5,'linked',$6,$7)",
          [
            id(),
            key,
            a.id,
            a.title,
            a.kind,
            "This artifact is explicitly linked to the changed requirement. Review whether its behavior or acceptance criteria need updating.",
            a.evidence,
          ],
        );
      await this.event(
        project,
        "Analysis requested",
        `${req.code} · v${req.version} · ${input.useAI ? "linked + AI suggestions" : "linked dependencies"}`,
      );
      return key;
    });
    const task = this.runAnalysis(analysisId).catch(() => {});
    this.tasks.add(task);
    void task.finally(() => this.tasks.delete(task));
    return { id: analysisId };
  }
  async runAnalysis(key: string) {
    let analysis: any;
    try {
      const captured = await this.exclusive(async () => {
        analysis = await this.one("SELECT * FROM analyses WHERE id=$1", [key]);
        await this.db.query(
          "UPDATE analyses SET status='running' WHERE id=$1",
          [key],
        );
        const artifacts = (
          await this.db.query<Artifact>(
            "SELECT * FROM artifacts WHERE project_id=$1 AND id NOT IN (SELECT artifact_id FROM impacts WHERE analysis_id=$2) ORDER BY id LIMIT 30",
            [analysis.project_id, key],
          )
        ).rows;
        return artifacts;
      });
      const suggestions =
        analysis.mode === "ai"
          ? await suggestImpacts(
              analysis.before_text,
              analysis.after_text,
              captured,
            )
          : [];
      await this.tx(async () => {
        for (const suggestion of suggestions) {
          const a = captured.find((a) => a.id === suggestion.artifactId)!;
          await this.db.query(
            "INSERT INTO impacts(id,analysis_id,artifact_id,title,kind,basis,explanation,evidence) VALUES($1,$2,$3,$4,$5,'suggested',$6,$7)",
            [
              id(),
              key,
              a.id,
              a.title,
              a.kind,
              suggestion.explanation,
              suggestion.evidence,
            ],
          );
        }
        await this.db.query(
          "UPDATE analyses SET status='complete' WHERE id=$1",
          [key],
        );
        await this.event(
          analysis.project_id,
          "Analysis completed",
          `${suggestions.length} AI suggestions; explicit links preserved.`,
        );
      });
    } catch (e) {
      await this.tx(async () => {
        await this.db.query(
          "UPDATE analyses SET status='failed',error=$2 WHERE id=$1",
          [
            key,
            e instanceof Error && e.message.startsWith("AI provider")
              ? e.message
              : "Analysis could not complete. Linked impacts are preserved. Check server configuration and retry.",
          ],
        );
        if (analysis)
          await this.event(
            analysis.project_id,
            "Analysis failed",
            "Linked impacts remain available for review.",
          );
      });
    }
  }
  async decide(project: string, impactId: string, raw: unknown) {
    const input = z
      .object({ decision: z.enum(["accepted", "dismissed", "pending"]) })
      .parse(raw);
    return this.tx(async () => {
      const item = await this.one(
        "SELECT i.*,a.version,a.status,r.version AS current_version FROM impacts i JOIN analyses a ON a.id=i.analysis_id JOIN requirements r ON r.id=a.requirement_id WHERE i.id=$1 AND a.project_id=$2",
        [impactId, project],
      );
      if (item.version !== item.current_version)
        fail(
          "This analysis is outdated. Analyze the latest requirement before reviewing.",
          409,
        );
      if (["queued", "running"].includes(item.status))
        fail("Wait until analysis finishes.", 409);
      if (item.decision === input.decision) return { ok: true };
      await this.db.query("UPDATE impacts SET decision=$1 WHERE id=$2", [
        input.decision,
        impactId,
      ]);
      await this.event(
        project,
        "Impact reviewed",
        `${item.title} · ${input.decision}`,
      );
      return { ok: true };
    });
  }
  async settle() {
    await Promise.all([...this.tasks]);
  }
  async seed() {
    const existing = await this.exclusive(
      async () =>
        (
          await this.db.query<any>(
            "SELECT id FROM projects WHERE sample=true LIMIT 1",
          )
        ).rows[0],
    );
    if (existing) return existing;
    const brief =
      "Customers can cancel a booking any time before the appointment. Customers receive a confirmation after booking. Staff can view upcoming appointments. Cancellation controls are shown on the booking details screen.";
    const p = await this.createProject({
      name: "Atelier · Booking experience",
      brief,
      sample: true,
    });
    const r = await this.addRequirement(p.id, {
      title: "Booking cancellation policy",
      body: "Customers can cancel a booking any time before the appointment.",
      source: "Customers can cancel a booking any time before the appointment.",
    });
    await this.addRequirement(p.id, {
      title: "Booking confirmation",
      body: "Customers receive a confirmation after booking.",
      source: "Customers receive a confirmation after booking.",
    });
    await this.addRequirement(p.id, {
      title: "Upcoming appointments",
      body: "Staff can view upcoming appointments.",
      source: "Staff can view upcoming appointments.",
    });
    for (const a of [
      {
        kind: "api",
        title: "Cancel booking endpoint",
        description:
          "POST /bookings/:id/cancel validates that the appointment has not started before allowing cancellation.",
      },
      {
        kind: "test",
        title: "Cancellation boundary tests",
        description:
          "Test that a customer can cancel immediately before an appointment, and cannot cancel after it starts.",
      },
      {
        kind: "screen",
        title: "Booking details screen",
        description:
          "Show the cancellation control on the booking details screen until the appointment starts.",
      },
    ]) {
      const artifact = await this.addArtifact(p.id, a);
      await this.link(p.id, r.id, {
        artifactId: artifact.id,
        evidence: a.description,
      });
    }
    await this.editRequirement(p.id, r.id, {
      title: "Booking cancellation policy",
      body: "Customers can cancel a booking only until 24 hours before the appointment. Show a clear explanation when cancellation is no longer available.",
      reason: "Example client change: introduce a 24-hour cancellation window.",
      version: 1,
    });
    await this.analyze(p.id, r.id, { version: 2, useAI: false });
    await this.settle();
    return p;
  }
}
