import { extractPriceFromPageText } from "./gemini.ts";

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-hearing-bot/1.0; +https://github.com/smartcodes-sakaino/ai-hearing)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 12000);
  } catch {
    return null;
  }
}

/**
 * 公式料金ページから料金情報を取得する。ページ取得・抽出のいずれかに失敗した場合はnullを返す
 * （呼び出し側で既存の料金を保持したまま「要確認」フラグを立てる）。
 * JavaScriptで描画されるページは素のfetchでは中身が取得できず失敗することがある。
 */
export async function fetchOfficialPrice(url: string): Promise<string | null> {
  const text = await fetchPageText(url);
  if (!text) return null;
  return extractPriceFromPageText(text);
}
