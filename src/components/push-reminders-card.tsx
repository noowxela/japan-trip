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
import type { PushPrefs } from "@/lib/push-store";

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

function PrefSwitch({
  label,
  detail,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={`notebook-btn relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 motion-reduce:transition-none ${
          checked ? "bg-accent" : "bg-ink-muted/35"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-surface shadow transition-transform motion-reduce:transition-none ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
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
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs>({
    reminders: true,
    countdown: true,
  });
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const configured = Boolean(vapidPublicKey.trim());

  const loadPrefs = useCallback(
    async (ep: string) => {
      if (!storeWritable || !canEdit) {
        setPrefs({ reminders: true, countdown: true });
        setPrefsLoaded(true);
        return;
      }
      try {
        const res = await fetch(
          `/api/push/prefs?endpoint=${encodeURIComponent(ep)}`,
        );
        const data = (await res.json().catch(() => null)) as {
          prefs?: PushPrefs;
        } | null;
        if (res.ok && data?.prefs) {
          setPrefs({
            reminders: data.prefs.reminders !== false,
            countdown: data.prefs.countdown !== false,
          });
        } else {
          setPrefs({ reminders: true, countdown: true });
        }
      } catch {
        setPrefs({ reminders: true, countdown: true });
      } finally {
        setPrefsLoaded(true);
      }
    },
    [canEdit, storeWritable],
  );

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
        const json = sub.toJSON();
        setSubscriptionJson(JSON.stringify(json, null, 2));
        setEndpoint(sub.endpoint);
        setState("subscribed");
        void loadPrefs(sub.endpoint);
        return;
      }
      setSubscriptionJson(null);
      setEndpoint(null);
      setPrefsLoaded(false);
      setState("ready");
    } catch {
      setState("ready");
    }
  }, [loadPrefs]);

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
      setEndpoint(sub.endpoint);

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
          void loadPrefs(sub.endpoint);
          return;
        }
        toast(t("push.enabled"), "success");
        void loadPrefs(sub.endpoint);
      } else {
        toast(t("push.enabledCopyHint"), "success");
        setPrefsLoaded(true);
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
      const ep = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      if (ep && storeWritable) {
        const res = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: ep }),
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
      setEndpoint(null);
      setPrefsLoaded(false);
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

  async function togglePref(key: keyof PushPrefs) {
    if (!endpoint || busy || !storeWritable || !canEdit) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setBusy(true);
    try {
      const res = await fetch("/api/push/prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, prefs: { [key]: next[key] } }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        prefs?: PushPrefs;
      } | null;
      if (!res.ok) {
        setPrefs(previous);
        toast(data?.error ?? t("push.prefsFailed"), "error");
        return;
      }
      if (data?.prefs) {
        setPrefs({
          reminders: data.prefs.reminders !== false,
          countdown: data.prefs.countdown !== false,
        });
      }
    } catch {
      setPrefs(previous);
      toast(t("push.prefsFailed"), "error");
    } finally {
      setBusy(false);
    }
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

  const prefsDisabled = busy || !storeWritable || !prefsLoaded;

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

      {state === "subscribed" ? (
        <div className="space-y-2 border-t border-rule/60 pt-2">
          <PrefSwitch
            label={t("push.prefReminders")}
            detail={t("push.prefRemindersDetail")}
            checked={prefs.reminders}
            disabled={prefsDisabled}
            onToggle={() => void togglePref("reminders")}
          />
          <PrefSwitch
            label={t("push.prefCountdown")}
            detail={t("push.prefCountdownDetail")}
            checked={prefs.countdown}
            disabled={prefsDisabled}
            onToggle={() => void togglePref("countdown")}
          />
          {!storeWritable ? (
            <p className="text-[11px] text-ink-muted">{t("push.prefsReadOnlyHint")}</p>
          ) : null}
        </div>
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
