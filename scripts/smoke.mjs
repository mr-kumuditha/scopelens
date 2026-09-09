import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import assert from "node:assert/strict";
const temp = await mkdtemp(join(tmpdir(), "scopelens-smoke-"));
const probe = createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const token = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  NODE_ENV: "production",
  HOST: "127.0.0.1",
  PORT: String(port),
  API_TOKEN: token,
  SCOPELENS_DATA_DIR: join(temp, "db"),
  DATABASE_URL: "",
  AI_API_KEY: "",
  AI_MODEL: "",
};
let child;
async function start() {
  child = spawn(process.execPath, ["dist-server/main.js"], {
    env,
    stdio: "pipe",
  });
  let log = "";
  child.stderr.on("data", (b) => {
    log += b.toString();
  });
  for (let n = 0; n < 80; n++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) return;
    } catch {}
    if (child.exitCode !== null) throw new Error(`Server failed: ${log}`);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server startup timed out");
}
async function stop() {
  if (child && child.exitCode === null) {
    const exited = new Promise((r) => child.once("exit", r));
    child.kill("SIGTERM");
    await exited;
  }
}
const base = `http://127.0.0.1:${port}`;
const auth = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
try {
  const denied = spawn(process.execPath, ["dist-server/main.js"], {
    env: { ...env, API_TOKEN: "" },
    stdio: "ignore",
  });
  const code = await new Promise((r) => denied.once("exit", r));
  assert.notEqual(code, 0);
  await start();
  assert.equal((await fetch(`${base}/api/projects`)).status, 401);
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /ScopeLens/);
  assert.ok(page.headers.get("content-security-policy"));
  assert.equal(
    (
      await fetch(`${base}/api/projects`, {
        headers: { ...auth, Origin: "https://unrelated.invalid" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/projects`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ name: "", brief: "" }),
      })
    ).status,
    400,
  );
  const created = await fetch(`${base}/api/projects`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "Production smoke",
      brief: "This is isolated test data.",
    }),
  });
  assert.equal(created.status, 201);
  const project = await created.json();
  assert.equal(
    (await fetch(`${base}/api/projects/missing`, { headers: auth })).status,
    404,
  );
  await stop();
  await start();
  const persisted = await (
    await fetch(`${base}/api/projects`, { headers: auth })
  ).json();
  assert.ok(persisted.some((p) => p.id === project.id));
  console.log(
    "PASS: production startup guard, owner token, static UI, security headers, origin rejection, validation, 404, and database persistence after restart.",
  );
} finally {
  await stop();
  await rm(temp, { recursive: true, force: true });
}
