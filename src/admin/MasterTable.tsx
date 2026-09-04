import { useEffect, useState } from "react";
import { createResource, listResource, removeResource, updateResource } from "../lib/adminApi.ts";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "password" | "select";
  options?: string[];
}

interface Props {
  title: string;
  description?: string;
  resourcePath: string;
  fields: FieldDef[];
}

type Row = Record<string, any>;

function emptyDraft(fields: FieldDef[]): Row {
  const draft: Row = {};
  for (const f of fields) draft[f.key] = f.type === "boolean" ? false : f.type === "number" ? 0 : "";
  return draft;
}

export default function MasterTable({ title, description, resourcePath, fields }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Row>({});
  const [newDraft, setNewDraft] = useState<Row>(emptyDraft(fields));
  const [adding, setAdding] = useState(false);

  function load() {
    setLoading(true);
    listResource<Row>(resourcePath)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [resourcePath]);

  function startEdit(row: Row) {
    setEditingId(row.id);
    setEditDraft({ ...row });
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await updateResource(resourcePath, editingId, editDraft);
      setEditingId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  }

  async function remove(id: string) {
    if (!confirm("この項目を削除しますか？")) return;
    try {
      await removeResource(resourcePath, id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  async function addNew() {
    try {
      await createResource(resourcePath, newDraft);
      setNewDraft(emptyDraft(fields));
      setAdding(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    }
  }

  function renderInput(field: FieldDef, value: any, onChange: (v: any) => void) {
    if (field.type === "boolean") {
      return (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      );
    }
    if (field.type === "textarea") {
      return (
        <textarea
          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-alt)] px-2 py-1.5 text-[13.5px]"
          rows={2}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    if (field.type === "select") {
      return (
        <select
          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-alt)] px-2 py-1.5 text-[13.5px]"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            選択してください
          </option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-alt)] px-2 py-1.5 text-[13.5px]"
        value={value ?? ""}
        placeholder={field.type === "password" ? "変更する場合のみ入力" : undefined}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
      />
    );
  }

  return (
    <div>
      <h2 className="text-[21px] font-semibold">{title}</h2>
      {description && <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">{description}</p>}
      {error && (
        <div className="mt-3 rounded-lg border border-[var(--priority)] bg-[var(--priority-soft)] px-3 py-2 text-[13px] text-[var(--priority)]">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-[var(--border-strong)] text-left text-[var(--text-muted)]">
              {fields.map((f) => (
                <th key={f.key} className="px-2 py-2 font-semibold">
                  {f.label}
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={fields.length + 1} className="px-2 py-4 text-[var(--text-muted)]">
                  読み込み中...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1} className="px-2 py-4 text-[var(--text-muted)]">
                  データがありません
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] align-top">
                {fields.map((f) => (
                  <td key={f.key} className="max-w-[220px] px-2 py-2">
                    {editingId === row.id
                      ? renderInput(f, editDraft[f.key], (v) => setEditDraft((d) => ({ ...d, [f.key]: v })))
                      : fieldDisplay(row[f.key], f)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-2">
                  {editingId === row.id ? (
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="rounded-md bg-[var(--accent)] px-2 py-1 text-[var(--accent-contrast)]">
                        保存
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-md border border-[var(--border-strong)] px-2 py-1">
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(row)} className="rounded-md border border-[var(--border-strong)] px-2 py-1">
                        編集
                      </button>
                      <button onClick={() => remove(row.id)} className="rounded-md border border-[var(--priority)] px-2 py-1 text-[var(--priority)]">
                        削除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-[13.5px]"
          >
            ＋ 新規追加
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-[12px] font-semibold text-[var(--text-muted)]">{f.label}</label>
                  {renderInput(f, newDraft[f.key], (v) => setNewDraft((d) => ({ ...d, [f.key]: v })))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={addNew} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[13.5px] text-[var(--accent-contrast)]">
                追加する
              </button>
              <button onClick={() => setAdding(false)} className="rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-[13.5px]">
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fieldDisplay(value: any, field: FieldDef) {
  if (field.type === "boolean") return value ? "✓" : "";
  if (field.type === "password") return "••••••••";
  return String(value ?? "");
}
