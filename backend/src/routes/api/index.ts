import type { Express } from "express";
import { Router } from "express";
import { setupSummaryRoute } from "./summary.js";

export function setupApiRoutes(app: Express) {
  const router = Router();

  // Parse JSON body
  router.use((req, res, next) => {
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
