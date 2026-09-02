import { useRef, useState } from "react";
import type { ReportData } from "../types.ts";
import { SCALE_LABELS } from "../types.ts";

interface Props {
  report: ReportData;
  onBack: () => void;
}

export default function ResultScreen({ report, onBack }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(captureRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`AI活用カルテ_${report.companyName}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_1px_2px_rgba(34,31,26,0.06),0_8px_24px_rgba(34,31,26,0.06)]">
      <div ref={captureRef} className="bg-[var(--surface)]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-[var(--border)] pb-6">
          <div>
            <div className="font-mono-data mb-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
              Step 3・診断結果
            </div>
            <h2 className="text-[27px]">AI活用カルテ</h2>
            <p className="mt-3 text-[15.5px] text-[var(--text-muted)]">
              <span className="font-mono-data font-semibold text-[var(--text)]">{report.companyName}</span>
              {" ／ "}
              {report.departmentNames.join("・")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[44px] font-semibold leading-none text-[var(--accent)]">
              {report.averageScore}
              <span className="ml-1 text-[14.5px] font-medium text-[var(--text-muted)]">/ 5.0 平均活用度</span>
            </div>
          </div>
        </div>

        <Section title="① 着手優先度の高い業務" desc="現状のスコアが低い＝伸びしろが大きい業務です。ここから着手すると効果を実感しやすくなります。">
          <div className="flex flex-col gap-3">
            {report.priorities.map((p, i) => (
              <div key={p.itemId} className="flex gap-4 rounded-xl bg-[var(--priority-soft)] px-5 py-[18px]">
                <span className="font-mono-data w-[26px] flex-none font-semibold text-[var(--priority)]">
                  0{i + 1}
                </span>
                <div>
                  {report.departmentNames.length > 1 && (
                    <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.04em] text-[var(--priority)]">
                      {p.departmentName}
                    </span>
                  )}
                  <h4 className="text-[16.5px] font-semibold">{p.itemName}</h4>
                  <p className="mt-1.5 text-[14.5px] text-[var(--text-muted)]">{p.advice}</p>
                  <span className="font-mono-data mt-2 inline-block text-[12px] text-[var(--priority)]">
                    現状レベル {p.score} / 5・{SCALE_LABELS[p.score - 1]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="② 他社の導入前例" desc="同じ部署・近い課題を持つ企業の事例です。情報源と取得日を明記しています。">
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {report.caseStudies.map((c) => (
              <div key={c.id} className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                <div className="text-[11.5px] font-bold uppercase tracking-[0.03em] text-[var(--accent)]">
                  {c.industry}
                </div>
                <h4 className="text-[16px] font-semibold">{c.title}</h4>
                <p className="text-[14px] text-[var(--text-muted)]">{c.body}</p>
                <div className="text-[13.5px] font-semibold text-[var(--accent-strong)]">効果：{c.effect}</div>
                <div className="font-mono-data mt-auto flex items-center justify-between gap-2 border-t border-dashed border-[var(--border-strong)] pt-2.5 text-[11px] text-[var(--text-muted)]">
                  <span>取得日 {c.fetchedAt}</span>
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="truncate underline decoration-[var(--border-strong)]">
                    情報源
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="③ おすすめの伴走サポート">
          <div className="rounded-2xl bg-[var(--accent-soft)] p-6">
            <h4 className="mb-2 text-[18px] font-semibold">{report.support.name}</h4>
            <p className="text-[14.5px] leading-[1.7] text-[var(--text)] opacity-85">{report.support.description}</p>
          </div>
        </Section>

        <Section title="④ 契約を検討したいAIツール" desc="複数契約で持て余さないよう、全体を通して効果の高い候補にしぼって提示しています。">
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {report.tools.map((t) => (
              <div key={t.id} className="rounded-xl border border-[var(--border)] p-5">
                <div className="flex items-start justify-between gap-2.5">
                  <h4 className="text-[16.5px] font-semibold">{t.name}</h4>
                  <span className="font-mono-data whitespace-nowrap text-[13.5px] font-semibold text-[var(--accent-strong)]">
                    {t.price}
                  </span>
                </div>
                <p className="mt-2 text-[14px] text-[var(--text-muted)]">{t.features}</p>
              </div>
            ))}
          </div>
          <div className="font-mono-data mt-4 flex items-center gap-2 rounded-[10px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] px-3.5 py-2.5 text-[11.5px] text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" />
            料金・事例データは公式ページの取得日時をもとに掲載しています
          </div>
        </Section>
      </div>

      <div className="mt-8 flex justify-end gap-2.5">
        <button type="button" onClick={onBack} className="rounded-[10px] border border-[var(--border-strong)] px-5 py-3.5 text-[15px] text-[var(--text)]">
          チェックリストに戻る
        </button>
        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting}
          className="rounded-[10px] bg-[var(--accent)] px-[26px] py-3.5 text-[15.5px] font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-40"
        >
          {exporting ? "出力中..." : "PDFレポートを出力 ↓"}
        </button>
      </div>
    </section>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h3 className="mb-1.5 text-[21px] font-semibold">{title}</h3>
      {desc && <p className="mb-5 max-w-[62ch] text-[14.5px] leading-[1.65] text-[var(--text-muted)]">{desc}</p>}
      {children}
    </div>
  );
}
