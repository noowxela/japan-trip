"use client";

import { useState, useTransition } from "react";
import { addPrepItem, deletePrepItem, togglePrepItem } from "@/app/actions";
import { ActionForm, useActionToast } from "@/components/action-form";
import { useCanEdit } from "@/components/edit-session";
import type { PrepItem } from "@/lib/types";

export function PrepChecklist({ items }: { items: PrepItem[] }) {
  const canEdit = useCanEdit();
  const [formKey, setFormKey] = useState(0);
  const doneCount = items.filter((item) => item.done).length;
  const nextOrder =
    items.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;

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

      {items.length === 0 ? (
        <p className="px-1 text-sm text-stone-500">
          No prep tasks yet. Add one below or fill the Prep database in Notion.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <PrepRow key={item.id} item={item} canEdit={canEdit} />
          ))}
        </ul>
      )}

      {canEdit ? (
        <ActionForm
          key={formKey}
          action={addPrepItem}
          className="flex min-w-0 gap-2 notebook-card p-3"
          onSuccess={() => setFormKey((value) => value + 1)}
        >
          <input type="hidden" name="order" value={nextOrder} />
          <input
            name="name"
            required
            placeholder="Add a prep task…"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            className="shrink-0 notebook-btn bg-hanko px-3 py-1.5 text-xs font-medium text-white"
          >
            Add
          </button>
        </ActionForm>
      ) : null}
    </div>
  );
}

function PrepRow({ item, canEdit }: { item: PrepItem; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();

  return (
    <li className="flex min-w-0 items-center gap-3 notebook-card p-3">
      <button
        type="button"
        disabled={!canEdit || pending}
        onClick={() => {
          if (!canEdit) return;
          const formData = new FormData();
          formData.set("id", item.id);
          formData.set("done", item.done ? "false" : "true");
          startTransition(async () => notify(await togglePrepItem(formData)));
        }}
        aria-label={item.done ? "Mark incomplete" : "Mark complete"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60 ${
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
          item.done ? "text-stone-400 line-through" : "text-stone-800"
        }`}
      >
        {item.name}
      </span>
      {canEdit ? (
        <button
          type="button"
          disabled={pending}
          aria-label={`Remove ${item.name}`}
          onClick={() => {
            const formData = new FormData();
            formData.set("id", item.id);
            startTransition(async () => notify(await deletePrepItem(formData)));
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-60"
        >
          Remove
        </button>
      ) : null}
    </li>
  );
}
