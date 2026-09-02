import { useEffect, useState } from "react";
import { fetchAdminSession, type AdminSessionUser } from "../lib/adminApi.ts";
import AdminLogin from "./AdminLogin.tsx";
import AdminDashboard from "./AdminDashboard.tsx";

export default function AdminApp() {
  const [user, setUser] = useState<AdminSessionUser | null | undefined>(undefined);

  useEffect(() => {
    fetchAdminSession()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[13.5px] text-[var(--text-muted)]">
        読み込み中...
      </div>
    );
  }

  if (!user) return <AdminLogin />;
  return <AdminDashboard user={user} />;
}
