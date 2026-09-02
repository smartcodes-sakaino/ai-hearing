import type { Department, PriorityEntry, ReportData } from "../types.ts";
import {
  getAnswers,
  getSession,
  listAiTools,
  listCaseStudies,
  listCheckItems,
  listDepartments,
  listSupportServices,
} from "./store.ts";

async function scoreAllItems(
  sessionId: string,
  departmentIds: string[],
  deptById: Map<string, Department>,
): Promise<PriorityEntry[]> {
  const answers = getAnswers(sessionId);
  const items = await listCheckItems(departmentIds);
  return items.map((item) => ({
    itemId: item.id,
    itemName: item.name,
    departmentId: item.departmentId,
    departmentName: deptById.get(item.departmentId)?.name ?? "",
    score: answers.get(item.id) ?? 1,
    advice: item.advice,
  }));
}

/** 詳細設計書「1. 着手優先度の抽出ロジック」に対応 */
function buildPriorities(allScores: PriorityEntry[], deptOrderIndex: Map<string, number>): PriorityEntry[] {
  return [...allScores]
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return (deptOrderIndex.get(a.departmentId) ?? 0) - (deptOrderIndex.get(b.departmentId) ?? 0);
    })
    .slice(0, 3);
}

/**
 * 部署名 → 伴走支援リストの「分類」列の値。
 * 実データ（AI Diagnostic Tool Database内「伴走支援リスト」タブ）は複数の時期にまたがって
 * 追加されてきた経緯があり、分類名の付け方が完全には統一されていない
 * （例:「カスタマーサポート」「カスタマーサポート部」の両方が存在する、
 * 総務部と法務部が「管理部門・総務・法務」としてまとめて登録されている等）ため、
 * 一部の部署は複数の分類名を候補として持たせている。分類が新設・変更された場合はここを更新する。
 * 経理部は対応する分類が現状シート上に存在しない。
 */
const DEPARTMENT_TO_SUPPORT_CATEGORIES: Record<string, string[]> = {
  "営業部": ["営業"],
  "人事部": ["人事・採用"],
  "総務部": ["管理部門・総務・法務"],
  "情報システム部": ["開発・情報システム"],
  "マーケティング部": ["マーケティング", "広告・制作"],
  "経営企画部": ["経営企画・社長室"],
  "広報部": ["広報部"],
  "法務部": ["法務部", "管理部門・総務・法務"],
  "購買・調達部": ["購買・調達部"],
  "製造部": ["製造部"],
  "品質管理部": ["品質管理部"],
  "物流・倉庫管理部": ["物流・倉庫管理部"],
  "カスタマーサポート部": ["カスタマーサポート部", "カスタマーサポート"],
  "研究開発部": ["研究開発部"],
};

/** 詳細設計書「2. 伴走サポート選定ロジック」に対応 */
async function buildSupport(
  departmentIds: string[],
  deptById: Map<string, Department>,
  allScores: PriorityEntry[],
) {
  const perDeptAvg = departmentIds.map((deptId) => {
    const deptScores = allScores.filter((s) => s.departmentId === deptId);
    const avg = deptScores.length ? deptScores.reduce((a, b) => a + b.score, 0) / deptScores.length : 0;
    return { deptId, avg };
  });

  const focusDeptNames = [...perDeptAvg]
    .sort((a, b) => a.avg - b.avg)
    .slice(0, Math.min(2, perDeptAvg.length))
    .map((x) => deptById.get(x.deptId)?.name ?? "")
    .filter(Boolean);

  const candidateCategories = focusDeptNames.flatMap((name) => DEPARTMENT_TO_SUPPORT_CATEGORIES[name] ?? []);

  const services = await listSupportServices();
  const matched = services.find((s) => candidateCategories.includes(s.category));
  const service = matched ?? services[0];

  if (!service) {
    return { name: "", description: "" };
  }

  return {
    name: `${service.name}（${service.category}）`,
    description:
      `${service.sakainoComment} ` +
      `${service.improvementDetail} ` +
      (service.monthlySavingsAmount ? `月間削減額目安：${service.monthlySavingsAmount}。` : ""),
  };
}

/** 詳細設計書「3. おすすめAIツール選定ロジック」「4. 他社事例の集約」に対応 */
export async function buildReport(sessionId: string): Promise<ReportData | null> {
  const session = getSession(sessionId);
  if (!session) return null;

  const departments = await listDepartments();
  const deptById = new Map(departments.map((d) => [d.id, d]));
  const deptOrderIndex = new Map(departments.map((d, i) => [d.id, i]));
  const departmentIds = session.departmentIds;

  const allScores = await scoreAllItems(sessionId, departmentIds, deptById);
  const averageScore = allScores.length
    ? Math.round((allScores.reduce((a, b) => a + b.score, 0) / allScores.length) * 10) / 10
    : 0;

  const perDeptCaseLimit = departmentIds.length > 2 ? 1 : 2;
  const caseStudyLists = await Promise.all(departmentIds.map((id) => listCaseStudies([id])));
  const caseStudies = caseStudyLists.flatMap((list) => list.slice(0, perDeptCaseLimit));

  const tools = await listAiTools();

  return {
    companyName: session.companyName,
    departmentNames: departmentIds.map((id) => deptById.get(id)?.name ?? ""),
    averageScore,
    priorities: buildPriorities(allScores, deptOrderIndex),
    caseStudies,
    support: await buildSupport(departmentIds, deptById, allScores),
    tools: tools.slice(0, 2),
  };
}
