import departments from "./data/departments.json" with { type: "json" };
import checkItems from "./data/checkItems.json" with { type: "json" };
import caseStudies from "./data/caseStudies.json" with { type: "json" };
import aiTools from "./data/aiTools.json" with { type: "json" };
import supportServices from "./data/supportServices.json" with { type: "json" };
import type {
  AiTool,
  CaseStudy,
  CheckItem,
  Department,
  HearingSession,
  SupportService,
} from "../types.ts";

/**
 * フェーズ1の暫定データ層。ローカルJSON（Googleスプレッドシートの初期データを転記したもの）を
 * サーバー起動時にメモリへ読み込む。フェーズ2でGoogle Sheets API（googleapis）経由の読み書きに
 * 置き換える際は、このモジュールの関数シグネチャを変えずに中身だけ差し替えれば良いようにしている
 * （Firestoreは使用しない。ai-simulatorの実装調査によりデータ層はGoogle Sheetsが実態だったため）。
 * 伴走支援リストは本来ai-simulatorと共通のGoogle Sheetsを都度読み取る設計（要件定義書参照）だが、
 * フェーズ1ではオフライン開発を優先し、起動時に読み込んだスナップショットを返す。
 */

const sessions = new Map<string, HearingSession>();
const answers = new Map<string, Map<string, number>>(); // sessionId -> itemId -> score

export function listDepartments(): Department[] {
  return [...(departments as Department[])].sort((a, b) => a.order - b.order);
}

export function listCheckItems(departmentIds: string[]): CheckItem[] {
  const idSet = new Set(departmentIds);
  return (checkItems as CheckItem[])
    .filter((item) => idSet.has(item.departmentId))
    .sort((a, b) => a.order - b.order);
}

export function getCheckItem(itemId: string): CheckItem | undefined {
  return (checkItems as CheckItem[]).find((item) => item.id === itemId);
}

export function listCaseStudies(departmentIds: string[]): CaseStudy[] {
  const idSet = new Set(departmentIds);
  return (caseStudies as CaseStudy[]).filter((c) => idSet.has(c.departmentId));
}

export function listAiTools(): AiTool[] {
  return (aiTools as AiTool[])
    .filter((tool) => tool.enabled)
    .sort((a, b) => a.order - b.order);
}

export function listSupportServices(): SupportService[] {
  return [...(supportServices as SupportService[])].sort((a, b) => a.order - b.order);
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
