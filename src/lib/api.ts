import type { CheckItem, Department, HearingSession, ReportData } from "../types.ts";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchDepartments(): Promise<Department[]> {
  return fetch("/api/departments").then((r) => json(r));
}

export function createSession(
  companyName: string,
  departmentIds: string[],
): Promise<{ session: HearingSession; items: CheckItem[] }> {
  return fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName, departmentIds }),
  }).then((r) => json(r));
}

export function saveAnswers(sessionId: string, answers: { itemId: string; score: number }[]): Promise<void> {
  return fetch(`/api/sessions/${sessionId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  }).then((r) => json(r));
}

export function fetchReport(sessionId: string): Promise<ReportData> {
  return fetch(`/api/sessions/${sessionId}/report`, { method: "POST" }).then((r) => json(r));
}
