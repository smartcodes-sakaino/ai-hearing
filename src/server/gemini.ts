import { GoogleGenAI } from "@google/genai";

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が未設定です（.envを確認してください）");
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

export interface CaseStudyDraft {
  title: string;
  industry: string;
  body: string;
  effect: string;
  sourceUrl: string;
}

function extractJson(text: string): any | null {
  const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

/**
 * Google検索連携（グラウンディング）でGeminiに他社の生成AI活用事例を1件探させる。
 * ハルシネーション対策として、sourceUrlはモデルの出力テキストではなく、
 * 検索結果として実際に返ってきたgroundingMetadataのURLを採用する
 * （検索結果が得られなかった場合はnullを返し、事例を追加しない）。
 */
export async function findCaseStudyForDepartment(
  departmentName: string,
  existingTitles: string[],
): Promise<CaseStudyDraft | null> {
  const client = getClient();

  const avoidList = existingTitles.length
    ? `すでに次の事例は登録済みのため、同じ内容は避けてください: ${existingTitles.join(" / ")}`
    : "";

  const prompt = `あなたは企業のAI活用を支援するコンサルタントです。
「${departmentName}」における生成AI・AIツールの導入事例を、Web検索で1件探してください。
実在する企業名・製品名を用いた、具体的で新しい事例を優先してください。${avoidList}

見つけたら、以下のJSON形式のみで回答してください（説明文やマークダウンは不要です）。
{
  "title": "事例の見出し（30文字程度）",
  "industry": "業種",
  "body": "取り組み内容の要約（100文字程度）",
  "effect": "得られた効果（60文字程度）"
}
見つからない場合は {"title": null} とだけ返してください。`;

  const response = await client.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) return null;

  const json = extractJson(text);
  if (!json || !json.title) return null;

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sourceUrl = chunks.find((c) => c.web?.uri)?.web?.uri;
  // 検索結果の裏付け（実際のURL）が取れない場合は、事例をでっち上げるリスクがあるため採用しない
  if (!sourceUrl) return null;

  return {
    title: String(json.title),
    industry: String(json.industry ?? ""),
    body: String(json.body ?? ""),
    effect: String(json.effect ?? ""),
    sourceUrl,
  };
}

/**
 * 公式料金ページのテキストから、代表的な料金プランを1行で抽出する。
 * 検索は使わず、渡されたテキストの理解のみを行う（このURL自体は事前登録された公式ページのため）。
 */
export async function extractPriceFromPageText(pageText: string): Promise<string | null> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `以下はあるSaaS製品の公式料金ページから抽出したテキストです。
最も標準的な料金プラン（複数ある場合は中間的なプラン）を、
日本語で1行、「¥1,600/ユーザー/月(年払い)」のように簡潔にまとめてください。
料金情報が見つからない場合は「不明」とだけ答えてください。

---
${pageText}`,
  });
  const result = response.text?.trim();
  if (!result || result.includes("不明")) return null;
  return result;
}
