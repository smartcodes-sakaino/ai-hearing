// Cloudflare Workers用のiconv-liteスタブ。
// 本物のiconv-liteはWorkersランタイム上でバンドル時にクラッシュする
// (node_modules/iconv-lite/lib/index.jsの`require_streams(...) is not a function`)。
// raw-body(express.jsonなどが内部で使用)はリクエストのcharsetに応じて
// iconv.getDecoderを呼び出す。本アプリはUTF-8(既定値)しか扱わないため、
// UTF-8/ASCII/Latin1のみをBufferのネイティブ実装で処理する簡易版に置き換える
// (wrangler.jsoncのaliasで指定)。それ以外のcharsetは416相当のエラーとして扱われる。
const SUPPORTED = new Set(["utf8", "utf-8", "ascii", "latin1", "binary"]);

function normalize(encoding) {
  return String(encoding).toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function nodeEncoding(encoding) {
  const enc = normalize(encoding);
  if (enc === "utf8" || enc === "utf-8") return "utf-8";
  if (enc === "ascii") return "ascii";
  if (enc === "latin1" || enc === "binary") return "latin1";
  return null;
}

function unsupported(encoding) {
  const err = new Error("Encoding not recognized: " + encoding);
  err.code = "EncodingNotSupported";
  return err;
}

function encode(str, encoding) {
  const enc = nodeEncoding(encoding) || "utf-8";
  return Buffer.from(String(str), enc);
}

function decode(buf, encoding) {
  const enc = nodeEncoding(encoding);
  if (!enc) throw unsupported(encoding);
  return Buffer.isBuffer(buf) ? buf.toString(enc) : Buffer.from(buf).toString(enc);
}

function getDecoder(encoding) {
  const enc = nodeEncoding(encoding);
  if (!enc) throw unsupported(encoding);
  let chunks = [];
  return {
    write(chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return "";
    },
    end() {
      const result = Buffer.concat(chunks).toString(enc);
      chunks = [];
      return result;
    },
  };
}

function getEncoder(encoding) {
  const enc = nodeEncoding(encoding);
  if (!enc) throw unsupported(encoding);
  return {
    write(str) {
      return Buffer.from(String(str), enc);
    },
    end() {
      return Buffer.alloc(0);
    },
  };
}

function encodingExists(encoding) {
  return SUPPORTED.has(normalize(encoding));
}

module.exports = { encode, decode, getDecoder, getEncoder, encodingExists };
