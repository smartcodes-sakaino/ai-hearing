export interface Department {
  id: string;
  name: string;
  order: number;
}

export interface CheckItem {
  id: string;
  departmentId: string;
  name: string;
  advice: string;
  order: number;
}

export interface CaseStudy {
  id: string;
  departmentId: string;
  title: string;
  industry: string;
  body: string;
  effect: string;
  sourceUrl: string;
  fetchedAt: string;
  source: "auto" | "manual";
}

export interface AiTool {
  id: string;
  name: string;
  officialPriceUrl: string;
  price: string;
  features: string;
  fetchedAt: string;
  enabled: boolean;
  order: number;
  source: "auto" | "manual";
  /** 自動取得に失敗した場合などにtrue。管理者が確認するまで既存の値を保持する */
  needsReview: boolean;
}

/**
 * ai-simulatorの実データ「AI Diagnostic Tool Database」内の「伴走支援リスト」タブ
 * （分類/メニュー名/難易度/消費ポイント/顧客の困りごと/AI活用内容/AI活用内容 境野さんコメント/
 *   具体的に何がどう改善されるか/現状工数/AI活用後工数/月間件数/月間削減時間/削減率/
 *   月間削減額目安/推奨パック/推奨プラン/効果区分）をそのまま読み取り専用で参照する。
 * ai-hearing独自のマスタは持たない。
 */
export interface SupportService {
  id: string;
  category: string; // 分類
  name: string; // メニュー名
  difficulty: string; // 難易度（★の数）
  points: string; // 消費ポイント
  customerProblem: string; // 顧客の困りごと
  aiUsageContent: string; // AI活用内容
  sakainoComment: string; // AI活用内容 境野さんコメント
  improvementDetail: string; // 具体的に何がどう改善されるか
  currentHours: string; // 現状工数
  afterHours: string; // AI活用後工数
  monthlyCount: string; // 月間件数
  monthlyReductionHours: string; // 月間削減時間
  reductionRate: string; // 削減率
  monthlySavingsAmount: string; // 月間削減額目安
  recommendedPack: string; // 推奨パック
  recommendedPlan: string; // 推奨プラン
  effectCategory: string; // 効果区分
}

export const SCALE_LABELS = [
  "全く使っていない",
  "一部の人が個人的に使っている",
  "チームで使い始めている",
  "業務フローに組み込まれている",
  "完全に定着・自動化されている",
] as const;

export type AdminRole = "最高権限" | "管理者権限";
export const ADMIN_ROLES: AdminRole[] = ["最高権限", "管理者権限"];

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  passwordHash: string;
  createdAt: string;
}

export interface HearingSession {
  id: string;
  companyName: string;
  departmentIds: string[];
  createdAt: string;
  status: "answering" | "completed";
}

export interface PriorityEntry {
  itemId: string;
  itemName: string;
  departmentId: string;
  departmentName: string;
  score: number;
  advice: string;
}

export interface ReportData {
  companyName: string;
  departmentNames: string[];
  averageScore: number;
  priorities: PriorityEntry[];
  caseStudies: CaseStudy[];
  support: {
    name: string;
    description: string;
  };
  tools: AiTool[];
}
