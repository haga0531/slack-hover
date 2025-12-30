import type { Application, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { setupSummaryRoute } from "./summary.js";

export function setupApiRoutes(app: Application) {
  const router = Router();

  // CORS middleware for Chrome extension
  router.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Parse JSON body
  router.use((req, _res, next) => {
    if (req.is("application/json")) {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        try {
          req.body = JSON.parse(data);
        } catch {
          req.body = {};
        }
        next();
      });
    } else {
      next();
    }
  });

  // Setup routes
  setupSummaryRoute(router);

  app.use(router);
}
