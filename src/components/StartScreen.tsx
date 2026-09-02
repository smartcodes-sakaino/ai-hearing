import { useEffect, useState } from "react";
import type { Department } from "../types.ts";
import { fetchDepartments } from "../lib/api.ts";

interface Props {
  onSubmit: (companyName: string, departmentIds: string[]) => void;
  loading: boolean;
}

export default function StartScreen({ onSubmit, loading }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_1px_2px_rgba(34,31,26,0.06),0_8px_24px_rgba(34,31,26,0.06)]">
      <div className="font-mono-data mb-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
        Step 1
      </div>
      <h2 className="text-[27px]">まずは基本情報を教えてください</h2>
      <p className="mt-3 max-w-[60ch] text-[15.5px] leading-[1.7] text-[var(--text-muted)]">
        企業名と、ヒアリングする部署を選んでください。部署ごとに、実務に即したチェック項目をご用意しています。
      </p>

      <div className="mt-[30px] flex flex-col gap-[22px]">
        <div>
          <label className="mb-2 block text-[14px] font-semibold" htmlFor="company-input">
            企業名（任意）
          </label>
          <input
            id="company-input"
            type="text"
            className="w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-alt)] px-3.5 py-3 text-[16px] text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="例）株式会社スマートコーデス"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-[14px] font-semibold">ヒアリングする部署（複数選択可）</label>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggle(d.id)}
                className={
                  "rounded-[10px] border px-3.5 py-3 text-left text-[14.5px] transition-colors " +
                  (selected.has(d.id)
                    ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-[var(--accent-contrast)]"
                    : "border-[var(--border-strong)] bg-[var(--surface-alt)] text-[var(--text)] hover:border-[var(--accent)]")
                }
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={selected.size === 0 || loading}
        onClick={() => onSubmit(companyName, [...selected])}
        className="mt-[30px] inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-[26px] py-3.5 text-[15.5px] font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "作成中..." : "ヒアリングを始める →"}
      </button>
    </section>
  );
}
