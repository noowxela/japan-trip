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
import {
  APP_COMMIT,
  APP_VERSION,
  shortCommit,
  type AppVersionPayload,
} from "@/lib/app-version";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const VERSION_QUERY = "_v";

type AppUpdateContextValue = {
  runningVersion: string;
  runningCommit: string;
  latestVersion: string | null;
  latestCommit: string | null;
  updateAvailable: boolean;
  checking: boolean;
  reloading: boolean;
  checkNow: () => Promise<void>;
  reloadToLatest: () => Promise<void>;
  dismissBanner: () => void;
  bannerVisible: boolean;
};

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

async function fetchLatestVersion(): Promise<AppVersionPayload | null> {
  try {
    const response = await fetch("/api/version", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<AppVersionPayload>;
    if (typeof data.commit !== "string" || typeof data.version !== "string") {
      return null;
    }
    return { version: data.version, commit: shortCommit(data.commit) };
  } catch {
    return null;
  }
}

async function clearClientCaches() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

async function reloadToLatest() {
  try {
    await clearClientCaches();
  } catch {
    // Reload anyway — iOS PWAs still need a hard navigation.
  }
  const url = new URL(window.location.href);
  url.searchParams.set(VERSION_QUERY, Date.now().toString());
  window.location.replace(url.toString());
}

function stripReloadQuery() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(VERSION_QUERY)) return;
  url.searchParams.delete(VERSION_QUERY);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", next);
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [latest, setLatest] = useState<AppVersionPayload | null>(null);
  const [checking, setChecking] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const inFlight = useRef(false);

  const checkNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const payload = await fetchLatestVersion();
      if (payload) setLatest(payload);
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, []);

  const handleReload = useCallback(async () => {
    setReloading(true);
    await reloadToLatest();
  }, []);

  useEffect(() => {
    stripReloadQuery();
    void checkNow();
  }, [checkNow]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkNow]);

  useEffect(() => {
    if (document.visibilityState !== "visible") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkNow();
    }, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [checkNow]);

  const updateAvailable = Boolean(latest && latest.commit !== APP_COMMIT);
  const bannerVisible = updateAvailable && !dismissed;

  const value = useMemo<AppUpdateContextValue>(
    () => ({
      runningVersion: APP_VERSION,
      runningCommit: APP_COMMIT,
      latestVersion: latest?.version ?? null,
      latestCommit: latest?.commit ?? null,
      updateAvailable,
      checking,
      reloading,
      checkNow,
      reloadToLatest: handleReload,
      dismissBanner: () => setDismissed(true),
      bannerVisible,
    }),
    [bannerVisible, checkNow, checking, handleReload, latest, reloading, updateAvailable],
  );

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
      {bannerVisible ? <AppUpdateBanner /> : null}
    </AppUpdateContext.Provider>
  );
}

function AppUpdateBanner() {
  const { reloadToLatest: reload, dismissBanner, reloading } = useAppUpdate();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)]">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-3 bg-hanko px-4 py-2 text-sm text-white shadow-md md:max-w-5xl md:rounded-b-xl"
      >
        <p className="min-w-0 font-medium">New version available</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void reload()}
            disabled={reloading}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-hanko disabled:opacity-60"
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss update banner"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAppUpdate() {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error("useAppUpdate must be used within AppUpdateProvider");
  }
  return context;
}
