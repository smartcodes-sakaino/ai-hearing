/**
 * マスタデータの読み書きインターフェース。
 * ローカルJSON実装（開発用）とGoogle Sheets実装（本番用）の両方がこの形に従う。
 * DATA_BACKEND環境変数で切り替える（未設定時はlocal）。
 */
export interface Collection<T extends { id: string }> {
  list(): Promise<T[]>;
  create(item: Omit<T, "id"> & { id?: string }): Promise<T>;
  update(id: string, patch: Partial<Omit<T, "id">>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface ReadOnlyCollection<T> {
  list(): Promise<T[]>;
}

export interface DataStore {
  departments: Collection<import("../types.ts").Department>;
  checkItems: Collection<import("../types.ts").CheckItem>;
  caseStudies: Collection<import("../types.ts").CaseStudy>;
  aiTools: Collection<import("../types.ts").AiTool>;
  adminAllowList: Collection<import("../types.ts").AdminUser>;
  /** 伴走支援リストはai-simulatorと共通のシートを読み取り専用で参照する（要件定義書参照） */
  supportServices: ReadOnlyCollection<import("../types.ts").SupportService>;
}
