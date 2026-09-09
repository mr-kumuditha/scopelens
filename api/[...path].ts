import type { IncomingMessage, ServerResponse } from "node:http";
import { createScopeApp } from "../server/main.js";

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

let handlerPromise: Promise<ExpressHandler> | undefined;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = createScopeApp({ memory: true, demoMode: true }).then(
      ({ app }) => app.getHttpAdapter().getInstance() as ExpressHandler,
    );
  }
  return handlerPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  // Vercel passes a catch-all value as `path`. Restore the API path before
  // NestJS performs route matching, including nested project resources.
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const path = requestUrl.searchParams.get("path");
  if (path) {
    requestUrl.searchParams.delete("path");
    const query = requestUrl.searchParams.toString();
    const apiPath = path.startsWith("/") ? path.slice(1) : path;
    req.url = `/api/${apiPath}${query ? `?${query}` : ""}`;
  }
  const app = await getHandler();
  return app(req, res);
}
