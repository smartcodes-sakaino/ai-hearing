import { Router, type RequestHandler } from "express";
import { refreshAiToolPrices, refreshCaseStudies } from "./batch.ts";
import { asyncHandler } from "./asyncHandler.ts";

export const internalBatchRouter = Router();

/** Google Cloud Schedulerからの呼び出しのみを許可する（共有シークレットヘッダーで検証） */
const requireBatchSecret: RequestHandler = (req, res, next) => {
  const secret = process.env.INTERNAL_BATCH_SECRET;
  if (!secret) {
    res.status(500).json({ error: "INTERNAL_BATCH_SECRET が未設定です（.envを確認してください）" });
    return;
  }
  if (req.header("x-batch-secret") !== secret) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
};

internalBatchRouter.use(requireBatchSecret);

internalBatchRouter.post(
  "/refresh-case-studies",
  asyncHandler(async (_req, res) => {
    const result = await refreshCaseStudies();
    res.json(result);
  }),
);

internalBatchRouter.post(
  "/refresh-ai-tool-prices",
  asyncHandler(async (_req, res) => {
    const result = await refreshAiToolPrices();
    res.json(result);
  }),
);
