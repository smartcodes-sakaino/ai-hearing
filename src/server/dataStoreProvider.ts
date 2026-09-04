import type { DataStore } from "./dataStore.ts";

/**
 * DATA_BACKEND の値に応じて実装を切り替える。
 * localJsonStore.ts は import.meta.url を使ってファイルパスを解決するため
 * Cloudflare Workers上では読み込み時にエラーになる。
 * sheetsStore.ts も googleapis の認証情報が無いとエラーになる。
 * どちらも実際に使わない方をそもそもimportしないよう、両方とも動的importで遅延読み込みする。
 */
let storePromise: Promise<DataStore> | null = null;

export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise =
      process.env.DATA_BACKEND === "sheets"
        ? import("./sheetsStore.ts").then((m) => m.sheetsStore)
        : import("./localJsonStore.ts").then((m) => m.localJsonStore);
  }
  return storePromise;
}
