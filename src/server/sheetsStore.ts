import { readTable, writeTable } from "./sheetsClient.ts";
import type { Collection, DataStore, ReadOnlyCollection } from "./dataStore.ts";
import type {
  AdminUser,
  AiTool,
  CaseStudy,
  CheckItem,
  Department,
  SupportService,
} from "../types.ts";

/**
 * Google Sheetsをデータストアとして使う実装。
 * ai-hearing専用のスプレッドシート（GOOGLE_SHEETS_SPREADSHEET_ID）に
 * DepartmentMaster / CheckItemMaster / CaseStudyMaster / AIToolMaster / AdminAllowList の
 * 5タブを用意しておく（初回は「チェック項目マスタ_初期データ_ai-hearing」等の内容を
 * 手動でこのスプレッドシートにコピーするか、タブ名をそれぞれ合わせて共有すること）。
 * 伴走支援リストはai-simulatorと共通の別スプレッドシート（GOOGLE_SHEETS_SUPPORT_SPREADSHEET_ID）を
 * 読み取り専用で参照する。
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が未設定です（.envを確認してください）`);
  return value;
}

function mainSpreadsheetId() {
  return requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
}

function supportSpreadsheetId() {
  return requiredEnv("GOOGLE_SHEETS_SUPPORT_SPREADSHEET_ID");
}

function supportTabName() {
  return process.env.GOOGLE_SHEETS_SUPPORT_TAB_NAME || "Sheet1";
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function sheetCollection<T extends { id: string }>(
  tabName: string,
  idPrefix: string,
  header: string[],
  toRow: (item: T) => Record<string, string | number | boolean>,
  fromRow: (row: Record<string, string>) => T,
): Collection<T> {
  const spreadsheetId = () => mainSpreadsheetId();

  async function listRaw(): Promise<T[]> {
    const rows = await readTable(spreadsheetId(), tabName);
    return rows.map(fromRow);
  }

  async function saveAll(items: T[]): Promise<void> {
    await writeTable(spreadsheetId(), tabName, header, items.map(toRow));
  }

  return {
    list: listRaw,
    async create(item) {
      const items = await listRaw();
      const created = { ...item, id: item.id || makeId(idPrefix) } as T;
      items.push(created);
      await saveAll(items);
      return created;
    },
    async update(id, patch) {
      const items = await listRaw();
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error(`${tabName}: id not found: ${id}`);
      items[idx] = { ...items[idx], ...patch, id } as T;
      await saveAll(items);
      return items[idx];
    },
    async remove(id) {
      const items = await listRaw();
      await saveAll(items.filter((i) => i.id !== id));
    },
  };
}

const departments = sheetCollection<Department>(
  "DepartmentMaster",
  "DEP",
  ["部門ID", "部門名", "表示順"],
  (d) => ({ 部門ID: d.id, 部門名: d.name, 表示順: d.order }),
  (r) => ({ id: r["部門ID"], name: r["部門名"], order: Number(r["表示順"] || 0) }),
);

const checkItems = sheetCollection<CheckItem>(
  "CheckItemMaster",
  "ITEM",
  ["項目ID", "部門ID", "業務名", "改善アクション文", "表示順"],
  (c) => ({
    項目ID: c.id,
    部門ID: c.departmentId,
    業務名: c.name,
    改善アクション文: c.advice,
    表示順: c.order,
  }),
  (r) => ({
    id: r["項目ID"],
    departmentId: r["部門ID"],
    name: r["業務名"],
    advice: r["改善アクション文"],
    order: Number(r["表示順"] || 0),
  }),
);

const caseStudies = sheetCollection<CaseStudy>(
  "CaseStudyMaster",
  "CASE",
  ["事例ID", "対象部門ID", "タイトル", "業種", "内容", "効果", "情報源URL", "取得日時"],
  (c) => ({
    事例ID: c.id,
    対象部門ID: c.departmentId,
    タイトル: c.title,
    業種: c.industry,
    内容: c.body,
    効果: c.effect,
    情報源URL: c.sourceUrl,
    取得日時: c.fetchedAt,
  }),
  (r) => ({
    id: r["事例ID"],
    departmentId: r["対象部門ID"],
    title: r["タイトル"],
    industry: r["業種"],
    body: r["内容"],
    effect: r["効果"],
    sourceUrl: r["情報源URL"],
    fetchedAt: r["取得日時"],
  }),
);

const aiTools = sheetCollection<AiTool>(
  "AIToolMaster",
  "TOOL",
  ["ツールID", "ツール名", "公式料金ページURL", "料金", "特徴", "取得日時", "有効フラグ", "表示順"],
  (t) => ({
    ツールID: t.id,
    ツール名: t.name,
    公式料金ページURL: t.officialPriceUrl,
    料金: t.price,
    特徴: t.features,
    取得日時: t.fetchedAt,
    有効フラグ: t.enabled,
    表示順: t.order,
  }),
  (r) => ({
    id: r["ツールID"],
    name: r["ツール名"],
    officialPriceUrl: r["公式料金ページURL"],
    price: r["料金"],
    features: r["特徴"],
    fetchedAt: r["取得日時"],
    enabled: r["有効フラグ"] === "true" || r["有効フラグ"] === "TRUE",
    order: Number(r["表示順"] || 0),
  }),
);

const adminAllowList = sheetCollection<AdminUser>(
  "AdminAllowList",
  "ADMIN",
  ["管理者ID", "メールアドレス", "表示名", "権限", "登録日時"],
  (a) => ({
    管理者ID: a.id,
    メールアドレス: a.email,
    表示名: a.displayName,
    権限: a.role,
    登録日時: a.createdAt,
  }),
  (r) => ({
    id: r["管理者ID"],
    email: r["メールアドレス"],
    displayName: r["表示名"],
    role: r["権限"],
    createdAt: r["登録日時"],
  }),
);

const supportServices: ReadOnlyCollection<SupportService> = {
  async list() {
    const rows = await readTable(supportSpreadsheetId(), supportTabName());
    return rows.map((r) => ({
      id: r["サービスID"],
      name: r["サービス名"],
      category: r["対応カテゴリ"],
      content: r["支援内容"],
      problem: r["解決課題"],
      expectedEffect: r["期待効果"],
      order: Number(r["表示順"] || 0),
    }));
  },
};

export const sheetsStore: DataStore = {
  departments,
  checkItems,
  caseStudies,
  aiTools,
  adminAllowList,
  supportServices,
};
