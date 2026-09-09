import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import {
  Module,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
  HttpException,
  Inject,
} from "@nestjs/common";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { openDatabase } from "./database.js";
import { ScopeService } from "./service.js";
import { aiConfigured } from "./ai.js";
@Controller("api")
class Api {
  constructor(@Inject(ScopeService) private readonly service: ScopeService) {}
  @Get("health") health() {
    return {
      status: "ok",
      aiEnabled: aiConfigured(),
      access: process.env.API_TOKEN ? "token" : "local",
    };
  }
  @Get("projects") projects() {
    return this.service.projects();
  }
  @Post("projects") create(@Body() body: unknown) {
    return this.service.createProject(body);
  }
  @Post("sample") sample() {
    return this.service.seed();
  }
  @Get("projects/:project") snapshot(@Param("project") project: string) {
    return this.service.snapshot(project);
  }
  @Post("projects/:project/drafts") drafts(
    @Param("project") p: string,
    @Body() b: unknown,
  ) {
    return this.service.drafts(p, b);
  }
  @Post("projects/:project/requirements") requirement(
    @Param("project") p: string,
    @Body() b: unknown,
  ) {
    return this.service.addRequirement(p, b);
  }
  @Patch("projects/:project/requirements/:id") edit(
    @Param("project") p: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.editRequirement(p, id, b);
  }
  @Post("projects/:project/artifacts") artifact(
    @Param("project") p: string,
    @Body() b: unknown,
  ) {
    return this.service.addArtifact(p, b);
  }
  @Post("projects/:project/requirements/:id/links") link(
    @Param("project") p: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.link(p, id, b);
  }
  @Post("projects/:project/requirements/:id/analyses") analyze(
    @Param("project") p: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.analyze(p, id, b);
  }
  @Patch("projects/:project/impacts/:id") decide(
    @Param("project") p: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.decide(p, id, b);
  }
}
@Catch()
class Errors implements ExceptionFilter {
  catch(e: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (e instanceof ZodError)
      return response.status(400).json({
        message: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (e instanceof HttpException)
      return response.status(e.getStatus()).json({ message: e.message });
    console.error(
      "Request failed:",
      e instanceof Error ? e.name : "Unknown error",
    );
    return response
      .status(500)
      .json({ message: "The request could not be completed. Please retry." });
  }
}
async function main() {
  const token = process.env.API_TOKEN;
  const host = process.env.HOST || "127.0.0.1";
  if (
    (process.env.NODE_ENV === "production" ||
      !["127.0.0.1", "localhost", "::1"].includes(host)) &&
    (!token || token.length < 32)
  )
    throw new Error(
      "Set API_TOKEN to at least 32 characters before serving outside local development.",
    );
  const service = new ScopeService(await openDatabase());
  await service.init();
  @Module({
    controllers: [Api],
    providers: [{ provide: ScopeService, useValue: service }],
  })
  class AppModule {}
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn"],
    bodyParser: false,
  });
  app.use(helmet());
  app.use(express.json({ limit: "256kb" }));
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/health" && req.method === "GET") return next();
    if (
      !token &&
      !["127.0.0.1", "localhost", "::1", "[::1]"].includes(req.hostname)
    ) {
      return res
        .status(403)
        .json({ message: "Local mode requires a loopback hostname." });
    }
    if (token) {
      const supplied = Buffer.from(
        req.headers.authorization?.replace(/^Bearer /, "") || "",
      );
      const expected = Buffer.from(token);
      if (
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      )
        return res
          .status(401)
          .json({ message: "Enter the workspace access token to connect." });
    }
    const origin = req.headers.origin;
    if (origin) {
      let hostname;
      try {
        hostname = new URL(origin).hostname;
      } catch {
        return res.status(403).json({ message: "Invalid origin." });
      }
      if (hostname !== req.hostname)
        return res
          .status(403)
          .json({ message: "Cross-origin requests are not allowed." });
    }
    next();
  });
  app.useGlobalFilters(new Errors());
  app.use(express.static(resolve("dist")));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.method === "GET" &&
      !req.path.startsWith("/api") &&
      !req.path.includes(".")
    )
      return res.sendFile(resolve("dist/index.html"));
    next();
  });
  await app.listen(Number(process.env.PORT || 4000), host);
  console.log(`ScopeLens API: http://${host}:${process.env.PORT || 4000}`);
  async function close() {
    await app.close();
    await service.settle();
    await service.db.close();
    process.exit(0);
  }
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}
void main();
