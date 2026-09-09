export type Project = {
  id: string;
  name: string;
  brief: string;
  sample: boolean;
  requirement_count?: number;
};
export type Requirement = {
  id: string;
  code: string;
  title: string;
  body: string;
  source: string;
  version: number;
  link_count: number;
};
export type Artifact = {
  id: string;
  kind: string;
  title: string;
  description: string;
};
export type Analysis = {
  id: string;
  requirement_id: string;
  requirement_title: string;
  code: string;
  version: number;
  before_text: string;
  after_text: string;
  status: string;
  mode: string;
  error: string | null;
  stale: boolean;
  created_at: string;
};
export type Impact = {
  id: string;
  analysis_id: string;
  artifact_id: string;
  title: string;
  kind: string;
  basis: string;
  explanation: string;
  evidence: string;
  decision: string;
};
export type Snapshot = {
  project: Project;
  requirements: Requirement[];
  artifacts: Artifact[];
  links: {
    id: string;
    requirement_id: string;
    artifact_id: string;
    evidence: string;
  }[];
  analyses: Analysis[];
  impacts: Impact[];
  events: { id: string; action: string; detail: string; created_at: string }[];
  versions: {
    id: string;
    requirement_id: string;
    version: number;
    body: string;
    title: string;
    reason: string;
    created_at: string;
  }[];
  aiEnabled: boolean;
};
