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

function scoreAllItems(sessionId: string, departmentIds: string[], deptById: Map<string, Department>): PriorityEntry[] {
  const answers = getAnswers(sessionId);
  return listCheckItems(departmentIds).map((item) => ({
    itemId: item.id,
    itemName: item.name,
    departmentId: item.departmentId,
    departmentName: deptById.get(item.departmentId)?.name ?? "",
    score: answers.get(item.id) ?? 1,
    advice: item.advice,
  }));
}

/** 詳細設計書「1. 着手優先度の抽出ロジック」に対応 */
function buildPriorities(allScores: PriorityEntry[]): PriorityEntry[] {
  const deptOrderIndex = new Map(listDepartments().map((d, i) => [d.id, i]));
  return [...allScores]
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return (deptOrderIndex.get(a.departmentId) ?? 0) - (deptOrderIndex.get(b.departmentId) ?? 0);
    })
    .slice(0, 3);
}

/** 詳細設計書「2. 伴走サポート選定ロジック」に対応 */
function buildSupport(departmentIds: string[], deptById: Map<string, Department>, allScores: PriorityEntry[]) {
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

  const services = listSupportServices();
  const matched = services.find((s) => focusDeptNames.some((name) => s.category.includes(name)));
  const service = matched ?? services[0];

  return {
    name: service.name,
    description: `${service.content}を通じて、${focusDeptNames.join("・")}の優先課題から着手できるよう伴走します。`,
  };
}

/** 詳細設計書「3. おすすめAIツール選定ロジック」「4. 他社事例の集約」に対応 */
export function buildReport(sessionId: string): ReportData | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const deptById = new Map(listDepartments().map((d) => [d.id, d]));
  const departmentIds = session.departmentIds;

  const allScores = scoreAllItems(sessionId, departmentIds, deptById);
  const averageScore = allScores.length
    ? Math.round((allScores.reduce((a, b) => a + b.score, 0) / allScores.length) * 10) / 10
    : 0;

  const perDeptCaseLimit = departmentIds.length > 2 ? 1 : 2;
  const caseStudies = departmentIds.flatMap((id) => listCaseStudies([id]).slice(0, perDeptCaseLimit));

  return {
    companyName: session.companyName,
    departmentNames: departmentIds.map((id) => deptById.get(id)?.name ?? ""),
    averageScore,
    priorities: buildPriorities(allScores),
    caseStudies,
    support: buildSupport(departmentIds, deptById, allScores),
    tools: listAiTools().slice(0, 2),
  };
}
