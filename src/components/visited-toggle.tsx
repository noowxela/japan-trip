"use client";

import { useState, useTransition } from "react";
import { useCanEdit } from "@/components/edit-session";
import { HankoStamp } from "@/components/hanko-stamp";
import { useT } from "@/components/i18n-provider";
import { useOutbox } from "@/components/outbox-provider";
import { useToast } from "@/components/toast-provider";

export function VisitedToggle({
  id,
  visited,
}: {
  id: string;
  visited: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [pop, setPop] = useState(false);
  const canEdit = useCanEdit();
  const { t } = useT();
  const { toast } = useToast();
  const { markVisited, visitedOverlay } = useOutbox();
  const effective = visitedOverlay[id] ?? visited;

  if (!canEdit) {
    return effective ? (
      <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ok-soft px-3 text-xs font-medium text-ok">
        <HankoStamp variant="ok">{t("theme.stampVisited")}</HankoStamp>
        ✓ {t("places.filterVisited")}
      </span>
    ) : (
      <span className="inline-flex min-h-11 items-center rounded-full bg-canvas px-3 text-xs font-medium text-ink-muted">
        {t("places.notVisited")}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const next = !effective;
        if (next) {
          setPop(true);
          window.setTimeout(() => setPop(false), 450);
        }
        startTransition(async () => {
          await markVisited(id, next);
          toast(
            next ? t("action.markedVisited") : t("action.markedUnvisited"),
            {
              actionLabel: t("common.undo"),
              onAction: () => {
                void markVisited(id, !next);
              },
            },
          );
        });
      }}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium disabled:opacity-60 ${
        effective ? "bg-ok-soft text-ok" : "bg-canvas text-ink"
      }`}
    >
      {pending ? (
        "…"
      ) : effective ? (
        <>
          <HankoStamp variant="ok" pop={pop}>
            {t("theme.stampVisited")}
          </HankoStamp>
          ✓ {t("places.filterVisited")}
        </>
      ) : (
        t("agenda.markVisited")
      )}
    </button>
  );
}
