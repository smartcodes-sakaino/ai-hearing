/**
 * 現在のCaseStudyMaster（他社事例マスタ）を部門ごとにグルーピングしてJSONで出力する。
 * 月次の事例収集タスクが「どの部門は既に上限（2件）に達しているか」「重複を避けるべきタイトルは何か」を
 * 判断するための一覧取得用。
 *
 * 実行: npx tsx scripts/listCaseStudies.ts
 */
import { loadEnv } from "../src/server/loadEnv.ts";
loadEnv();
process.env.DATA_BACKEND = "sheets";

const { getStore } = await import("../src/server/dataStoreProvider.ts");
const store = await getStore();

const [departments, caseStudies] = await Promise.all([store.departments.list(), store.caseStudies.list()]);

const byDept = departments
  .sort((a, b) => a.order - b.order)
  .map((d) => ({
    departmentId: d.id,
    departmentName: d.name,
    existingCaseStudies: caseStudies
      .filter((c) => c.departmentId === d.id)
      .map((c) => ({ title: c.title, source: c.source, fetchedAt: c.fetchedAt })),
  }));

console.log(JSON.stringify(byDept, null, 2));
