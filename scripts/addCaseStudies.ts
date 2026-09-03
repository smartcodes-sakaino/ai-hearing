/**
 * 新しい他社事例をCaseStudyMasterに追加する（既存の内容は保持したまま追記する）。
 * 月次の事例収集タスク（Claude Codeスケジュール実行）が、Web検索で見つけて
 * 事実確認まで済ませた事例を書き込むために使う。
 *
 * 入力: 事例オブジェクトの配列を含むJSONファイルへのパスを引数で渡す。
 * [
 *   {
 *     "departmentId": "DEP_001",
 *     "title": "...",
 *     "industry": "...",
 *     "body": "...",
 *     "effect": "...",
 *     "sourceUrl": "https://..."
 *   }
 * ]
 *
 * 実行: npx tsx scripts/addCaseStudies.ts path/to/new-cases.json
 */
import { readFileSync } from "node:fs";
import { loadEnv } from "../src/server/loadEnv.ts";

loadEnv();
process.env.DATA_BACKEND = "sheets";

const filePath = process.argv[2];
if (!filePath) {
  console.error("使い方: npx tsx scripts/addCaseStudies.ts path/to/new-cases.json");
  process.exit(1);
}

interface NewCaseStudy {
  departmentId: string;
  title: string;
  industry: string;
  body: string;
  effect: string;
  sourceUrl: string;
}

const items: NewCaseStudy[] = JSON.parse(readFileSync(filePath, "utf-8"));

const { getStore } = await import("../src/server/dataStoreProvider.ts");
const store = await getStore();

const today = new Date().toISOString().slice(0, 10);
let added = 0;

for (const item of items) {
  if (!item.departmentId || !item.title || !item.sourceUrl) {
    console.error("スキップ（必須項目が不足）:", item);
    continue;
  }
  await store.caseStudies.create({
    departmentId: item.departmentId,
    title: item.title,
    industry: item.industry ?? "",
    body: item.body ?? "",
    effect: item.effect ?? "",
    sourceUrl: item.sourceUrl,
    fetchedAt: today,
    source: "auto",
  } as any);
  added++;
  console.log(`追加: [${item.departmentId}] ${item.title}`);
}

console.log(`完了: ${added}件追加しました。`);
