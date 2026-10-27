"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEditSession } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
} from "@/components/page-shell";

type SupportState =
  | "loading"
  | "unsupported"
  | "needs-https"
  | "ios-install"
  | "ready"
  | "denied"
  | "subscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PushRemindersCard({
  vapidPublicKey,
  storeWritable,
}: {
  vapidPublicKey: string;
  storeWritable: boolean;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const { canEdit } = useEditSession();
  const [state, setState] = useState<SupportState>("loading");
  const [busy, setBusy] = useState(false);
  const [subscriptionJson, setSubscriptionJson] = useState<string | null>(null);

  const configured = Boolean(vapidPublicKey.trim());

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!window.isSecureContext && location.hostname !== "localhost") {
      setState("needs-https");
      return;
    }
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    if (isIos() && !isStandaloneDisplay()) {
      setState("ios-install");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscriptionJson(JSON.stringify(sub.toJSON(), null, 2));
        setState("subscribed");
        return;
      }
      setSubscriptionJson(null);
      setState("ready");
    } catch {
      setState("ready");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const statusLabel = useMemo(() => {
    switch (state) {
      case "loading":
        return t("push.statusLoading");
      case "unsupported":
        return t("push.statusUnsupported");
      case "needs-https":
        return t("push.statusHttps");
      case "ios-install":
        return t("push.statusIosInstall");
      case "denied":
        return t("push.statusDenied");
      case "subscribed":
        return t("push.statusOn");
      default:
        return t("push.statusOff");
    }
  }, [state, t]);

  async function enable() {
    if (!configured || busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "ready");
        toast(t("push.permissionDenied"), "error");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey.trim(),
        ) as BufferSource,
      });
      const json = sub.toJSON();
      setSubscriptionJson(JSON.stringify(json, null, 2));

      if (storeWritable) {
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          toast(data?.error ?? t("push.subscribeFailed"), "error");
          setState("subscribed");
          return;
        }
        toast(t("push.enabled"), "success");
      } else {
        toast(t("push.enabledCopyHint"), "success");
      }
      setState("subscribed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("push.subscribeFailed");
      toast(message, "error");
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      if (endpoint && storeWritable) {
        const res = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          toast(data?.error ?? t("push.disableFailed"), "error");
        } else {
          toast(t("push.disabled"), "success");
        }
      } else {
        toast(t("push.disabled"), "success");
      }
      setSubscriptionJson(null);
      setState("ready");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("push.disableFailed");
      toast(message, "error");
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  async function sendTest() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        sent?: number;
      } | null;
      if (!res.ok) {
        toast(data?.error ?? t("push.testFailed"), "error");
        return;
      }
      toast(t("push.testSent"), "success");
    } catch {
      toast(t("push.testFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function copySubscription() {
    if (!subscriptionJson) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          toast(t("push.noSubscription"), "error");
          return;
        }
        const text = JSON.stringify(sub.toJSON(), null, 2);
        setSubscriptionJson(text);
        await navigator.clipboard.writeText(text);
      } catch {
        toast(t("push.copyFailed"), "error");
        return;
      }
    } else {
      try {
        await navigator.clipboard.writeText(subscriptionJson);
      } catch {
        toast(t("push.copyFailed"), "error");
        return;
      }
    }
    toast(t("push.copied"), "success");
  }

  if (!configured) {
    return (
      <div className={`${cardClass} !rounded-xl !p-3`}>
        <p className="text-[14px] font-medium text-ink">{t("push.title")}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{t("push.notConfigured")}</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className={`${cardClass} !rounded-xl !p-3`}>
        <p className="text-[14px] font-medium text-ink">{t("push.title")}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{t("push.unlockFirst")}</p>
      </div>
    );
  }

  return (
    <div className={`${cardClass} space-y-3 !rounded-xl !p-3`}>
      <div>
        <p className="text-[14px] font-medium text-ink">{t("push.title")}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{t("push.detail")}</p>
        <p className="mt-1.5 text-[12px] text-ink-muted" role="status">
          {statusLabel}
        </p>
      </div>

      {state === "ios-install" ? (
        <ol className="list-decimal space-y-1 pl-4 text-[12px] text-ink-muted">
          <li>{t("push.iosStep1")}</li>
          <li>{t("push.iosStep2")}</li>
          <li>{t("push.iosStep3")}</li>
          <li>{t("push.iosStep4")}</li>
        </ol>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {state === "subscribed" ? (
          <button
            type="button"
            className={`${btnGhostClass} min-h-11`}
            disabled={busy}
            onClick={() => void disable()}
            aria-label={t("push.disable")}
          >
            {t("push.disable")}
          </button>
        ) : (
          <button
            type="button"
            className={`${btnPrimaryClass} min-h-11`}
            disabled={
              busy ||
              state === "unsupported" ||
              state === "needs-https" ||
              state === "ios-install" ||
              state === "denied" ||
              state === "loading"
            }
            onClick={() => void enable()}
            aria-label={t("push.enable")}
          >
            {t("push.enable")}
          </button>
        )}
        <button
          type="button"
          className={`${btnGhostClass} min-h-11`}
          disabled={busy || state === "loading"}
          onClick={() => void sendTest()}
          aria-label={t("push.sendTest")}
        >
          {t("push.sendTest")}
        </button>
        <button
          type="button"
          className={`${btnGhostClass} min-h-11`}
          disabled={busy}
          onClick={() => void copySubscription()}
          aria-label={t("push.copyJson")}
        >
          {t("push.copyJson")}
        </button>
      </div>

      {!storeWritable ? (
        <p className="text-[11px] text-ink-muted">{t("push.envFallbackHint")}</p>
      ) : null}
    </div>
  );
}
