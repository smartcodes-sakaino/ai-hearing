import { getStore } from "./dataStoreProvider.ts";
import { findCaseStudyForDepartment } from "./gemini.ts";
import { fetchOfficialPrice } from "./priceFetcher.ts";

export interface BatchResult {
  startedAt: string;
  finishedAt: string;
  added: number;
  updated: number;
  failed: number;
  details: string[];
}

/** 部署あたり自動追加する他社事例の上限（詳細設計書 4.2 参照） */
const MAX_AUTO_CASES_PER_DEPARTMENT = 2;

// 直近の実行結果（プロセスのメモリ上に保持。サーバー再起動で消える点はセッションデータと同様）
let lastCaseStudyRun: BatchResult | null = null;
let lastAiToolRun: BatchResult | null = null;

export function getLastBatchStatus() {
  return { caseStudies: lastCaseStudyRun, aiTools: lastAiToolRun };
}

export async function refreshCaseStudies(): Promise<BatchResult> {
  const startedAt = new Date().toISOString();
  const store = await getStore();
  const departments = await store.departments.list();
  const existing = await store.caseStudies.list();
  const today = new Date().toISOString().slice(0, 10);

  let added = 0;
  let failed = 0;
  const details: string[] = [];

  for (const dept of departments) {
    const existingForDept = existing.filter((c) => c.departmentId === dept.id);
    if (existingForDept.length >= MAX_AUTO_CASES_PER_DEPARTMENT) {
      details.push(`${dept.name}: 既に${existingForDept.length}件あるためスキップ`);
      continue;
    }
    try {
      const draft = await findCaseStudyForDepartment(
        dept.name,
        existingForDept.map((c) => c.title),
      );
      if (!draft) {
        details.push(`${dept.name}: 新規事例なし`);
        continue;
      }
      await store.caseStudies.create({
        departmentId: dept.id,
        title: draft.title,
        industry: draft.industry,
        body: draft.body,
        effect: draft.effect,
        sourceUrl: draft.sourceUrl,
        fetchedAt: today,
        source: "auto",
      } as any);
      added++;
      details.push(`${dept.name}: 追加 - ${draft.title}`);
    } catch (e) {
      failed++;
      details.push(`${dept.name}: エラー - ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  lastCaseStudyRun = { startedAt, finishedAt: new Date().toISOString(), added, updated: 0, failed, details };
  return lastCaseStudyRun;
}

export async function refreshAiToolPrices(): Promise<BatchResult> {
  const startedAt = new Date().toISOString();
  const store = await getStore();
  const tools = await store.aiTools.list();
  const today = new Date().toISOString().slice(0, 10);

  let updated = 0;
  let failed = 0;
  const details: string[] = [];

  for (const tool of tools) {
    try {
      const price = await fetchOfficialPrice(tool.officialPriceUrl);
      if (price) {
        await store.aiTools.update(tool.id, { price, fetchedAt: today, needsReview: false } as any);
        updated++;
        details.push(`${tool.name}: 更新 - ${price}`);
      } else {
        await store.aiTools.update(tool.id, { needsReview: true } as any);
        failed++;
        details.push(`${tool.name}: 取得失敗のため要確認フラグを設定（既存の料金は保持）`);
      }
    } catch (e) {
      failed++;
      details.push(`${tool.name}: エラー - ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  lastAiToolRun = { startedAt, finishedAt: new Date().toISOString(), added: 0, updated, failed, details };
  return lastAiToolRun;
}
