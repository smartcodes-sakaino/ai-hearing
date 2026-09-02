import { Router } from "express";
import {
  buildGoogleLoginUrl,
  checkAdminAllowed,
  clearSessionCookie,
  exchangeCodeForProfile,
  issueSessionCookie,
  readSession,
} from "./auth.ts";

export const authRouter = Router();

authRouter.get("/google", (_req, res) => {
  try {
    res.redirect(buildGoogleLoginUrl());
  } catch (e) {
    res.status(500).send(e instanceof Error ? e.message : "OAuth設定エラー");
  }
});

authRouter.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string") {
    res.status(400).send("認可コードがありません");
    return;
  }
  try {
    const profile = await exchangeCodeForProfile(code);
    const admin = await checkAdminAllowed(profile.email);
    if (!admin) {
      res.status(403).send(
        `このGoogleアカウント（${profile.email}）には管理画面へのアクセス権限がありません。管理者許可リストへの追加を管理者に依頼してください。`,
      );
      return;
    }
    issueSessionCookie(res, { email: admin.email, displayName: admin.displayName, role: admin.role });
    res.redirect("/admin");
  } catch (e) {
    res.status(500).send(e instanceof Error ? e.message : "ログイン処理でエラーが発生しました");
  }
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/session", (req, res) => {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({ user: { email: session.email, displayName: session.displayName, role: session.role } });
});
