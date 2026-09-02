import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4のルートハンドラはasync関数内で例外が起きても自動catchされず、
 * 未処理のPromise拒否でプロセスごと落ちてしまう（Google Sheets APIのエラー等が典型例）。
 * このラッパーで必ずcatchしてnext(err)に渡し、グローバルのエラーハンドラで処理する。
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
