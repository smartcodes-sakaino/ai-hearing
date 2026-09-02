import type { DataStore } from "./dataStore.ts";
import { localJsonStore } from "./localJsonStore.ts";

/**
 * DATA_BACKEND=sheets のときだけ Google Sheets 実装を読み込む。
 * sheetsStore.ts は googleapis の認証情報が無いとエラーになるため、
 * local運用時はそもそもimportしない（動的importで遅延読み込み）。
 */
let storePromise: Promise<DataStore> | null = null;

export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise =
      process.env.DATA_BACKEND === "sheets"
        ? import("./sheetsStore.ts").then((m) => m.sheetsStore)
        : Promise.resolve(localJsonStore);
  }
  return storePromise;
}
