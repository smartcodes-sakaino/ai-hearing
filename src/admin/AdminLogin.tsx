import BrandMark from "../components/BrandMark.tsx";

export default function AdminLogin({ deniedMessage }: { deniedMessage?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5">
      <div className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_1px_2px_rgba(34,31,26,0.06),0_8px_24px_rgba(34,31,26,0.06)]">
        <div className="mb-4 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-[22px]">AI活用カルテ 管理画面</h1>
        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          管理者として許可されたGoogleアカウントでログインしてください。
        </p>
        {deniedMessage && (
          <div className="mt-4 rounded-lg border border-[var(--priority)] bg-[var(--priority-soft)] px-3 py-2 text-[13px] text-[var(--priority)]">
            {deniedMessage}
          </div>
        )}
        <a
          href="/auth/google"
          className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
        >
          Googleでログイン
        </a>
      </div>
    </div>
  );
}
