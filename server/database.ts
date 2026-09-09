import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
export interface Db {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  close(): Promise<void>;
}
export async function openDatabase(memory = false): Promise<Db> {
  if (process.env.DATABASE_URL && !memory) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });
    return {
      query: async <T>(sql: string, params?: unknown[]) => ({
        rows: (await pool.query(sql, params)).rows as T[],
      }),
      close: () => pool.end(),
    };
  }
  const dataPath = process.env.SCOPELENS_DATA_DIR || ".data/scopelens";
  if (!memory) await mkdir(dirname(dataPath), { recursive: true });
  const pg = new PGlite(memory ? undefined : dataPath);
  await pg.waitReady;
  return {
    query: (sql, params) => pg.query(sql, params),
    close: () => pg.close(),
  };
}
export const migration = `
CREATE TABLE IF NOT EXISTS projects (id text PRIMARY KEY, name text NOT NULL, brief text NOT NULL, sample boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS requirements (id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), code text NOT NULL, title text NOT NULL, body text NOT NULL, source text NOT NULL, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,code));
CREATE TABLE IF NOT EXISTS versions (id text PRIMARY KEY, requirement_id text NOT NULL REFERENCES requirements(id), version integer NOT NULL, body text NOT NULL, title text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(requirement_id,version));
CREATE TABLE IF NOT EXISTS artifacts (id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), kind text NOT NULL CHECK(kind IN ('api','test','screen','requirement')), title text NOT NULL, description text NOT NULL);
CREATE TABLE IF NOT EXISTS links (id text PRIMARY KEY, requirement_id text NOT NULL REFERENCES requirements(id), artifact_id text NOT NULL REFERENCES artifacts(id), evidence text NOT NULL, UNIQUE(requirement_id,artifact_id));
CREATE TABLE IF NOT EXISTS analyses (id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), requirement_id text NOT NULL REFERENCES requirements(id), version integer NOT NULL, before_text text NOT NULL, after_text text NOT NULL, status text NOT NULL CHECK(status IN ('queued','running','complete','failed')), mode text NOT NULL, error text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS impacts (id text PRIMARY KEY, analysis_id text NOT NULL REFERENCES analyses(id), artifact_id text NOT NULL REFERENCES artifacts(id), title text NOT NULL, kind text NOT NULL, basis text NOT NULL CHECK(basis IN ('linked','suggested')), explanation text NOT NULL, evidence text NOT NULL, decision text NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','accepted','dismissed')));
CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), action text NOT NULL, detail text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS requirements_project_idx ON requirements(project_id);
CREATE INDEX IF NOT EXISTS analyses_project_idx ON analyses(project_id);
CREATE INDEX IF NOT EXISTS impacts_analysis_idx ON impacts(analysis_id);
CREATE INDEX IF NOT EXISTS events_project_idx ON events(project_id);
`;
