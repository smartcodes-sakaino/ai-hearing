import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { google } from "googleapis";
import { findAdminByEmail } from "./store.ts";

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
  displayName: string;
  role: string;
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

export function issueSessionCookie(res: import("express").Response, payload: Omit<SessionPayload, "exp">) {
  const token = sign({ ...payload, exp: Date.now() + SESSION_TTL_MS });
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

export function readSession(req: import("express").Request): SessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verify(token);
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "ログインが必要です" });
    return;
  }
  (req as any).adminUser = session;
  next();
};

function oauthClient() {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET / OAUTH_REDIRECT_URI が未設定です（.envを確認してください）");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleLoginUrl(): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });
}

/** 認可コードをGoogleアカウント情報（メール・氏名）に交換する */
export async function exchangeCodeForProfile(code: string): Promise<{ email: string; name: string }> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) throw new Error("Googleアカウントからメールアドレスを取得できませんでした");
  return { email: data.email, name: data.name ?? data.email };
}

/** 管理者許可リストに存在するアカウントかどうかを確認する */
export async function checkAdminAllowed(email: string) {
  return findAdminByEmail(email);
}
