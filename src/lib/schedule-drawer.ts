export type ScheduleDrawerTab = "pending" | "skipped";

export type ScheduleDrawerOpener =
  | {
      show: false;
      defaultTab: "pending";
      key: null;
      vars: null;
    }
  | {
      show: true;
      defaultTab: ScheduleDrawerTab;
      key:
        | "schedule.pendingCount"
        | "schedule.skippedCount"
        | "schedule.pendingAndSkippedCount";
      vars: { n: number; m?: number };
    };

/** Header control + default tab for the schedule pending/skipped drawer. */
export function scheduleDrawerOpener(
  pendingCount: number,
  skippedCount: number,
): ScheduleDrawerOpener {
  const defaultTab: ScheduleDrawerTab =
    pendingCount > 0 ? "pending" : "skipped";
  if (pendingCount > 0 && skippedCount > 0) {
    return {
      show: true,
      defaultTab,
      key: "schedule.pendingAndSkippedCount",
      vars: { n: pendingCount, m: skippedCount },
    };
  }
  if (pendingCount > 0) {
    return {
      show: true,
      defaultTab,
      key: "schedule.pendingCount",
      vars: { n: pendingCount },
    };
  }
  if (skippedCount > 0) {
    return {
      show: true,
      defaultTab,
      key: "schedule.skippedCount",
      vars: { n: skippedCount },
    };
  }
  return { show: false, defaultTab: "pending", key: null, vars: null };
}

export function isEffectivelySkipped(
  item: { id: string; skipped?: boolean },
  overlay: Readonly<Record<string, boolean>> = {},
): boolean {
  return overlay[item.id] ?? Boolean(item.skipped);
}

export function skippedAgendaItems<T extends { id: string; skipped?: boolean }>(
  agenda: T[],
  overlay: Readonly<Record<string, boolean>> = {},
): T[] {
  return agenda.filter((item) => isEffectivelySkipped(item, overlay));
}
