async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface AdminSessionUser {
  email: string;
  displayName: string;
  role: "最高権限" | "管理者権限";
}

export function fetchAdminSession(): Promise<{ user: AdminSessionUser | null }> {
  return fetch("/auth/session").then(async (res) => {
    if (res.status === 401) return { user: null };
    return json(res);
  });
}

export function loginAdmin(email: string, password: string): Promise<{ user: AdminSessionUser }> {
  return fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => json(r));
}

export function logoutAdmin(): Promise<void> {
  return fetch("/auth/logout", { method: "POST" }).then(() => undefined);
}

export function listResource<T>(path: string): Promise<T[]> {
  return fetch(`/api/admin/${path}`).then((r) => json<T[]>(r));
}

export function createResource<T>(path: string, data: Partial<T>): Promise<T> {
  return fetch(`/api/admin/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => json<T>(r));
}

export function updateResource<T>(path: string, id: string, data: Partial<T>): Promise<T> {
  return fetch(`/api/admin/${path}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => json<T>(r));
}

export function removeResource(path: string, id: string): Promise<void> {
  return fetch(`/api/admin/${path}/${id}`, { method: "DELETE" }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  });
}

export interface BatchResult {
  startedAt: string;
  finishedAt: string;
  added: number;
  updated: number;
  failed: number;
  details: string[];
}

export function fetchBatchStatus(): Promise<{ caseStudies: BatchResult | null; aiTools: BatchResult | null }> {
  return fetch("/api/admin/batch-status").then((r) => json(r));
}

export function runBatchNow(target: "case-studies" | "ai-tools"): Promise<BatchResult> {
  return fetch("/api/admin/batch/run-now", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  }).then((r) => json<BatchResult>(r));
}
