"use client";

import { useAppUpdate } from "@/components/app-update-provider";
import { useT } from "@/components/i18n-provider";
import {
  btnGhostClass,
  btnPrimaryClass,
  settingsGroupClass,
  settingsRowClass,
} from "@/components/page-shell";

export function AppVersionCard() {
  const { t } = useT();
  const {
    runningVersion,
    runningCommit,
    updateAvailable,
    checking,
    reloading,
    checkNow,
    reloadToLatest,
  } = useAppUpdate();

  return (
    <div className={settingsGroupClass}>
      <div className={`${settingsRowClass} border-b border-line`}>
        <div className="min-w-0">
          <p className="text-[14px] text-ink">{t("version.label")}</p>
          <p className="text-[12px] text-ink-muted">{runningCommit}</p>
        </div>
        <p className="shrink-0 text-[12px] tabular-nums text-ink-muted">
          {t("version.current", { version: runningVersion })}
        </p>
      </div>
      <div className={settingsRowClass}>
        <div className="min-w-0">
          <p className="text-[14px] text-ink">{t("version.appUpdate")}</p>
          <p className="text-[12px] text-ink-muted">
            {updateAvailable
              ? t("version.updateAvailable")
              : t("version.upToDate")}
          </p>
        </div>
        {updateAvailable ? (
          <button
            type="button"
            onClick={() => void reloadToLatest()}
            disabled={reloading}
            className={`${btnPrimaryClass} shrink-0`}
          >
            {reloading ? t("version.reloading") : t("version.reload")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void checkNow()}
            disabled={checking}
            className={`${btnGhostClass} shrink-0`}
          >
            {checking ? t("version.checking") : t("version.checkNow")}
          </button>
        )}
      </div>
    </div>
  );
}
