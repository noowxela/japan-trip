"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "japan-trip-prep-items";

const DEFAULT_ITEMS = [
  "Book flights",
  "Confirm hotel reservations",
  "Get travel insurance",
  "Activate eSIM or pocket WiFi",
  "Download offline maps",
  "Exchange currency / notify bank",
  "Pack adapters and power bank",
  "Print or save booking confirmations",
];

type PrepItem = {
  id: string;
  label: string;
  done: boolean;
};

function loadItems(): PrepItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ITEMS.map((label, index) => ({
        id: `default-${index}`,
        label,
        done: false,
      }));
    }
    const parsed = JSON.parse(raw) as PrepItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return DEFAULT_ITEMS.map((label, index) => ({
      id: `default-${index}`,
      label,
      done: false,
    }));
  }
}

function saveItems(items: PrepItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function PrepChecklist() {
  const [items, setItems] = useState<PrepItem[]>([]);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(loadItems());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveItems(items);
  }, [items, ready]);

  const doneCount = items.filter((item) => item.done).length;

  function toggle(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addItem(event: React.FormEvent) {
    event.preventDefault();
    const label = draft.trim();
    if (!label) return;
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), label, done: false },
    ]);
    setDraft("");
  }

  if (!ready) {
    return (
      <div className="notebook-card p-4 text-sm text-stone-500">
        Loading checklist…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="notebook-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-stone-700">Progress</p>
          <p className="text-sm text-stone-500">
            {doneCount}/{items.length} done
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-hanko transition-all"
            style={{
              width:
                items.length === 0
                  ? "0%"
                  : `${Math.round((doneCount / items.length) * 100)}%`,
            }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex min-w-0 items-center gap-3 notebook-card p-3"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-label={item.done ? "Mark incomplete" : "Mark complete"}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                item.done
                  ? "border-hanko bg-hanko text-white"
                  : "border-stone-300 bg-white"
              }`}
            >
              {item.done ? (
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              ) : null}
            </button>
            <span
              className={`min-w-0 flex-1 text-sm ${
                item.done
                  ? "text-stone-400 line-through"
                  : "text-stone-800"
              }`}
            >
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Remove ${item.label}`}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={addItem}
        className="flex min-w-0 gap-2 notebook-card p-3"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a prep task…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
        />
        <button
          type="submit"
          className="shrink-0 notebook-btn bg-hanko px-3 py-1.5 text-xs font-medium text-white"
        >
          Add
        </button>
      </form>
    </div>
  );
}
