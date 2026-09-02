import { useEffect, useMemo, useState } from "react";
import type { CheckItem, Department } from "../types.ts";
import { SCALE_LABELS } from "../types.ts";
import { fetchDepartments } from "../lib/api.ts";

interface Props {
  items: CheckItem[];
  onBack: () => void;
  onSubmit: (answers: Record<string, number>) => void;
  loading: boolean;
}

export default function ChecklistScreen({ items, onBack, onSubmit, loading }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const deptNameById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const groups = useMemo(() => {
    const byDept = new Map<string, CheckItem[]>();
    for (const item of items) {
      const list = byDept.get(item.departmentId) ?? [];
      list.push(item);
      byDept.set(item.departmentId, list);
    }
    return [...byDept.entries()];
  }, [items]);

  const answeredCount = Object.keys(answers).length;
  const total = items.length;
  const allAnswered = answeredCount === total && total > 0;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_1px_2px_rgba(34,31,26,0.06),0_8px_24px_rgba(34,31,26,0.06)]">
      <div className="font-mono-data mb-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
        Step 2
      </div>
      <h2 className="text-[27px]">チェックリスト</h2>
      <p className="mt-3 max-w-[62ch] text-[15.5px] leading-[1.7] text-[var(--text-muted)]">
        それぞれの業務について、現在どこまでAIに置き換えられているかを選んでください。「大変さ」ではなく「AI活用の進み具合」を聞く質問です。
      </p>

      <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
          style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }}
        />
      </div>

      <div className="mt-2">
        {groups.map(([deptId, deptItems], gi) => (
          <div key={deptId}>
            <div
              className={
                "text-[14.5px] font-bold uppercase tracking-[0.03em] text-[var(--accent-strong)] " +
                (gi === 0 ? "mt-2" : "mt-8 border-t border-[var(--border-strong)] pt-6")
              }
            >
              {deptNameById.get(deptId) ?? deptId}
            </div>
            {deptItems.map((item, idx) => (
              <div key={item.id} className={"flex flex-col gap-3.5 border-t border-[var(--border)] py-[22px] " + (idx === 0 ? "first:border-t-0 first:pt-[26px]" : "")}>
                <div className="text-[17px] font-semibold">
                  <span className="font-mono-data mr-2 text-[12.5px] text-[var(--text-muted)]">Q{idx + 1}</span>
                  {item.name}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {SCALE_LABELS.map((label, i) => {
                    const n = i + 1;
                    const picked = answers[item.id] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: n }))}
                        className={
                          "rounded-[10px] border px-2 py-2.5 text-center text-[12.5px] leading-[1.45] transition-colors " +
                          (picked
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : "border-[var(--border-strong)] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:border-[var(--accent)]")
                        }
                      >
                        <span
                          className={
                            "font-mono-data mb-1 block text-[17px] font-semibold " +
                            (picked ? "text-[var(--accent-contrast)]" : "text-[var(--text)]")
                          }
                        >
                          {n}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sticky bottom-4 mt-7 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(34,31,26,0.06),0_8px_24px_rgba(34,31,26,0.06)]">
        <span className="text-[14.5px] text-[var(--text-muted)]">
          {answeredCount} / {total} 項目 回答済み
        </span>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="rounded-[10px] border border-[var(--border-strong)] px-5 py-3.5 text-[15px] text-[var(--text)]"
          >
            戻る
          </button>
          <button
            type="button"
            disabled={!allAnswered || loading}
            onClick={() => onSubmit(answers)}
            className="rounded-[10px] bg-[var(--accent)] px-[26px] py-3.5 text-[15.5px] font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "作成中..." : "診断結果を作成する →"}
          </button>
        </div>
      </div>
    </section>
  );
}
