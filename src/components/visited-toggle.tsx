"use client";

import { useTransition } from "react";
import { toggleVisited } from "@/app/actions";
import { useActionToast } from "@/components/action-form";

export function VisitedToggle({
  id,
  visited,
}: {
  id: string;
  visited: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const formData = new FormData();
        formData.set("id", id);
        formData.set("visited", visited ? "false" : "true");
        startTransition(async () => notify(await toggleVisited(formData)));
      }}
      className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${
        visited
          ? "bg-emerald-100 text-emerald-800"
          : "bg-stone-200 text-stone-700"
      }`}
    >
      {pending ? "…" : visited ? "Visited" : "Mark visited"}
    </button>
  );
}
