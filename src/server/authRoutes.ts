import { Router } from "express";
import { authenticate, clearSessionCookie, getSessionAdmin, issueSessionCookie, publicUser } from "./auth.ts";
import { asyncHandler } from "./asyncHandler.ts";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "メールアドレスとパスワードを入力してください" });
      return;
    }
    const user = await authenticate(email, password);
    if (!user) {
      res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
      return;
    }
    issueSessionCookie(res, user.email);
    res.json({ user });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  "/session",
  asyncHandler(async (req, res) => {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      res.status(401).json({ user: null });
      return;
    }
    res.json({ user: publicUser(admin) });
  }),
);
