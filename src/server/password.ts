/**
 * パスワードのハッシュ化・検証。
 * Node(ローカル)とCloudflare Workersの両方でネイティブに動くよう、
 * node:crypto等には依存せずWeb Crypto API(globalThis.crypto)のみを使う。
 * WorkersはCPU時間制限が厳しいため(無料プランは1リクエストあたり10ms)、
 * scryptのような重いKDFではなく、ネイティブ実装が速いPBKDF2を使う。
 */
const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

/** 「salt(hex):hash(hex)」形式の文字列を返す */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `${toHex(salt)}:${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = fromHex(saltHex);
  const expected = fromHex(hashHex);
  const candidate = await derive(password, salt);
  return timingSafeEqual(candidate, expected);
}
