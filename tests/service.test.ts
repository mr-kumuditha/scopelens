import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { openDatabase } from "../server/database";
import { ScopeService } from "../server/service";
import { validateSuggestions } from "../server/ai";
let service: ScopeService;
beforeAll(async () => {
  service = new ScopeService(await openDatabase(true));
  await service.init();
}, 30000);
afterAll(async () => {
  await service.settle();
  await service.db.close();
});
async function fixture() {
  const p = await service.createProject({
    name: "Test project",
    brief: "Customers may cancel before the appointment.",
  });
  const r = await service.addRequirement(p.id, {
    title: "Cancellation",
    body: "Customers may cancel before the appointment.",
    source: "Customers may cancel before the appointment.",
  });
  const a = await service.addArtifact(p.id, {
    kind: "test",
    title: "Boundary test",
    description: "Cancellation is allowed before the appointment starts.",
  });
  await service.link(p.id, r.id, {
    artifactId: a.id,
    evidence: "Cancellation is allowed before the appointment starts.",
  });
  return { p, r, a };
}
describe("Requirement and review invariants", () => {
  it("rejects invented source excerpts without adding a requirement", async () => {
    const { p } = await fixture();
    await expect(
      service.addRequirement(p.id, {
        title: "Fake",
        body: "Invented",
        source: "Not in brief",
      }),
    ).rejects.toThrow("exact excerpt");
    expect((await service.snapshot(p.id)).requirements).toHaveLength(1);
  });
  it("allows only one competing edit at the same expected version", async () => {
    const { p, r } = await fixture();
    const edit = {
      title: "Cancellation",
      body: "Cancel 24 hours before.",
      reason: "Policy changed",
      version: 1,
    };
    const outcomes = await Promise.allSettled([
      service.editRequirement(p.id, r.id, edit),
      service.editRequirement(p.id, r.id, {
        ...edit,
        body: "Cancel 48 hours before.",
      }),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    const s = await service.snapshot(p.id);
    expect(s.versions).toHaveLength(2);
    expect((s.requirements[0] as any).version).toBe(2);
  });
  it("does not permit cross-project artifact links", async () => {
    const { p, r } = await fixture();
    const other = await fixture();
    await expect(
      service.link(p.id, r.id, {
        artifactId: other.a.id,
        evidence: "Cancellation is allowed before the appointment starts.",
      }),
    ).rejects.toThrow("not found");
  });
  it("preserves before/after and locks review after a newer edit", async () => {
    const { p, r } = await fixture();
    await service.editRequirement(p.id, r.id, {
      title: "Cancellation",
      body: "Cancel 24 hours before.",
      reason: "Window changed",
      version: 1,
    });
    const result = await service.analyze(p.id, r.id, {
      version: 2,
      useAI: false,
    });
    await service.settle();
    let s = await service.snapshot(p.id);
    const analysis = s.analyses[0] as any;
    expect(analysis.id).toBe(result.id);
    expect(analysis.before_text).toContain("before the appointment.");
    expect(analysis.after_text).toBe("Cancel 24 hours before.");
    const impact = s.impacts[0] as any;
    await service.decide(p.id, impact.id, { decision: "accepted" });
    await service.editRequirement(p.id, r.id, {
      title: "Cancellation",
      body: "Cancel 48 hours before.",
      reason: "Window changed again",
      version: 2,
    });
    await expect(
      service.decide(p.id, impact.id, { decision: "dismissed" }),
    ).rejects.toThrow("outdated");
    s = await service.snapshot(p.id);
    expect((s.impacts[0] as any).decision).toBe("accepted");
    expect((s.analyses[0] as any).stale).toBe(true);
  });
  it("rejects duplicate links and invalid evidence", async () => {
    const { p, r, a } = await fixture();
    await expect(
      service.link(p.id, r.id, {
        artifactId: a.id,
        evidence: "Cancellation is allowed before the appointment starts.",
      }),
    ).rejects.toThrow("already linked");
    const a2 = await service.addArtifact(p.id, {
      kind: "api",
      title: "Other",
      description: "Server rule",
    });
    await expect(
      service.link(p.id, r.id, { artifactId: a2.id, evidence: "Made up text" }),
    ).rejects.toThrow("exact excerpt");
  });
  it("does not allow analysis of an unchanged first version", async () => {
    const { p, r } = await fixture();
    await expect(service.analyze(p.id, r.id, { version: 1 })).rejects.toThrow(
      "Edit the requirement first",
    );
  });
  it("records an empty analysis without inventing impacts", async () => {
    const p = await service.createProject({
      name: "No links",
      brief: "A small requirement.",
    });
    const r = await service.addRequirement(p.id, {
      title: "Small",
      body: "A small requirement.",
      source: "A small requirement.",
    });
    await service.editRequirement(p.id, r.id, {
      title: "Small",
      body: "A changed requirement.",
      reason: "Changed",
      version: 1,
    });
    await service.analyze(p.id, r.id, { version: 2 });
    await service.settle();
    const s = await service.snapshot(p.id);
    expect(s.impacts).toHaveLength(0);
    expect((s.analyses[0] as any).status).toBe("complete");
  });
  it("rejects stale version requests before scheduling analysis", async () => {
    const { p, r } = await fixture();
    await service.editRequirement(p.id, r.id, {
      title: "Cancellation",
      body: "Cancel 24 hours before.",
      reason: "Change",
      version: 1,
    });
    await expect(service.analyze(p.id, r.id, { version: 1 })).rejects.toThrow(
      "Refresh",
    );
  });
  it("does not leak another project in snapshots", async () => {
    const a = await fixture(),
      b = await fixture();
    const s = await service.snapshot(a.p.id);
    expect(s.requirements.every((r: any) => r.project_id === a.p.id)).toBe(
      true,
    );
    expect(s.artifacts.some((r: any) => r.id === b.a.id)).toBe(false);
  });
});
describe("AI output evidence validation", () => {
  const artifacts = [
    {
      id: "a",
      kind: "test",
      title: "Test",
      description: "Cancellation is allowed before the appointment starts.",
    },
  ];
  it("keeps only supplied artifact IDs with exact source evidence", () => {
    const result = validateSuggestions(
      {
        suggestions: [
          {
            artifactId: "a",
            explanation: "Consider the boundary",
            evidence: "before the appointment starts.",
          },
          {
            artifactId: "fake",
            explanation: "Hallucination",
            evidence: "before the appointment starts.",
          },
        ],
      },
      artifacts,
    );
    expect(result).toHaveLength(1);
  });
  it("rejects invented citations and duplicate suggestions", () => {
    expect(
      validateSuggestions(
        {
          suggestions: [
            {
              artifactId: "a",
              explanation: "Wrong",
              evidence: "invented quotation",
            },
          ],
        },
        artifacts,
      ),
    ).toHaveLength(0);
    expect(
      validateSuggestions(
        {
          suggestions: Array(2).fill({
            artifactId: "a",
            explanation: "Review",
            evidence: "before the appointment starts.",
          }),
        },
        artifacts,
      ),
    ).toHaveLength(1);
  });
  it("rejects malformed provider JSON", () => {
    expect(() =>
      validateSuggestions({ message: "hello" }, artifacts),
    ).toThrow();
  });
});

describe("Reviewed brief drafts", () => {
  it("returns source drafts without saving and excludes already captured excerpts", async () => {
    const p = await service.createProject({
      name: "Drafts",
      brief:
        "Members can invite a colleague. Invitations expire after seven days.",
    });
    const result = await service.drafts(p.id, { useAI: false });
    expect(result.mode).toBe("source");
    expect(result.drafts).toHaveLength(2);
    expect((await service.snapshot(p.id)).requirements).toHaveLength(0);
    await service.addRequirement(p.id, result.drafts[0]);
    expect((await service.drafts(p.id, { useAI: false })).drafts).toHaveLength(
      1,
    );
  });
});
