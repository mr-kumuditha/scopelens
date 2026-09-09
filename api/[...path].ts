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
  const app = await getHandler();
  return app(req, res);
}
