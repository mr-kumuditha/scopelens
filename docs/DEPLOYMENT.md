# Deployment and operations

## Local development

Use Node 24, `npm ci`, then `npm run dev`. Open `http://127.0.0.1:5173`. The default host is loopback and the database is embedded. Do not expose a development server to the public internet.

## Built application

```sh
npm run build
npm start
```

The compiled server serves the built frontend and `/api` on port 4000. For local testing, leave HOST at its default. For remote use, set NODE_ENV=production, a strong API_TOKEN, and HOST appropriately. Startup refuses remote/production mode with a token shorter than 32 characters.

## Vercel public demo

`vercel.json` deploys the Vite frontend and `api/[...path].ts` serverless handler. The public Vercel project is deliberately a **resettable demo** at [scopelens-three.vercel.app](https://scopelens-three.vercel.app): a serverless instance uses an in-memory PostgreSQL-compatible database and recreates the fictional Atelier sample. Serverless instances do not share that memory, so this site is for viewing the interface and fictional example rather than persistent shared-workspace use.

Do not enter real client, business, or personal data into the public demo. The Desktop/local application remains the version for persistent work, using embedded PGlite or an external PostgreSQL `DATABASE_URL`. A real hosted handover should use external PostgreSQL, real user authentication, per-project authorization, and a durable job worker before accepting customer data.

Generate a token using a cryptographically secure generator, store it in the host's secret manager, and enter it through Workspace connection in the browser. Do not commit it. Put the server behind HTTPS. Use a private instance or access-controlled reverse proxy for the first release. There is no per-user authentication, role management, rate limiting, or team audit identity yet.

## Docker with embedded PostgreSQL

```sh
docker build -t scopelens .
docker run --env-file .env -p 127.0.0.1:4000:4000 -v scopelens-data:/app/.data scopelens
```

The image uses production mode and HOST=0.0.0.0, so `.env` must contain a strong API_TOKEN. The example port binding remains loopback; place an HTTPS proxy in front if sharing remotely. A named volume preserves embedded data. One container only may access this data volume.

## External PostgreSQL

Set DATABASE_URL for a dedicated database. The application creates its initial schema on startup. No destructive SQL is run. Deploy exactly one API replica because job coordination is process-local. Verify an external PostgreSQL deployment separately; embedded-database test results are not proof of remote operational behavior.

`compose.yaml` provides an optional app + PostgreSQL setup. Set API_TOKEN and POSTGRES_PASSWORD in your shell or an ignored `.env` before `docker compose up --build`. Database credentials are never baked into the image.

## AI provider configuration

- AI_API_KEY: provider secret.
- AI_MODEL: explicit supported model identifier.
- AI_BASE_URL: optional OpenAI-compatible base URL, default `https://api.openai.com/v1`.

The provider must support chat completions and JSON response format with the supplied parameters. Compatibility is not guaranteed for every model. A failed call leaves linked impacts available. No provider was contacted during the default local setup. Validate your configured model's schema and reasoning quality with your own evaluation set.

## Backup and restore

For embedded storage, stop this app cleanly before copying the entire `.data/scopelens` directory; restore to the same compatible runtime before starting. Do not copy an actively changing embedded store and call it a consistent backup. For external PostgreSQL, use standard `pg_dump`/restore procedures and test restoration in a separate database. JSON export is a report and does not have a corresponding import endpoint.

## Health and monitoring

GET /api/health reports that the running process initialized its database and whether AI is configured. It does not probe the database on every call or establish third-party provider readiness. Add infrastructure liveness/readiness checks and alerting before a larger deployment.

Jobs interrupted by restart become failed with an explanation. Users explicitly rerun them. Failed provider calls do not expose secrets in client errors. Application logs intentionally avoid request bodies and credentials.
