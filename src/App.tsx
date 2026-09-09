import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Layers3,
  GitBranch,
  History,
  BookOpen,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Code2,
  FlaskConical,
  Monitor,
  FileText,
  ScanLine,
  Sparkles,
  Link2,
  Menu,
  Download,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Radio,
  Settings2,
} from "lucide-react";
import type { Impact, Project, Requirement, Snapshot } from "./types";
type Draft = { title: string; body: string; source: string };
type Page = "overview" | "requirements" | "review" | "history" | "guide";
const nav = [
  { id: "overview", label: "Overview", icon: Layers3 },
  { id: "requirements", label: "Requirements", icon: FileText },
  { id: "review", label: "Change review", icon: GitBranch },
  { id: "history", label: "Activity log", icon: History },
] as const;
const kindIcon = (kind: string) =>
  kind === "api"
    ? Code2
    : kind === "test"
      ? FlaskConical
      : kind === "screen"
        ? Monitor
        : FileText;
const date = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
let accessToken = sessionStorage.getItem("scopelens.token") || "";
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <ScanLine size={34} />
      <h3>{title}</h3>
      <p>{body}</p>
      {children}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const old = document.activeElement as HTMLElement;
    return () => old?.focus();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const [projects, setProjects] = useState<Project[]>([]),
    [projectId, setProjectId] = useState(
      localStorage.getItem("scopelens.project") || "",
    ),
    [data, setData] = useState<Snapshot | null>(null),
    [page, setPage] = useState<Page>("overview");
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<string | null>(null),
    [edit, setEdit] = useState<Requirement | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]),
    [draft, setDraft] = useState<Draft | null>(null),
    [draftMode, setDraftMode] = useState("source");
  const currentProject = useRef(projectId);
  currentProject.current = projectId;
  function chooseProject(next: string) {
    currentProject.current = next;
    setProjectId(next);
  }
  async function refresh(p = currentProject.current) {
    const list = await api<Project[]>("/projects");
    setProjects(list);
    if (currentProject.current !== p) return;
    let active = p;
    if (!list.some((x) => x.id === active))
      active = (list.find((p) => p.sample) || list[0])?.id || "";
    if (active !== p) {
      chooseProject(active);
      return;
    }
    if (active) {
      const snap = await api<Snapshot>(`/projects/${active}`);
      if (currentProject.current === active) setData(snap);
    } else setData(null);
  }

  useEffect(() => {
    setLoading(true);
    setData(null);
    setSelected("");
    setError("");
    localStorage.setItem("scopelens.project", projectId);
    refresh(projectId)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);
  useEffect(() => {
    if (!data?.analyses.some((a) => ["queued", "running"].includes(a.status)))
      return;
    const timer = setInterval(
      () => refresh().catch((e) => setError(e.message)),
      1200,
    );
    return () => clearInterval(timer);
  }, [data, projectId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function action(
    fn: () => Promise<void>,
    message = "Saved successfully",
  ) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh(currentProject.current);
      setModal(null);
      setToast(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  const analysis =
    data?.analyses.find((a) => a.id === selected) || data?.analyses[0];
  const impacts =
    data?.impacts.filter((i) => i.analysis_id === analysis?.id) || [];
  const pending = impacts.filter((i) => i.decision === "pending").length;
  const go = (next: Page) => {
    setPage(next);
    setMobile(false);
    setQuery("");
    setFilter("all");
  };
  async function loadDrafts(useAI = false) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ drafts: Draft[]; mode: string }>(
        `/projects/${projectId}/drafts`,
        "POST",
        { useAI },
      );
      setDrafts(result.drafts);
      setDraftMode(result.mode);
      setModal("drafts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drafting failed.");
    } finally {
      setBusy(false);
    }
  }
  const exportReport = () => {
    if (!data) return;
    const report = {
      exportedAt: new Date().toISOString(),
      project: data.project,
      requirements: data.requirements,
      artifacts: data.artifacts,
      links: data.links,
      analyses: data.analyses,
      impacts: data.impacts,
      versions: data.versions,
      events: data.events,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "scopelens-report.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Project report exported");
  };
  const openEdit = (r: Requirement) => {
    setEdit(r);
    setModal("edit");
  };
  const analyze = (r: Requirement, useAI = false) =>
    action(async () => {
      const result = await api<{ id: string }>(
        `/projects/${projectId}/requirements/${r.id}/analyses`,
        "POST",
        { version: r.version, useAI },
      );
      setSelected(result.id);
      go("review");
    }, "Analysis started");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const value = (name: string) => String(f.get(name) || "");
    await action(async () => {
      if (modal === "project") {
        const p = await api<{ id: string }>("/projects", "POST", {
          name: value("name"),
          brief: value("brief"),
        });
        chooseProject(p.id);
        go("requirements");
      }
      if (modal === "requirement")
        await api(`/projects/${projectId}/requirements`, "POST", {
          title: value("title"),
          body: value("body"),
          source: value("source"),
        });
      if (modal === "edit" && edit)
        await api(`/projects/${projectId}/requirements/${edit.id}`, "PATCH", {
          title: value("title"),
          body: value("body"),
          reason: value("reason"),
          version: edit.version,
        });
      if (modal === "artifact")
        await api(`/projects/${projectId}/artifacts`, "POST", {
          kind: value("kind"),
          title: value("title"),
          description: value("description"),
        });
      if (modal === "link")
        await api(
          `/projects/${projectId}/requirements/${value("requirement")}/links`,
          "POST",
          { artifactId: value("artifact"), evidence: value("evidence") },
        );
      if (modal === "access") {
        accessToken = value("token");
        sessionStorage.setItem("scopelens.token", accessToken);
        await api("/projects");
      }
    });
  }
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go("overview");
          }}
        >
          <span className="brand-mark">
            <ScanLine size={25} />
          </span>
          scopelens<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">W</span>
          <div>
            <strong>My workspace</strong>
            <small>Personal workspace</small>
          </div>
          <button
            aria-label="Workspace access"
            className="icon-button"
            onClick={() => setModal("access")}
          >
            <Settings2 size={16} />
          </button>
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => go(n.id)}
            >
              <n.icon size={18} />
              {n.label}
              {n.id === "review" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-orbit">
            <GitBranch size={22} />
          </span>
          <strong>Clarity before code.</strong>
          <p>Connect the dots between a requirement and what comes next.</p>
          <button onClick={() => go("guide")}>
            Explore the workflow <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "guide" ? "active" : ""}`}
            onClick={() => go("guide")}
          >
            <BookOpen size={18} />
            Documentation
            <ArrowUpRight size={14} />
          </button>
          <button className="nav-item" onClick={() => setModal("about")}>
            <CircleHelp size={18} />
            About ScopeLens
          </button>
          <div className="profile">
            <span>ME</span>
            <div>
              <strong>Local workspace</strong>
              <small>ScopeLens · v0.1</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {page === "guide"
                ? "Documentation"
                : nav.find((n) => n.id === page)?.label}
            </strong>
          </div>
          <div className="top-actions">
            <span className="local-status">
              <span className="online-dot" />
              Local-first workspace
            </span>
            <button
              className="icon-button"
              aria-label="Refresh workspace"
              disabled={busy}
              onClick={() => action(() => refresh(), "Workspace refreshed")}
            >
              <RefreshCw size={16} />
            </button>
            <button
              className="avatar"
              aria-label="Open workspace access"
              onClick={() => setModal("access")}
            >
              ME
            </button>
          </div>
        </header>
        <main id="main">
          <div className="project-line">
            <div className="project-select">
              <span className="project-symbol">
                <Layers3 size={16} />
              </span>
              <select
                aria-label="Current project"
                value={projectId}
                onChange={(e) => chooseProject(e.target.value)}
              >
                {!projects.length && (
                  <option value="">Your first project</option>
                )}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
              {data?.project.sample && <Badge>EXAMPLE PROJECT</Badge>}
            </div>
            <button className="text-button" onClick={() => setModal("project")}>
              <Plus size={15} />
              New project
            </button>
          </div>
          {error && (
            <div role="alert" className="alert error">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button
                className="text-button"
                onClick={() => setModal("access")}
              >
                Connection settings
              </button>
              <button
                aria-label="Dismiss error"
                className="icon-button"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="empty">
              <RefreshCw className="spin" />
              <p>Opening your workspace…</p>
            </div>
          ) : page === "guide" ? (
            <Guide />
          ) : !data ? (
            <div className="welcome">
              <div className="eyebrow">
                <span /> CHANGE WITH CLARITY
              </div>
              <h1>
                Big picture.
                <br />
                <em>Every little change.</em>
              </h1>
              <p>
                Turn requirements into a connected story. See what a change
                touches, review the evidence, and move forward with confidence.
              </p>
              <div className="button-row">
                <button
                  className="button primary"
                  onClick={() => setModal("project")}
                >
                  <Plus size={17} />
                  Create your first project
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      const p = await api<{ id: string }>("/sample", "POST");
                      chooseProject(p.id);
                    }, "Example project ready")
                  }
                >
                  Explore example <ArrowRight size={17} />
                </button>
              </div>
              <div className="welcome-map">
                <span>
                  <FileText />
                  Requirement
                </span>
                <i />
                <span>
                  <GitBranch />
                  Connected impact
                </span>
                <i />
                <span>
                  <ShieldCheck />
                  Human review
                </span>
              </div>
              <small>
                The example uses fictional booking requirements, explicitly
                labelled for demonstration.
              </small>
            </div>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />{" "}
                    {page === "overview"
                      ? "THE BIG PICTURE"
                      : page === "requirements"
                        ? "YOUR SOURCE OF TRUTH"
                        : page === "review"
                          ? "EVIDENCE BEFORE ACTION"
                          : "A TRACEABLE WORKSPACE"}
                  </div>
                  <h1>
                    {page === "overview" ? (
                      <>
                        Every change has a <em>ripple.</em>
                      </>
                    ) : page === "requirements" ? (
                      "A clear starting point."
                    ) : page === "review" ? (
                      "Change, with confidence."
                    ) : (
                      "The story behind the work."
                    )}
                  </h1>
                  <p>
                    {page === "overview"
                      ? "Understand what connects. Review what changes. Keep everyone on the same page."
                      : page === "requirements"
                        ? "Small, precise requirements. Connected to the work they shape."
                        : page === "review"
                          ? "Follow the evidence from a changed requirement to its connected work."
                          : "Every version, connection, and review decision, in one place."}
                  </p>
                </div>
                <button className="button" onClick={exportReport}>
                  <Download size={16} />
                  Export report
                </button>
              </section>
              {page === "overview" && (
                <>
                  <div className="stats-grid">
                    {[
                      {
                        label: "Requirements",
                        value: data.requirements.length,
                        detail: "Documented and versioned",
                        icon: FileText,
                      },
                      {
                        label: "Connections",
                        value: data.links.length,
                        detail: "Explicit evidence links",
                        icon: Link2,
                      },
                      {
                        label: "Change analyses",
                        value: data.analyses.length,
                        detail: "Saved version snapshots",
                        icon: GitBranch,
                      },
                      {
                        label: "To review",
                        value: pending,
                        detail: analysis
                          ? "In the latest selected analysis"
                          : "Your inbox is clear",
                        icon: ScanLine,
                      },
                    ].map((s) => (
                      <div className="stat" key={s.label}>
                        <div>
                          <span>{s.label}</span>
                          <s.icon size={17} />
                        </div>
                        <strong>{s.value.toString().padStart(2, "0")}</strong>
                        <small>{s.detail}</small>
                      </div>
                    ))}
                  </div>
                  <div className="overview-grid">
                    <section className="panel feature-panel">
                      <div className="panel-heading">
                        <div>
                          <span className="eyebrow">LATEST CHANGE</span>
                          <h2>
                            {analysis
                              ? analysis.requirement_title
                              : "A little context goes a long way."}
                          </h2>
                        </div>
                        {analysis && (
                          <Badge tone={analysis.stale ? "amber" : "green"}>
                            {analysis.stale ? "Outdated" : analysis.status}
                          </Badge>
                        )}
                      </div>
                      {analysis ? (
                        <>
                          <div className="change-meta">
                            <span className="mono">{analysis.code}</span>
                            <span>
                              Version {analysis.version - 1}{" "}
                              <ArrowRight size={12} /> {analysis.version}
                            </span>
                            <span>{date(analysis.created_at)}</span>
                          </div>
                          <div className="preview-change">
                            <span className="diff-line">−</span>
                            <p>{analysis.before_text}</p>
                          </div>
                          <div className="preview-change added">
                            <span className="diff-line">+</span>
                            <p>{analysis.after_text}</p>
                          </div>
                          <div className="panel-footer">
                            <span>
                              <Link2 size={15} />
                              {impacts.length} connected items to consider
                            </span>
                            <button
                              className="button primary"
                              onClick={() => go("review")}
                            >
                              Review impact <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <Empty
                          title="Your first change starts here"
                          body="Add a requirement, link its dependencies, then save a new version to compare what changed."
                        >
                          <button
                            className="button primary"
                            onClick={() => go("requirements")}
                          >
                            Open requirements <ArrowRight size={16} />
                          </button>
                        </Empty>
                      )}
                    </section>
                    <section className="panel map-panel">
                      <div className="panel-heading">
                        <div>
                          <span className="eyebrow">CONNECTED CONTEXT</span>
                          <h2>See the ripple</h2>
                        </div>
                        <GitBranch size={18} />
                      </div>
                      <DependencyMap
                        data={data}
                        requirementId={
                          analysis?.requirement_id || data.requirements[0]?.id
                        }
                      />
                      <div className="map-legend">
                        <span>
                          <i className="green-dot" />
                          Explicit connection
                        </span>
                        <span>Based on saved links</span>
                      </div>
                    </section>
                  </div>
                  <div className="section-header">
                    <h2>
                      Requirements at a glance{" "}
                      <span>{data.requirements.length}</span>
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => go("requirements")}
                    >
                      View all requirements <ArrowRight size={16} />
                    </button>
                  </div>
                  <RequirementTable
                    requirements={data.requirements.slice(0, 4)}
                    onEdit={openEdit}
                    onAnalyze={analyze}
                    busy={busy}
                  />
                  <div className="trust-strip">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Evidence you can follow.</strong>
                      <span>
                        {" "}
                        Linked dependencies are explicit. AI suggestions always
                        need your review.
                      </span>
                    </div>
                    <button className="text-button" onClick={() => go("guide")}>
                      How it works <ArrowUpRight size={14} />
                    </button>
                  </div>
                </>
              )}
              {page === "requirements" && (
                <>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label="Search requirements"
                        placeholder="Search requirements…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <div className="button-row">
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => loadDrafts()}
                      >
                        <ScanLine size={16} />
                        Draft from brief
                      </button>
                      <button
                        className="button primary"
                        onClick={() => {
                          setDraft(null);
                          setModal("requirement");
                        }}
                      >
                        <Plus size={16} />
                        Add requirement
                      </button>
                    </div>
                  </div>
                  <RequirementTable
                    requirements={data.requirements.filter((r) =>
                      `${r.code} ${r.title} ${r.body}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )}
                    onEdit={openEdit}
                    onAnalyze={analyze}
                    busy={busy}
                  />
                  <div className="two-columns">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <span className="eyebrow">ORIGINAL CONTEXT</span>
                          <h2>Project brief</h2>
                        </div>
                        <BookOpen size={18} />
                      </div>
                      <p className="brief">{data.project.brief}</p>
                      <p className="muted panel-note">
                        Copy an exact excerpt into a requirement’s source field
                        to preserve its origin. Generate source-based drafts,
                        then review each one before saving.
                      </p>
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <span className="eyebrow">DEPENDENCIES</span>
                          <h2>Connected work</h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setModal("artifact")}
                        >
                          <Plus size={15} />
                          Add artifact
                        </button>
                      </div>
                      {data.artifacts.length ? (
                        data.artifacts.map((a) => {
                          const Icon = kindIcon(a.kind);
                          return (
                            <div className="artifact-row" key={a.id}>
                              <span className={`kind-icon ${a.kind}`}>
                                <Icon size={17} />
                              </span>
                              <div>
                                <strong>{a.title}</strong>
                                <small>
                                  {a.kind} ·{" "}
                                  {
                                    data.links.filter(
                                      (l) => l.artifact_id === a.id,
                                    ).length
                                  }{" "}
                                  links
                                </small>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="brief muted">
                          Add API descriptions, test cases, or screen
                          requirements, then connect them to a requirement.
                        </p>
                      )}
                      <div className="panel-footer">
                        <span>{data.links.length} evidence links</span>
                        <button
                          className="button"
                          disabled={
                            !data.artifacts.length || !data.requirements.length
                          }
                          onClick={() => setModal("link")}
                        >
                          <Link2 size={15} />
                          Connect artifact
                        </button>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {page === "review" &&
                (analysis ? (
                  <>
                    <div className="analysis-selector">
                      <label>
                        Analysis
                        <select
                          aria-label="Select analysis"
                          value={analysis.id}
                          onChange={(e) => {
                            setSelected(e.target.value);
                            setFilter("all");
                          }}
                        >
                          {data.analyses.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} · v{a.version} · {date(a.created_at)}
                              {a.stale ? " · outdated" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Badge tone={analysis.stale ? "amber" : "green"}>
                        {analysis.stale ? "Outdated snapshot" : analysis.status}
                      </Badge>
                      {data.aiEnabled && (
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => {
                            const r = data.requirements.find(
                              (r) => r.id === analysis.requirement_id,
                            );
                            if (r) analyze(r, true);
                          }}
                        >
                          <Sparkles size={15} />
                          Analyze with AI
                        </button>
                      )}
                    </div>
                    {analysis.stale && (
                      <div className="alert">
                        <AlertTriangle size={18} />
                        This requirement has a newer version. Review decisions
                        are locked until you run a new analysis.
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            const r = data.requirements.find(
                              (r) => r.id === analysis.requirement_id,
                            );
                            if (r) analyze(r);
                          }}
                        >
                          Analyze latest <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                    {analysis.error && (
                      <div className="alert error" role="alert">
                        {analysis.error}
                      </div>
                    )}
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <span className="mono">{analysis.code}</span>
                          <h2>{analysis.requirement_title}</h2>
                        </div>
                        <span className="version-flow">
                          v{analysis.version - 1}
                          <ArrowRight size={15} />v{analysis.version}
                        </span>
                      </div>
                      <div className="diff-grid">
                        <div className="diff-before">
                          <span className="eyebrow">
                            − PREVIOUS REQUIREMENT
                          </span>
                          <p>{analysis.before_text}</p>
                        </div>
                        <div className="diff-after">
                          <span className="eyebrow">+ UPDATED REQUIREMENT</span>
                          <p>{analysis.after_text}</p>
                        </div>
                      </div>
                    </section>
                    <div className="section-header">
                      <div>
                        <h2>
                          Impact review <span>{impacts.length}</span>
                        </h2>
                        <p className="muted">
                          Accept means “needs attention.” It does not update the
                          artifact.
                        </p>
                      </div>
                      <div className="segmented">
                        {["all", "pending", "accepted", "dismissed"].map(
                          (f) => (
                            <button
                              key={f}
                              className={filter === f ? "selected" : ""}
                              onClick={() => setFilter(f)}
                            >
                              {f[0].toUpperCase() + f.slice(1)}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="impact-layout">
                      <div className="impact-list">
                        {impacts
                          .filter(
                            (i) => filter === "all" || i.decision === filter,
                          )
                          .map((i) => (
                            <ImpactCard
                              key={i.id}
                              impact={i}
                              disabled={
                                busy ||
                                analysis.stale ||
                                ["queued", "running"].includes(analysis.status)
                              }
                              decide={(decision) =>
                                action(async () => {
                                  await api(
                                    `/projects/${projectId}/impacts/${i.id}`,
                                    "PATCH",
                                    { decision },
                                  );
                                }, "Review decision saved")
                              }
                            />
                          ))}
                        {!impacts.filter(
                          (i) => filter === "all" || i.decision === filter,
                        ).length && (
                          <Empty
                            title={
                              analysis.status === "running"
                                ? "Following the connections…"
                                : "Nothing in this view"
                            }
                            body={
                              impacts.length
                                ? "Try another review filter."
                                : "No linked impacts found. Add evidence links in Requirements. An empty result does not prove that nothing is affected."
                            }
                          />
                        )}
                      </div>
                      <aside className="review-note">
                        <span className="note-icon">
                          <ShieldCheck size={22} />
                        </span>
                        <h3>You make the call.</h3>
                        <p>
                          ScopeLens brings the context. You decide what needs
                          attention.
                        </p>
                        <hr />
                        <div>
                          <Link2 size={16} />
                          <strong>Linked dependency</strong>
                        </div>
                        <p>
                          A relationship you explicitly saved. Review its
                          relevance to this change.
                        </p>
                        <div>
                          <Sparkles size={16} />
                          <strong>AI suggestion</strong>
                        </div>
                        <p>
                          A possible connection with a source excerpt. It is
                          never auto-approved.
                        </p>
                        <span className="mode-label">
                          <Radio size={13} />
                          {analysis.mode === "ai"
                            ? "AI-assisted analysis"
                            : "Linked analysis · no AI used"}
                        </span>
                      </aside>
                    </div>
                  </>
                ) : (
                  <Empty
                    title="Make your first change"
                    body="Save a new requirement version, then select Analyze to see connected impacts."
                  >
                    <button
                      className="button primary"
                      onClick={() => go("requirements")}
                    >
                      Open requirements <ArrowRight size={16} />
                    </button>
                  </Empty>
                ))}
              {page === "history" && (
                <div className="history-layout">
                  <section className="panel timeline">
                    <div className="panel-heading">
                      <h2>Workspace activity</h2>
                      <Badge>{data.events.length} events</Badge>
                    </div>
                    {data.events.map((e) => (
                      <div className="timeline-item" key={e.id}>
                        <span className="timeline-dot" />
                        <div>
                          <strong>{e.action}</strong>
                          <p>{e.detail}</p>
                          <time>{date(e.created_at)}</time>
                        </div>
                      </div>
                    ))}
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Requirement versions</h2>
                      <History size={18} />
                    </div>
                    {data.versions.map((v) => (
                      <div className="version-item" key={v.id}>
                        <Badge>v{v.version}</Badge>
                        <strong>{v.title}</strong>
                        <p>{v.body}</p>
                        <small>{v.reason}</small>
                      </div>
                    ))}
                  </section>
                </div>
              )}
            </>
          )}
          <footer>
            <span>
              ScopeLens <span className="footer-dot">/</span> Clarity before
              code.
            </span>
            <span>
              Built for thoughtful teams <span className="footer-dot">✳</span>
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "drafts"
              ? "Review requirement drafts"
              : modal === "project"
                ? "Start a new project"
                : modal === "requirement"
                  ? "Add a requirement"
                  : modal === "edit"
                    ? "Save a new version"
                    : modal === "artifact"
                      ? "Add connected work"
                      : modal === "link"
                        ? "Connect an artifact"
                        : modal === "access"
                          ? "Workspace connection"
                          : "Designed for clarity"
          }
          onClose={() => {
            if (!busy) {
              setModal(null);
              setError("");
            }
          }}
        >
          {modal === "drafts" ? (
            <div className="modal-body">
              <p>
                {draftMode === "ai"
                  ? "AI-proposed drafts with validated source excerpts. Check meaning before saving."
                  : "Source-based drafts split your brief into sentences. These are starting points, not AI interpretation."}
              </p>
              {data?.aiEnabled && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => loadDrafts(true)}
                >
                  <Sparkles size={15} />
                  Generate AI drafts
                </button>
              )}
              {drafts.length ? (
                drafts.map((d, index) => (
                  <article className="draft-card" key={index}>
                    <h3>{d.title}</h3>
                    <p>{d.body}</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setDraft(d);
                        setModal("requirement");
                      }}
                    >
                      Review & edit <ArrowRight size={15} />
                    </button>
                  </article>
                ))
              ) : (
                <p className="muted">
                  No new drafts found. Add a requirement manually or check your
                  brief.
                </p>
              )}
              <p className="field-help">
                Nothing is saved until you review a draft and press Save.
              </p>
            </div>
          ) : modal === "about" ? (
            <div className="modal-body">
              <div className="brand modal-brand">
                <ScanLine />
                scopelens.
              </div>
              <p>
                A focused workbench for understanding requirement changes.
                Version your decisions, connect the evidence, and keep human
                judgment at the center.
              </p>
              <p className="muted">
                Version 0.1 · Single-owner workspace. Example content is
                fictional. No AI provider is called unless configured and
                explicitly selected.
              </p>
              <button
                className="button primary"
                onClick={() => {
                  setModal(null);
                  go("guide");
                }}
              >
                Read the documentation <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="modal-body">
              {modal === "project" && (
                <>
                  <label>
                    Project name
                    <input
                      name="name"
                      required
                      maxLength={100}
                      placeholder="e.g. Studio booking experience"
                      autoFocus
                    />
                  </label>
                  <label>
                    Project brief
                    <textarea
                      name="brief"
                      required
                      maxLength={20000}
                      rows={7}
                      placeholder="Describe the product and its agreed requirements. This becomes the source of evidence for your requirement cards."
                    />
                  </label>
                  <p className="field-help">
                    Start with a small, specific brief. You can add reviewed
                    requirement cards next.
                  </p>
                </>
              )}
              {(modal === "requirement" || modal === "edit") && (
                <>
                  <label>
                    Requirement title
                    <input
                      name="title"
                      required
                      maxLength={150}
                      defaultValue={
                        modal === "edit" ? edit?.title : draft?.title || ""
                      }
                      placeholder="e.g. Booking cancellation policy"
                      autoFocus
                    />
                  </label>
                  <label>
                    Requirement
                    <textarea
                      name="body"
                      required
                      maxLength={10000}
                      rows={5}
                      defaultValue={
                        modal === "edit" ? edit?.body : draft?.body || ""
                      }
                      placeholder="Describe the behavior precisely, including boundaries."
                    />
                  </label>
                  {modal === "requirement" ? (
                    <>
                      <label>
                        Exact source excerpt
                        <textarea
                          name="source"
                          defaultValue={draft?.source || ""}
                          required
                          maxLength={20000}
                          rows={3}
                          placeholder="Copy the relevant text from your project brief."
                        />
                      </label>
                      <details>
                        <summary>View project brief</summary>
                        <p className="brief">{data?.project.brief}</p>
                      </details>
                    </>
                  ) : (
                    <>
                      <label>
                        Reason for the change
                        <input
                          name="reason"
                          required
                          maxLength={500}
                          placeholder="What changed, and why?"
                        />
                      </label>
                      <p className="field-help">
                        Version {edit?.version} will be preserved. Existing
                        analyses will be marked outdated.
                      </p>
                    </>
                  )}
                </>
              )}
              {modal === "artifact" && (
                <>
                  <label>
                    Artifact type
                    <select name="kind">
                      <option value="api">API description</option>
                      <option value="test">Test case</option>
                      <option value="screen">Screen behavior</option>
                      <option value="requirement">Related requirement</option>
                    </select>
                  </label>
                  <label>
                    Title
                    <input
                      name="title"
                      required
                      maxLength={150}
                      placeholder="e.g. Cancellation boundary test"
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      name="description"
                      required
                      maxLength={4000}
                      rows={5}
                      placeholder="Describe the actual behavior. This text is used as review evidence."
                    />
                  </label>
                </>
              )}
              {modal === "link" && (
                <>
                  <label>
                    Requirement
                    <select name="requirement">
                      {data?.requirements.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code} · {r.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Artifact
                    <select
                      name="artifact"
                      onChange={(e) => {
                        const el = e.currentTarget.form?.elements.namedItem(
                          "evidence",
                        ) as HTMLTextAreaElement;
                        el.value =
                          data?.artifacts.find((a) => a.id === e.target.value)
                            ?.description || "";
                      }}
                    >
                      {data?.artifacts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Evidence excerpt
                    <textarea
                      name="evidence"
                      required
                      rows={4}
                      defaultValue={data?.artifacts[0]?.description}
                    />
                  </label>
                  <p className="field-help">
                    Use an exact excerpt from the artifact’s description. A link
                    records a relationship, not proof that a change is required.
                  </p>
                </>
              )}
              {modal === "access" && (
                <>
                  <p>
                    Local development connects automatically. If your server
                    requires an access token, enter it here. It stays in this
                    browser tab’s session storage.
                  </p>
                  <label>
                    Workspace access token
                    <input
                      name="token"
                      type="password"
                      autoComplete="off"
                      defaultValue={accessToken}
                    />
                  </label>
                  <p className="field-help">
                    The server owner configures API_TOKEN. This is a
                    single-owner access gate, not a multi-user login.
                  </p>
                </>
              )}
              {error && (
                <div className="alert error" role="alert">
                  {error}
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    setModal(null);
                    setError("");
                  }}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Saving…
                    </>
                  ) : modal === "access" ? (
                    "Connect workspace"
                  ) : modal === "edit" ? (
                    "Save new version"
                  ) : modal === "project" ? (
                    "Create project"
                  ) : (
                    "Save"
                  )}
                  {!busy && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
function RequirementTable({
  requirements,
  onEdit,
  onAnalyze,
  busy,
}: {
  requirements: Requirement[];
  onEdit: (r: Requirement) => void;
  onAnalyze: (r: Requirement) => void;
  busy: boolean;
}) {
  return (
    <div className="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th>REQUIREMENT</th>
            <th>VERSION</th>
            <th>CONNECTIONS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="mono">{r.code}</span>
                <button className="requirement-title" onClick={() => onEdit(r)}>
                  {r.title}
                  <ArrowUpRight size={14} />
                </button>
              </td>
              <td>
                <Badge>v{r.version}</Badge>
              </td>
              <td>
                <span className="connection-count">
                  <Link2 size={14} />
                  {r.link_count} linked
                </span>
              </td>
              <td>
                <div className="row-actions">
                  <button className="text-button" onClick={() => onEdit(r)}>
                    Edit
                  </button>
                  <button
                    className="text-button analyze-button"
                    disabled={busy || r.version < 2}
                    title={
                      r.version < 2
                        ? "Save a new version before analyzing"
                        : "Analyze latest change"
                    }
                    onClick={() => onAnalyze(r)}
                  >
                    Analyze <ArrowRight size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!requirements.length && (
        <Empty
          title="No requirements yet"
          body="Add a requirement from your brief to start connecting the dots."
        />
      )}
    </div>
  );
}
function DependencyMap({
  data,
  requirementId,
}: {
  data: Snapshot;
  requirementId?: string;
}) {
  const req = data.requirements.find((r) => r.id === requirementId);
  const items = data.links
    .filter((l) => l.requirement_id === requirementId)
    .map((l) => data.artifacts.find((a) => a.id === l.artifact_id)!)
    .filter(Boolean)
    .slice(0, 3);
  return (
    <div className="dependency-map">
      <div className="map-root">
        <span>
          <FileText size={14} />
          {req?.code || "REQUIREMENT"}
        </span>
        <strong>{req?.title || "Your starting point"}</strong>
      </div>
      <div className="map-stem" />
      <div className="map-children">
        {items.length ? (
          items.map((a) => {
            const Icon = kindIcon(a.kind);
            return (
              <div className="map-node" key={a.id}>
                <span className={`kind-icon ${a.kind}`}>
                  <Icon size={18} />
                </span>
                <strong>
                  {a.kind === "api"
                    ? "API"
                    : a.kind === "test"
                      ? "Tests"
                      : a.kind === "screen"
                        ? "Screen"
                        : "Requirement"}
                </strong>
                <small>{a.title}</small>
              </div>
            );
          })
        ) : (
          <p className="muted">Add a dependency to grow the picture.</p>
        )}
      </div>
    </div>
  );
}
function ImpactCard({
  impact: i,
  disabled,
  decide,
}: {
  impact: Impact;
  disabled: boolean;
  decide: (decision: string) => void;
}) {
  const Icon = kindIcon(i.kind);
  return (
    <article
      className={`panel impact-card ${i.decision !== "pending" ? "resolved" : ""}`}
    >
      <div className="impact-heading">
        <span className={`kind-icon ${i.kind}`}>
          <Icon size={19} />
        </span>
        <div>
          <span className="eyebrow">{i.kind.toUpperCase()}</span>
          <h3>{i.title}</h3>
        </div>
        <Badge tone={i.basis === "linked" ? "green" : "amber"}>
          {i.basis === "linked" ? <Link2 size={12} /> : <Sparkles size={12} />}{" "}
          {i.basis === "linked" ? "Linked dependency" : "AI suggestion"}
        </Badge>
      </div>
      <p>{i.explanation}</p>
      <div className="evidence">
        <span>
          <BookOpen size={13} />
          SOURCE EVIDENCE
        </span>
        <blockquote>“{i.evidence}”</blockquote>
      </div>
      <div className="impact-footer">
        <span className={`decision ${i.decision}`}>
          {i.decision === "pending" ? (
            <>
              <span className="small-dot" />
              Awaiting review
            </>
          ) : (
            <>
              <Check size={14} />
              {i.decision === "accepted"
                ? "Accepted · needs attention"
                : "Dismissed"}
            </>
          )}
        </span>
        <div>
          {i.decision === "pending" ? (
            <>
              <button
                className="button small"
                disabled={disabled}
                onClick={() => decide("dismissed")}
              >
                <X size={14} />
                Dismiss
              </button>
              <button
                className="button primary small"
                disabled={disabled}
                onClick={() => decide("accepted")}
              >
                <Check size={14} />
                Accept impact
              </button>
            </>
          ) : (
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => decide("pending")}
            >
              Reopen review
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
function Guide() {
  return (
    <div className="guide">
      <div className="eyebrow">
        <span /> THE SCOPELENS FIELD GUIDE
      </div>
      <h1>
        Less guessing.
        <br />
        <em>More understanding.</em>
      </h1>
      <p className="guide-lead">
        A practical guide to tracing change, preserving context, and making
        decisions you can explain.
      </p>
      <div className="guide-steps">
        {[
          {
            n: "01",
            title: "Capture what was agreed",
            body: "Create a project with a text brief. Generate drafts or add precise requirement cards, preserving an exact source excerpt in each one. Source-based drafts split the brief into sentences; optional AI drafts can refine the wording. Review every draft before saving.",
          },
          {
            n: "02",
            title: "Connect the actual work",
            body: "Add API descriptions, acceptance tests, and screen behaviors as artifacts. Link them to requirements with an exact excerpt from the artifact. These are explicit, human-created relationships.",
          },
          {
            n: "03",
            title: "Make a considered change",
            body: "Edit a requirement and explain why. ScopeLens saves a new version and preserves the old one. Select Analyze to compare the latest version with the previous one.",
          },
          {
            n: "04",
            title: "Follow the evidence",
            body: "Review linked impacts one at a time. Accept means the artifact needs attention; dismiss means you considered it and decided otherwise. Neither action modifies your code or artifact.",
          },
        ].map((s) => (
          <article className="panel guide-step" key={s.n}>
            <span>{s.n}</span>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </article>
        ))}
      </div>
      <section className="panel guide-detail">
        <h2>What the engine knows</h2>
        <p>
          Linked analysis follows direct relationships you have saved. It does
          not inspect a repository or infer transitive code dependencies. A
          result with zero impacts means no linked items were found, not that
          the change is safe.
        </p>
        <h2>Optional AI, visible boundaries</h2>
        <p>
          With a hosted model configured, “Analyze with AI” sends the changed
          requirement and up to 30 unlinked artifact descriptions to your
          provider. Suggested artifact IDs and quoted evidence are validated. An
          exact quotation establishes source origin; it does not prove the
          model’s reasoning is correct.
        </p>
        <h2>Versions are the foundation</h2>
        <p>
          Every analysis records its requirement version. If the requirement
          changes, previous analyses become outdated and cannot receive review
          decisions. Concurrent edits are rejected so an older browser view
          cannot silently overwrite newer work.
        </p>
        <h2>Your data and access</h2>
        <p>
          The default database lives locally in .data/scopelens. Reports export
          as JSON. This release supports one owner; it has no team roles or
          invitations. Remote hosting requires an access token and HTTPS. AI
          keys stay on the server.
        </p>
        <h2>Developer documentation</h2>
        <p>
          The project’s docs folder includes architecture, API examples, the
          design system, testing guidance, deployment steps, decision records,
          and a roadmap. Start with README.md for the local setup.
        </p>
      </section>
    </div>
  );
}
