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
}

export interface SupportService {
  id: string;
  name: string;
  category: string;
  content: string;
  problem: string;
  expectedEffect: string;
  order: number;
}

export const SCALE_LABELS = [
  "全く使っていない",
  "一部の人が個人的に使っている",
  "チームで使い始めている",
  "業務フローに組み込まれている",
  "完全に定着・自動化されている",
] as const;

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
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
