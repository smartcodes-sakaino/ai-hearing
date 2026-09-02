import type {
  AdminUser,
  AiTool,
  CaseStudy,
  CheckItem,
  Department,
  HearingSession,
  SupportService,
} from "../types.ts";
import { getStore } from "./dataStoreProvider.ts";

/**
 * マスタデータはdataStoreProvider経由（ローカルJSON or Google Sheets）で読み書きする。
 * ヒアリングセッション・回答はフェーズ1同様、サーバーのメモリ上で保持する
 * （本番運用でサーバーを複数台に増やす場合は、ここもGoogle Sheets等の外部ストアへ
 * 移す必要がある。現状の利用規模では必須ではないため据え置き）。
 */

const sessions = new Map<string, HearingSession>();
const answers = new Map<string, Map<string, number>>(); // sessionId -> itemId -> score

export async function listDepartments(): Promise<Department[]> {
  const store = await getStore();
  const items = await store.departments.list();
  return [...items].sort((a, b) => a.order - b.order);
}

export async function listCheckItems(departmentIds: string[]): Promise<CheckItem[]> {
  const store = await getStore();
  const items = await store.checkItems.list();
  const idSet = new Set(departmentIds);
  return items.filter((item) => idSet.has(item.departmentId)).sort((a, b) => a.order - b.order);
}

export async function listCaseStudies(departmentIds: string[]): Promise<CaseStudy[]> {
  const store = await getStore();
  const items = await store.caseStudies.list();
  const idSet = new Set(departmentIds);
  return items.filter((c) => idSet.has(c.departmentId));
}

export async function listAiTools(): Promise<AiTool[]> {
  const store = await getStore();
  const items = await store.aiTools.list();
  return items.filter((tool) => tool.enabled).sort((a, b) => a.order - b.order);
}

export async function listSupportServices(): Promise<SupportService[]> {
  const store = await getStore();
  const items = await store.supportServices.list();
  return [...items].sort((a, b) => a.order - b.order);
}

export async function findAdminByEmail(email: string): Promise<AdminUser | undefined> {
  const store = await getStore();
  const items = await store.adminAllowList.list();
  return items.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export function createSession(companyName: string, departmentIds: string[]): HearingSession {
  const id = `SES_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: HearingSession = {
    id,
    companyName: companyName.trim() || "貴社",
    departmentIds,
    createdAt: new Date().toISOString(),
    status: "answering",
  };
  sessions.set(id, session);
  answers.set(id, new Map());
  return session;
}

export function getSession(sessionId: string): HearingSession | undefined {
  return sessions.get(sessionId);
}

export function saveAnswers(sessionId: string, entries: { itemId: string; score: number }[]) {
  const bucket = answers.get(sessionId);
  if (!bucket) return;
  for (const { itemId, score } of entries) {
    bucket.set(itemId, score);
  }
}

export function getAnswers(sessionId: string): Map<string, number> {
  return answers.get(sessionId) ?? new Map();
}

export function completeSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) session.status = "completed";
}
