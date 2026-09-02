import { useState } from "react";
import type { CheckItem, ReportData } from "./types.ts";
import { createSession, fetchReport, saveAnswers } from "./lib/api.ts";
import StartScreen from "./components/StartScreen.tsx";
import ChecklistScreen from "./components/ChecklistScreen.tsx";
import ResultScreen from "./components/ResultScreen.tsx";
import BrandMark from "./components/BrandMark.tsx";

type Step = 1 | 2 | 3;

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<CheckItem[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(companyName: string, departmentIds: string[]) {
    setLoading(true);
    setError(null);
    try {
      const { session, items } = await createSession(companyName, departmentIds);
      setSessionId(session.id);
      setItems(items);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswers(answers: Record<string, number>) {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const entries = Object.entries(answers).map(([itemId, score]) => ({ itemId, score }));
      await saveAnswers(sessionId, entries);
      const reportData = await fetchReport(sessionId);
      setReport(reportData);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-[920px] px-5 pt-8 pb-20">
        <header className="mb-7 flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <BrandMark />
            <div>
              <h1 className="text-[23px] font-semibold">AI活用カルテ</h1>
              <div className="text-[13.5px] text-[var(--text-muted)]">
                導入後の"使いこなし度"を確認するヒアリングシート
              </div>
            </div>
          </div>
          <StepNav step={step} />
        </header>

        {error && (
          <div className="mb-5 rounded-[10px] border border-[var(--priority)] bg-[var(--priority-soft)] px-4 py-3 text-sm text-[var(--priority)]">
            {error}
          </div>
        )}

        {step === 1 && <StartScreen onSubmit={handleStart} loading={loading} />}
        {step === 2 && (
          <ChecklistScreen
            items={items}
            onBack={() => setStep(1)}
            onSubmit={handleSubmitAnswers}
            loading={loading}
          />
        )}
        {step === 3 && report && <ResultScreen report={report} onBack={() => setStep(2)} />}
      </div>
    </div>
  );
}

function StepNav({ step }: { step: Step }) {
  const labels: Record<Step, string> = { 1: "STEP 1・基本情報", 2: "STEP 2・チェック", 3: "STEP 3・診断結果" };
  return (
    <div className="flex items-center gap-1.5 font-mono-data text-[12px]">
      {([1, 2, 3] as Step[]).map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          {i > 0 && <span className="h-px w-3.5 bg-[var(--border-strong)]" />}
          <span
            className={
              "rounded-full border px-3 py-1.5 " +
              (s === step
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                : s < step
                  ? "border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] opacity-45")
            }
          >
            {labels[s]}
          </span>
        </span>
      ))}
    </div>
  );
}
