import express from "express";
import { router } from "./src/server/routes.ts";

const app = express();
app.use(express.json());
app.use("/api", router);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const isProd = process.env.NODE_ENV === "production";

async function start() {
  if (isProd) {
    const path = await import("node:path");
    const url = await import("node:url");
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
