import express from "express";
import { router } from "./routes.ts";
import { authRouter } from "./authRoutes.ts";
import { adminRouter } from "./adminRoutes.ts";
import { internalBatchRouter } from "./internalBatchRoutes.ts";

/** Node(ローカル/esbuildビルド)とCloudflare Workersの両方のエントリポイントから共有するExpressアプリ本体 */
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  app.use("/api", router);
  app.use("/auth", authRouter);
  app.use("/internal/batch", internalBatchRouter);

  // APIルート内で起きたエラーはここでcatchしてJSONで返す(プロセスを落とさない)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal server error";
    res.status(500).json({ error: message });
  });

  return app;
}
