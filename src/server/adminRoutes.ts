import { Router } from "express";
import type { Collection } from "./dataStore.ts";
import { getStore } from "./dataStoreProvider.ts";
import { requireAdmin } from "./auth.ts";
import { asyncHandler } from "./asyncHandler.ts";
import { getLastBatchStatus, refreshAiToolPrices, refreshCaseStudies } from "./batch.ts";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/me", (req, res) => {
  res.json({ user: (req as any).adminUser });
});

function crudRoutes(path: string, pick: (store: Awaited<ReturnType<typeof getStore>>) => Collection<any>) {
  adminRouter.get(
    `/${path}`,
    asyncHandler(async (_req, res) => {
      const store = await getStore();
      res.json(await pick(store).list());
    }),
  );

  adminRouter.post(
    `/${path}`,
    asyncHandler(async (req, res) => {
      const store = await getStore();
      const created = await pick(store).create(req.body);
      res.status(201).json(created);
    }),
  );

  adminRouter.put(
    `/${path}/:id`,
    asyncHandler(async (req, res) => {
      const store = await getStore();
      try {
        const updated = await pick(store).update(req.params.id, req.body);
        res.json(updated);
      } catch (e) {
        res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
      }
    }),
  );

  adminRouter.delete(
    `/${path}/:id`,
    asyncHandler(async (req, res) => {
      const store = await getStore();
      await pick(store).remove(req.params.id);
      res.status(204).end();
    }),
  );
}

crudRoutes("departments", (s) => s.departments);
crudRoutes("check-items", (s) => s.checkItems);
crudRoutes("case-studies", (s) => s.caseStudies);
crudRoutes("ai-tools", (s) => s.aiTools);
crudRoutes("allow-list", (s) => s.adminAllowList);

// 伴走支援リストは読み取り専用（ai-simulatorと共通のシートを直接編集してもらう）
adminRouter.get(
  "/support-services",
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    res.json(await store.supportServices.list());
  }),
);

// 自動収集バッチ（フェーズ3）
adminRouter.get("/batch-status", (_req, res) => {
  res.json(getLastBatchStatus());
});

adminRouter.post(
  "/batch/run-now",
  asyncHandler(async (req, res) => {
    const { target } = req.body as { target?: "case-studies" | "ai-tools" };
    if (target === "case-studies") {
      res.json(await refreshCaseStudies());
    } else if (target === "ai-tools") {
      res.json(await refreshAiToolPrices());
    } else {
      res.status(400).json({ error: "target must be 'case-studies' or 'ai-tools'" });
    }
  }),
);
