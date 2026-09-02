/**
 * ai-hearing用スプレッドシート（GOOGLE_SHEETS_SPREADSHEET_ID）に、
 * 5つのタブ（DepartmentMaster / CheckItemMaster / CaseStudyMaster / AIToolMaster / AdminAllowList）を作成し、
 * ローカルJSON（src/server/data/*.json）の内容で**タブの中身を丸ごと置き換える**セットアップスクリプト。
 * 既存の内容がある場合は上書きされる（read-modify-writeの繰り返しではなく一括置き換えのため、
 * 何度実行しても同じ結果になる＝再実行しても安全）。
 *
 * 実行前に .env で以下を設定しておくこと:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEETS_SPREADSHEET_ID
 * 実行: npm run seed:sheets
 */
import { loadEnv } from "../src/server/loadEnv.ts";

loadEnv();

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
if (!spreadsheetId) {
  console.error("GOOGLE_SHEETS_SPREADSHEET_ID が .env に設定されていません。中断します。");
  process.exit(1);
}

const { ensureTab } = await import("../src/server/sheetsClient.ts");
const { seedableCollections } = await import("../src/server/sheetsStore.ts");
const departments = (await import("../src/server/data/departments.json", { with: { type: "json" } })).default;
const checkItems = (await import("../src/server/data/checkItems.json", { with: { type: "json" } })).default;
const caseStudies = (await import("../src/server/data/caseStudies.json", { with: { type: "json" } })).default;
const aiTools = (await import("../src/server/data/aiTools.json", { with: { type: "json" } })).default;
const adminAllowList = (await import("../src/server/data/adminAllowList.json", { with: { type: "json" } })).default;

const TABS = ["DepartmentMaster", "CheckItemMaster", "CaseStudyMaster", "AIToolMaster", "AdminAllowList"];

async function main() {
  console.log(`スプレッドシート ${spreadsheetId} にタブを準備しています...`);
  for (const tab of TABS) {
    await ensureTab(spreadsheetId!, tab);
    console.log(`  - ${tab} OK`);
  }

  console.log("部門マスタを書き込み中...");
  await seedableCollections.departments.replaceAll(departments as any[]);

  console.log("チェック項目マスタを書き込み中...（84件）");
  await seedableCollections.checkItems.replaceAll(checkItems as any[]);

  console.log("他社事例マスタを書き込み中...");
  await seedableCollections.caseStudies.replaceAll(caseStudies as any[]);

  console.log("AIツールマスタを書き込み中...");
  await seedableCollections.aiTools.replaceAll(aiTools as any[]);

  console.log("管理者許可リストを書き込み中...");
  await seedableCollections.adminAllowList.replaceAll(adminAllowList as any[]);

  console.log("完了しました。スプレッドシートを開いて内容を確認してください:");
  console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
}

main().catch((e) => {
  console.error("エラーが発生しました:", e);
  process.exit(1);
});
