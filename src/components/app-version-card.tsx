"use client";

import { useAppUpdate } from "@/components/app-update-provider";
import {
  btnGhostClass,
  btnPrimaryClass,
  settingsGroupClass,
  settingsRowClass,
} from "@/components/page-shell";

export function AppVersionCard() {
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
      <div className={`${settingsRowClass} border-b border-stone-100`}>
        <div className="min-w-0">
          <p className="text-[17px] text-stone-900">Version</p>
          <p className="text-sm text-stone-500">{runningCommit}</p>
        </div>
        <p className="shrink-0 text-sm tabular-nums text-stone-500">
          {`v${runningVersion}`}
        </p>
      </div>
      <div className={settingsRowClass}>
        <div className="min-w-0">
          <p className="text-[17px] text-stone-900">App update</p>
          <p className="text-sm text-stone-500">
            {updateAvailable ? "New version available" : "Up to date"}
          </p>
        </div>
        {updateAvailable ? (
          <button
            type="button"
            onClick={() => void reloadToLatest()}
            disabled={reloading}
            className={`${btnPrimaryClass} shrink-0`}
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void checkNow()}
            disabled={checking}
            className={`${btnGhostClass} shrink-0`}
          >
            {checking ? "Checking…" : "Check now"}
          </button>
        )}
      </div>
    </div>
  );
}
