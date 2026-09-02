import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Collection, DataStore, ReadOnlyCollection } from "./dataStore.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dirname, "data");

function filePath(name: string) {
  return path.join(dataDir, `${name}.json`);
}

async function readJson<T>(name: string): Promise<T[]> {
  const raw = await readFile(filePath(name), "utf-8");
  return JSON.parse(raw) as T[];
}

async function writeJson<T>(name: string, items: T[]): Promise<void> {
  await writeFile(filePath(name), JSON.stringify(items, null, 2) + "\n", "utf-8");
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function fileCollection<T extends { id: string }>(name: string, idPrefix: string): Collection<T> {
  return {
    async list() {
      return readJson<T>(name);
    },
    async create(item) {
      const items = await readJson<T>(name);
      const created = { ...item, id: item.id || makeId(idPrefix) } as T;
      items.push(created);
      await writeJson(name, items);
      return created;
    },
    async update(id, patch) {
      const items = await readJson<T>(name);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error(`${name}: id not found: ${id}`);
      items[idx] = { ...items[idx], ...patch, id } as T;
      await writeJson(name, items);
      return items[idx];
    },
    async remove(id) {
      const items = await readJson<T>(name);
      const next = items.filter((i) => i.id !== id);
      await writeJson(name, next);
    },
  };
}

function readOnlyFileCollection<T>(name: string): ReadOnlyCollection<T> {
  return {
    async list() {
      return readJson<T>(name);
    },
  };
}

export const localJsonStore: DataStore = {
  departments: fileCollection("departments", "DEP"),
  checkItems: fileCollection("checkItems", "ITEM"),
  caseStudies: fileCollection("caseStudies", "CASE"),
  aiTools: fileCollection("aiTools", "TOOL"),
  adminAllowList: fileCollection("adminAllowList", "ADMIN"),
  supportServices: readOnlyFileCollection("supportServices"),
};
