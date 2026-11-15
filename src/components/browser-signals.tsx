"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "@/components/i18n-provider";
import { isStandaloneDisplay } from "@/lib/app-shell";

type BatteryInfo = { level: number; charging: boolean };

type Signals = {
  screen: string;
  pixelRatio: string;
  timezone: string;
  languages: string;
  platform: string;
  standalone: boolean;
  connection: string | null;
  documentCookie: string;
};

function readSignals(): Signals {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; type?: string };
    mozConnection?: { effectiveType?: string; downlink?: number; type?: string };
    webkitConnection?: {
      effectiveType?: string;
      downlink?: number;
      type?: string;
    };
  };
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  let connection: string | null = null;
  if (conn) {
    const bits = [
      conn.effectiveType,
      conn.type && conn.type !== conn.effectiveType ? conn.type : null,
      typeof conn.downlink === "number" ? `${conn.downlink} Mbps` : null,
    ].filter(Boolean);
    connection = bits.length ? bits.join(" · ") : null;
  }
  return {
    screen: `${window.screen.width}×${window.screen.height}`,
    pixelRatio: String(window.devicePixelRatio || 1),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "—",
    languages: (navigator.languages ?? [navigator.language])
      .filter(Boolean)
      .join(", "),
    platform: navigator.platform || "—",
    standalone: isStandaloneDisplay(),
    connection,
    documentCookie: document.cookie,
  };
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return JSON.stringify(readSignals());
}

function getServerSnapshot() {
  return null;
}

export function BrowserSignals() {
  const { t } = useT();
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [battery, setBattery] = useState<BatteryInfo | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (type: string, listener: () => void) => void;
        removeEventListener: (type: string, listener: () => void) => void;
      }>;
    };
    if (!nav.getBattery) return;
    let manager: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | null =
      null;
    let cancelled = false;
    const sync = () => {
      if (!manager || cancelled) return;
      setBattery({ level: manager.level, charging: manager.charging });
    };
    void nav.getBattery().then((b) => {
      if (cancelled) return;
      manager = b;
      sync();
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
    });
    return () => {
      cancelled = true;
      manager?.removeEventListener("levelchange", sync);
      manager?.removeEventListener("chargingchange", sync);
    };
  }, []);

  if (!snapshot) {
    return (
      <p className="text-[12px] text-ink-muted">{t("cookieLab.unavailable")}</p>
    );
  }

  const signals = JSON.parse(snapshot) as Signals;
  const batteryLabel = battery
    ? `${Math.round(battery.level * 100)}%${
        battery.charging ? ` · ${t("cookieLab.charging")}` : ""
      }`
    : t("cookieLab.unavailable");

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: t("cookieLab.screen"), value: signals.screen },
    { label: t("cookieLab.pixelRatio"), value: signals.pixelRatio },
    { label: t("cookieLab.timezone"), value: signals.timezone },
    {
      label: t("cookieLab.languages"),
      value: signals.languages || t("cookieLab.none"),
    },
    { label: t("cookieLab.platform"), value: signals.platform },
    {
      label: t("cookieLab.standalone"),
      value: signals.standalone ? t("cookieLab.yes") : t("cookieLab.no"),
    },
    {
      label: t("cookieLab.connection"),
      value: signals.connection || t("cookieLab.unavailable"),
    },
    { label: t("cookieLab.battery"), value: batteryLabel },
    {
      label: t("cookieLab.documentCookie"),
      value: signals.documentCookie || t("cookieLab.none"),
      mono: true,
    },
  ];

  return (
    <dl className="divide-y divide-line/70">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-w-0 items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
        >
          <dt className="shrink-0 text-[12px] text-ink-muted">{row.label}</dt>
          <dd
            className={`min-w-0 break-words text-right text-[12px] leading-4 text-ink [overflow-wrap:anywhere] ${
              row.mono ? "font-mono text-[11px]" : ""
            } ${/^\d|Mbps|%$/.test(row.value) ? "tabular-nums whitespace-nowrap" : ""}`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
