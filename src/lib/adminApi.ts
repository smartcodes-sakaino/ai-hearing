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
  role: string;
}

export function fetchAdminSession(): Promise<{ user: AdminSessionUser | null }> {
  return fetch("/auth/session").then(async (res) => {
    if (res.status === 401) return { user: null };
    return json(res);
  });
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
