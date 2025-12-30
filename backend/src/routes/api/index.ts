import type { Application } from "express";
import { Router } from "express";
import { setupSummaryRoute } from "./summary.js";

export function setupApiRoutes(app: Application) {
  const router = Router();

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
