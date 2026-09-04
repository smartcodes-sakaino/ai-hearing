import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./src/server/app.ts";

/**
 * Cloudflare Workers用エントリポイント。
 * .envファイルは読まない（wrangler secret / vars で設定した値が
 * nodejs_compat_populate_process_env によりprocess.envに自動投入される）。
 * 静的アセット（Reactビルド成果物）はwrangler.jsoncのassets bindingが
 * Workerを経由せず直接配信するため、ここではAPIルートのみを扱う。
 */
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET が未設定です。`wrangler secret put SESSION_SECRET` を実行してください。");
}

const app = createApp();
const port = 3000;
app.listen(port);

export default httpServerHandler({ port });
