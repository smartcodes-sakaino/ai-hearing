import { Router } from "express";
import type { Collection } from "./dataStore.ts";
import type { AdminRole, AdminUser } from "../types.ts";
import { ADMIN_ROLES } from "../types.ts";
import { getStore } from "./dataStoreProvider.ts";
import { requireAdmin, requireOwner } from "./auth.ts";
import { hashPassword } from "./password.ts";
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

// 管理者許可リストは最高権限のみ操作可能。パスワードハッシュは応答に含めない。
function omitPasswordHash(admin: AdminUser) {
  const { passwordHash: _passwordHash, ...rest } = admin;
  return rest;
}

adminRouter.get(
  "/allow-list",
  requireOwner,
  asyncHandler(async (_req, res) => {
    const store = await getStore();
    const items = await store.adminAllowList.list();
    res.json(items.map(omitPasswordHash));
  }),
);

adminRouter.post(
  "/allow-list",
  requireOwner,
  asyncHandler(async (req, res) => {
    const { email, displayName, role, password } = req.body as {
      email?: string;
      displayName?: string;
      role?: AdminRole;
      password?: string;
    };
    if (!email || !displayName || !password) {
      res.status(400).json({ error: "メールアドレス・表示名・パスワードは必須です" });
      return;
    }
    if (!role || !ADMIN_ROLES.includes(role)) {
      res.status(400).json({ error: `権限は次のいずれかを指定してください: ${ADMIN_ROLES.join(" / ")}` });
      return;
    }
    const store = await getStore();
    const passwordHash = await hashPassword(password);
    const created = await store.adminAllowList.create({
      email,
      displayName,
      role,
      passwordHash,
      createdAt: new Date().toISOString(),
    } as any);
    res.status(201).json(omitPasswordHash(created));
  }),
);

adminRouter.put(
  "/allow-list/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const { email, displayName, role, password } = req.body as {
      email?: string;
      displayName?: string;
      role?: AdminRole;
      password?: string;
    };
    if (role && !ADMIN_ROLES.includes(role)) {
      res.status(400).json({ error: `権限は次のいずれかを指定してください: ${ADMIN_ROLES.join(" / ")}` });
      return;
    }
    const patch: Partial<AdminUser> = { email, displayName, role };
    if (password) patch.passwordHash = await hashPassword(password);
    const store = await getStore();
    try {
      const updated = await store.adminAllowList.update(req.params.id, patch);
      res.json(omitPasswordHash(updated));
    } catch (e) {
      res.status(404).json({ error: e instanceof Error ? e.message : "not found" });
    }
  }),
);

adminRouter.delete(
  "/allow-list/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const store = await getStore();
    await store.adminAllowList.remove(req.params.id);
    res.status(204).end();
  }),
);

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
