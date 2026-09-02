import { Router } from "express";
import {
  createSession,
  getSession,
  listCheckItems,
  listDepartments,
  saveAnswers,
  completeSession,
} from "./store.ts";
import { buildReport } from "./report.ts";

export const router = Router();

router.get("/departments", async (_req, res) => {
  res.json(await listDepartments());
});

router.post("/sessions", async (req, res) => {
  const { companyName, departmentIds } = req.body as { companyName?: string; departmentIds?: string[] };
  if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
    res.status(400).json({ error: "departmentIds must contain at least one department" });
    return;
  }
  const session = createSession(companyName ?? "", departmentIds);
  const items = await listCheckItems(departmentIds);
  res.status(201).json({ session, items });
});

router.post("/sessions/:id/answers", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  const { answers } = req.body as { answers?: { itemId: string; score: number }[] };
  if (!Array.isArray(answers)) {
    res.status(400).json({ error: "answers must be an array" });
    return;
  }
  saveAnswers(session.id, answers);
  res.json({ ok: true });
});

router.post("/sessions/:id/report", async (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  completeSession(session.id);
  const report = await buildReport(session.id);
  res.json(report);
});
