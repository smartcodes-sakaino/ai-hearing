import { useState } from "react";
import type { AdminSessionUser } from "../lib/adminApi.ts";
import { logoutAdmin } from "../lib/adminApi.ts";
import BrandMark from "../components/BrandMark.tsx";
import MasterTable, { type FieldDef } from "./MasterTable.tsx";

const TABS = [
  { key: "departments", label: "部門マスタ" },
  { key: "check-items", label: "チェック項目マスタ" },
  { key: "case-studies", label: "他社事例マスタ" },
  { key: "ai-tools", label: "AIツールマスタ" },
  { key: "allow-list", label: "管理者許可リスト" },
  { key: "support-services", label: "伴走支援リスト" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const FIELD_DEFS: Record<Exclude<TabKey, "support-services">, FieldDef[]> = {
  departments: [
    { key: "name", label: "部門名" },
    { key: "order", label: "表示順", type: "number" },
  ],
  "check-items": [
    { key: "departmentId", label: "部門ID（例: DEP_001）" },
    { key: "name", label: "業務名" },
    { key: "advice", label: "改善アクション文", type: "textarea" },
    { key: "order", label: "表示順", type: "number" },
  ],
  "case-studies": [
    { key: "departmentId", label: "対象部門ID" },
    { key: "title", label: "タイトル" },
    { key: "industry", label: "業種" },
    { key: "body", label: "内容", type: "textarea" },
    { key: "effect", label: "効果" },
    { key: "sourceUrl", label: "情報源URL" },
    { key: "fetchedAt", label: "取得日時" },
  ],
  "ai-tools": [
    { key: "name", label: "ツール名" },
    { key: "officialPriceUrl", label: "公式料金ページURL" },
    { key: "price", label: "料金" },
    { key: "features", label: "特徴", type: "textarea" },
    { key: "fetchedAt", label: "取得日時" },
    { key: "enabled", label: "有効", type: "boolean" },
    { key: "order", label: "表示順", type: "number" },
  ],
  "allow-list": [
    { key: "email", label: "メールアドレス" },
    { key: "displayName", label: "表示名" },
    { key: "role", label: "権限" },
    { key: "createdAt", label: "登録日時" },
  ],
};

export default function AdminDashboard({ user }: { user: AdminSessionUser }) {
  const [tab, setTab] = useState<TabKey>("departments");

  async function handleLogout() {
    await logoutAdmin();
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <div>
            <div className="text-[16px] font-semibold">AI活用カルテ 管理画面</div>
            <div className="text-[12.5px] text-[var(--text-muted)]">
              {user.displayName}（{user.email}）
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-[var(--border-strong)] px-3.5 py-2 text-[13.5px]"
        >
          ログアウト
        </button>
      </header>

      <div className="mx-auto flex max-w-[1100px] gap-6 px-6 py-6">
        <nav className="w-[180px] flex-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "block w-full rounded-lg px-3 py-2 text-left text-[13.5px] " +
                (tab === t.key
                  ? "bg-[var(--accent)] font-semibold text-[var(--accent-contrast)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)]")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {tab === "support-services" ? (
            <SupportServicesPanel />
          ) : (
            <MasterTable
              title={TABS.find((t) => t.key === tab)!.label}
              resourcePath={tab}
              fields={FIELD_DEFS[tab]}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SupportServicesPanel() {
  return (
    <div>
      <h2 className="text-[21px] font-semibold">伴走支援リスト</h2>
      <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.7] text-[var(--text-muted)]">
        伴走支援リストは、ai-simulatorの本番スプレッドシート「AI Diagnostic Tool Database」内の
        「伴走支援リスト」タブを読み取り専用で参照しています。
        内容の追加・編集は下記のシートを直接開いて行ってください（このアプリからは編集できません）。
      </p>
      <a
        href="https://docs.google.com/spreadsheets/d/1_zk31r0pmg-HDRUOj4W1y63IRQp_c6Ing6yISe8yzT4/edit"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 py-2.5 text-[14px] font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
      >
        シートを開く ↗
      </a>
    </div>
  );
}
