import { readFileSync, existsSync } from "node:fs";

/**
 * .env を読み込む簡易ローダー（dotenvパッケージを追加しないための自前実装）。
 * KEY=VALUE 形式の行のみサポート。既に設定済みの環境変数は上書きしない。
 */
export function loadEnv(path = ".env") {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
