"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  addSpend,
  togglePrepItem,
  toggleVisited,
} from "@/app/actions";
import { useToast } from "@/components/toast-provider";
import { useT } from "@/components/i18n-provider";
import {
  formDataFromSpendPayload,
  optimisticSpendFromPayload,
  runAddSpend,
  runTogglePrep,
  runToggleVisited,
  type OfflineEnqueueResult,
} from "@/lib/offline-actions";
import {
  decideReplayResult,
  isNetworkFailure,
  markOutboxSendAttempt,
  type AddSpendPayload,
  type OutboxEntry,
  type TogglePrepPayload,
  type ToggleVisitedPayload,
} from "@/lib/outbox-core";
import {
  deleteOutboxEntry,
  listOutbox,
  putOutboxEntry,
} from "@/lib/outbox";
import type { ActionResult } from "@/lib/action-result";
import type { SpendItem } from "@/lib/types";

const REPLAY_INTERVAL_MS = 30_000;

type OutboxContextValue = {
  online: boolean;
  entries: OutboxEntry[];
  pendingCount: number;
  visitedOverlay: Record<string, boolean>;
  prepOverlay: Record<string, boolean>;
  pendingSpend: SpendItem[];
  replaying: boolean;
  refresh: () => Promise<void>;
  replay: () => Promise<void>;
  retryEntry: (id: string) => Promise<void>;
  markVisited: (
    id: string,
    visited: boolean,
    options?: { silent?: boolean },
  ) => Promise<ActionResult>;
  markPrep: (id: string, done: boolean) => Promise<ActionResult>;
  submitSpend: (
    formData: FormData,
    options?: { silent?: boolean },
  ) => Promise<ActionResult>;
};

const OutboxContext = createContext<OutboxContextValue | null>(null);

function applyEnqueueToast(
  result: OfflineEnqueueResult,
  toast: (message: string, tone?: "success" | "error") => void,
  t: (key: string, vars?: Record<string, string | number>) => string,
  notify: (result: ActionResult) => void | Promise<void>,
) {
  if (result.status === "queued") {
    toast(t("offline.savedQueued"));
    return;
  }
  if (result.status === "error") {
    void notify(result.result);
    return;
  }
  void notify(result.result);
}

export function OutboxProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { t } = useT();
  const router = useRouter();
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [visitedOverlay, setVisitedOverlay] = useState<Record<string, boolean>>(
    {},
  );
  const [prepOverlay, setPrepOverlay] = useState<Record<string, boolean>>({});
  const [replaying, setReplaying] = useState(false);
  const replayLock = useRef(false);

  const refresh = useCallback(async () => {
    const rows = await listOutbox();
    setEntries(rows);
    const visited: Record<string, boolean> = {};
    const prep: Record<string, boolean> = {};
    for (const entry of rows) {
      if (entry.kind === "toggleVisited") {
        const payload = entry.payload as ToggleVisitedPayload;
        visited[payload.id] = payload.visited;
      } else if (entry.kind === "togglePrep") {
        const payload = entry.payload as TogglePrepPayload;
        prep[payload.id] = payload.done;
      }
    }
    setVisitedOverlay(visited);
    setPrepOverlay(prep);
  }, []);

  const replayOne = useCallback(
    async (entry: OutboxEntry): Promise<boolean> => {
      let working = entry;
      try {
        if (entry.kind === "addSpend") {
          working = markOutboxSendAttempt(entry);
          if (working.firstAttemptAt !== entry.firstAttemptAt) {
            await putOutboxEntry(working);
          }
        }

        let result: ActionResult;
        if (working.kind === "toggleVisited") {
          const payload = working.payload as ToggleVisitedPayload;
          const formData = new FormData();
          formData.set("id", payload.id);
          formData.set("visited", payload.visited ? "true" : "false");
          result = await toggleVisited(formData);
        } else if (working.kind === "togglePrep") {
          const payload = working.payload as TogglePrepPayload;
          const formData = new FormData();
          formData.set("id", payload.id);
          formData.set("done", payload.done ? "true" : "false");
          result = await togglePrepItem(formData);
        } else {
          const payload = working.payload as AddSpendPayload;
          result = await addSpend(
            formDataFromSpendPayload(payload, { entry: working }),
          );
        }

        if (result.ok) {
          await deleteOutboxEntry(working.id);
          return true;
        }

        const decision = decideReplayResult({
          entry: working,
          ok: false,
          error: result.error,
          editorRequired: result.code === "editor_required",
        });

        if (decision.action === "keep_editor") {
          await putOutboxEntry({
            ...working,
            lastError: decision.lastError,
          });
          toast(t("offline.needEditor"), "error");
          return false;
        }

        if (decision.action === "keep") {
          await putOutboxEntry({
            ...working,
            attempts: decision.attempts,
            lastError: decision.lastError,
          });
          if (decision.giveUp) {
            toast(
              t("offline.syncFailed", { error: decision.lastError }),
              "error",
            );
          }
        }
        return false;
      } catch (error) {
        const network = isNetworkFailure(error);
        const decision = decideReplayResult({
          entry: working,
          ok: false,
          error: error instanceof Error ? error.message : "error",
          networkError: network,
        });
        if (decision.action === "keep") {
          await putOutboxEntry({
            ...working,
            attempts: decision.attempts,
            lastError: decision.lastError,
          });
        }
        return false;
      }
    },
    [t, toast],
  );

  const replay = useCallback(async () => {
    if (replayLock.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    replayLock.current = true;
    setReplaying(true);
    try {
      const rows = await listOutbox();
      let anyOk = false;
      for (const entry of rows) {
        if (typeof navigator !== "undefined" && !navigator.onLine) break;
        const ok = await replayOne(entry);
        if (ok) anyOk = true;
      }
      await refresh();
      if (anyOk) router.refresh();
    } finally {
      replayLock.current = false;
      setReplaying(false);
    }
  }, [refresh, replayOne, router]);

  const retryEntry = useCallback(
    async (id: string) => {
      const entry = entries.find((row) => row.id === id);
      if (!entry) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast(t("offline.stillOffline"), "error");
        return;
      }
      const ok = await replayOne(entry);
      await refresh();
      if (ok) router.refresh();
    },
    [entries, refresh, replayOne, router, t, toast],
  );

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void refresh();
      void replay();
    }, 0);
    const id = window.setInterval(() => {
      if (navigator.onLine) void replay();
    }, REPLAY_INTERVAL_MS);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [refresh, replay]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void replay();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [replay]);

  const notify = useCallback(
    async (result: ActionResult) => {
      if (result.ok) {
        if (result.message) toast(result.message);
      } else {
        toast(result.error, "error");
      }
    },
    [toast],
  );

  const markVisited = useCallback(
    async (
      id: string,
      visited: boolean,
      options?: { silent?: boolean },
    ) => {
      setVisitedOverlay((current) => ({ ...current, [id]: visited }));
      const outcome = await runToggleVisited(id, visited);
      if (options?.silent) {
        if (outcome.status === "error") void notify(outcome.result);
      } else {
        applyEnqueueToast(outcome, toast, t, notify);
      }
      if (outcome.status === "queued") {
        await refresh();
        return { ok: true as const };
      }
      if (outcome.status === "error") {
        setVisitedOverlay((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        return outcome.result;
      }
      setVisitedOverlay((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      router.refresh();
      return outcome.result;
    },
    [notify, refresh, router, t, toast],
  );

  const markPrep = useCallback(
    async (id: string, done: boolean) => {
      setPrepOverlay((current) => ({ ...current, [id]: done }));
      const outcome = await runTogglePrep(id, done);
      applyEnqueueToast(outcome, toast, t, notify);
      if (outcome.status === "queued") {
        await refresh();
        return { ok: true as const };
      }
      if (outcome.status === "error") {
        setPrepOverlay((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        return outcome.result;
      }
      setPrepOverlay((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      router.refresh();
      return outcome.result;
    },
    [notify, refresh, router, t, toast],
  );

  const submitSpend = useCallback(
    async (formData: FormData, options?: { silent?: boolean }) => {
      const outcome = await runAddSpend(formData);
      if (outcome.status === "queued") {
        if (!options?.silent) toast(t("offline.savedQueued"));
        await refresh();
        // Omit message so ActionForm does not toast again.
        return { ok: true as const };
      }
      if (outcome.status === "error") return outcome.result;
      router.refresh();
      // ActionForm notifies success/error messages from the server action.
      return outcome.result;
    },
    [refresh, router, t, toast],
  );

  const pendingSpend = useMemo(() => {
    return entries
      .filter((entry) => entry.kind === "addSpend")
      .map((entry) =>
        optimisticSpendFromPayload(entry.payload as AddSpendPayload),
      );
  }, [entries]);

  const value = useMemo<OutboxContextValue>(
    () => ({
      online,
      entries,
      pendingCount: entries.length,
      visitedOverlay,
      prepOverlay,
      pendingSpend,
      replaying,
      refresh,
      replay,
      retryEntry,
      markVisited,
      markPrep,
      submitSpend,
    }),
    [
      online,
      entries,
      visitedOverlay,
      prepOverlay,
      pendingSpend,
      replaying,
      refresh,
      replay,
      retryEntry,
      markVisited,
      markPrep,
      submitSpend,
    ],
  );

  return (
    <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>
  );
}

export function useOutbox() {
  const context = useContext(OutboxContext);
  if (!context) {
    throw new Error("useOutbox must be used within OutboxProvider");
  }
  return context;
}

export function useOutboxOptional() {
  return useContext(OutboxContext);
}
