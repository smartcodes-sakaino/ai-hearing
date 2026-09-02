import { google } from "googleapis";

/**
 * Google Sheets APIクライアント。サービスアカウント（GOOGLE_SERVICE_ACCOUNT_EMAIL /
 * GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY）で認証する。対象スプレッドシートは
 * 事前にこのサービスアカウントのメールアドレスへ「編集者」権限で共有しておく必要がある。
 */
let cachedClient: ReturnType<typeof google.sheets> | null = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY が未設定です（.envを確認してください）",
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export function getSheetsClient() {
  if (!cachedClient) {
    cachedClient = google.sheets({ version: "v4", auth: getAuth() });
  }
  return cachedClient;
}

/** シートの全行を読み取り、1行目をヘッダーとしてオブジェクト配列に変換する */
export async function readTable(spreadsheetId: string, tabName: string): Promise<Record<string, string>[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:Z`,
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body
    .filter((row) => row.some((cell) => cell !== undefined && cell !== ""))
    .map((row) => {
      const obj: Record<string, string> = {};
      header.forEach((key, i) => {
        obj[key] = row[i] ?? "";
      });
      return obj;
    });
}

/** タブを丸ごと上書きする（ヘッダー行＋データ行）。件数が少ないマスタ向けのシンプルな実装 */
export async function writeTable(
  spreadsheetId: string,
  tabName: string,
  header: string[],
  rows: Record<string, string | number | boolean>[],
): Promise<void> {
  const sheets = getSheetsClient();
  const values = [header, ...rows.map((row) => header.map((key) => String(row[key] ?? "")))];
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/** タブが存在しない場合に作成する（初回セットアップ用） */
export async function ensureTab(spreadsheetId: string, tabName: string): Promise<void> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tabName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
    });
  }
}
