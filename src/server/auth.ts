import crypto from "node:crypto";
import type { RequestHandler } from "express";
import type { AdminUser } from "../types.ts";
import { findAdminByEmail } from "./store.ts";
import { verifyPassword } from "./password.ts";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12時間

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET が未設定です（.envを確認してください）");
  }
  return secret;
}

interface SessionPayload {
  email: string;
  exp: number;
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueSessionCookie(res: import("express").Response, email: string) {
  const token = sign({ email, exp: Date.now() + SESSION_TTL_MS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: import("express").Response) {
  res.clearCookie(SESSION_COOKIE);
}

/** cookie-parser相当のミドルウェアを追加しないため、Cookieヘッダーを自前でパースする */
function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function readSessionEmail(req: import("express").Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verify(token)?.email ?? null;
}

/**
 * 署名付きCookieの検証だけでなく、毎回「管理者許可リスト」に今も存在するかを確認する。
 * こうしないと、許可リストから削除・権限変更してもCookieの有効期限（12時間）が切れるまで
 * 古い権限のままアクセスできてしまう。取得した最新のAdminUserを返すことで、
 * 権限(role)の変更も次のリクエストから即座に反映される。
 */
export async function getSessionAdmin(req: import("express").Request): Promise<AdminUser | null> {
  const email = readSessionEmail(req);
  if (!email) return null;
  return (await findAdminByEmail(email)) ?? null;
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const email = readSessionEmail(req);
  if (!email) {
    res.status(401).json({ error: "ログインが必要です" });
    return;
  }
  const admin = await findAdminByEmail(email);
  if (!admin) {
    clearSessionCookie(res);
    res.status(401).json({ error: "アクセス権限がありません" });
    return;
  }
  (req as any).adminUser = admin;
  next();
};

/** 「最高権限」の管理者のみアクセスできるルート用（管理者許可リスト自体の編集など） */
export const requireOwner: RequestHandler = (req, res, next) => {
  const admin = (req as any).adminUser as AdminUser | undefined;
  if (admin?.role !== "最高権限") {
    res.status(403).json({ error: "この操作には最高権限が必要です" });
    return;
  }
  next();
};

/** メールアドレス・パスワードで認証する。成功時はパスワードハッシュを含まないAdminUserを返す */
export async function authenticate(email: string, password: string): Promise<Omit<AdminUser, "passwordHash"> | null> {
  const admin = await findAdminByEmail(email);
  if (!admin || !admin.passwordHash) return null;
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) return null;
  const { passwordHash: _passwordHash, ...rest } = admin;
  return rest;
}

export function publicUser(admin: AdminUser): Omit<AdminUser, "passwordHash"> {
  const { passwordHash: _passwordHash, ...rest } = admin;
  return rest;
}
