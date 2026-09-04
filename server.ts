import { loadEnv } from "./src/server/loadEnv.ts";

loadEnv();
if (!process.env.SESSION_SECRET) {
  // ローカル開発をすぐ試せるように、未設定時は一時的な値を使う（本番では必ず.envで設定すること）
  console.warn("[dev] SESSION_SECRET が未設定のため、開発用の一時値を使用します。本番運用前に.envで設定してください。");
  process.env.SESSION_SECRET = "dev-only-insecure-secret-please-set-in-env";
}

const { createApp } = await import("./src/server/app.ts");
const app = createApp();

const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const isProd = process.env.NODE_ENV === "production";

async function start() {
  if (isProd) {
    const path = await import("node:path");
    const url = await import("node:url");
    const express = (await import("express")).default;
    const dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const publicDir = path.join(dirname, "dist/public");
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`ai-hearing server listening on http://localhost:${port}`);
  });
}

start();
