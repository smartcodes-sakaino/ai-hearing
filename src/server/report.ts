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

  const services = await listSupportServices();
  const matched = services.find((s) => focusDeptNames.some((name) => s.category.includes(name)));
  const service = matched ?? services[0];

  return {
    name: service?.name ?? "",
    description: service
      ? `${service.content}を通じて、${focusDeptNames.join("・")}の優先課題から着手できるよう伴走します。`
      : "",
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
