import { useState } from "react";
import BrandMark from "../components/BrandMark.tsx";
import { loginAdmin, type AdminSessionUser } from "../lib/adminApi.ts";

export default function AdminLogin({ onLoggedIn }: { onLoggedIn: (user: AdminSessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await loginAdmin(email, password);
      onLoggedIn(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5">
      <div className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_1px_2px_rgba(34,31,26,0.06),0_8px_24px_rgba(34,31,26,0.06)]">
        <div className="mb-4 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-[22px]">AI活用カルテ 管理画面</h1>
        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          発行されたメールアドレスとパスワードでログインしてください。
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-[var(--priority)] bg-[var(--priority-soft)] px-3 py-2 text-[13px] text-[var(--priority)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 text-left">
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-muted)]" htmlFor="admin-email">
              メールアドレス
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-alt)] px-3.5 py-2.5 text-[14.5px] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--text-muted)]" htmlFor="admin-password">
              パスワード
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-alt)] px-3.5 py-2.5 text-[14.5px] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
