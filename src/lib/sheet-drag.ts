/**
 * Pure snap / velocity math for the /schedule bottom sheet (SDD 019).
 * Heights are fractions of the sheet root (0–1); velocities are px/ms,
 * positive = finger moving up (sheet growing).
 */

export type VelocitySample = { t: number; y: number };

/** Movement (px) before a pointerdown on the sheet header becomes a drag. */
export const DRAG_THRESHOLD_PX = 10;
/** |velocity| (px/ms) above which a release counts as a flick. */
export const FLICK_VELOCITY = 0.5;
/** Only samples this recent (ms) feed the release velocity. */
export const VELOCITY_WINDOW_MS = 100;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Index of the snap closest to `fraction`. */
export function nearestSnap(snaps: readonly number[], fraction: number) {
  let best = 0;
  let bestDist = Infinity;
  snaps.forEach((snap, index) => {
    const dist = Math.abs(snap - fraction);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  return best;
}

/** Clamp a dragged pixel height to [first snap, last snap] of `rootHeight`. */
export function clampSheetHeight(
  snaps: readonly number[],
  height: number,
  rootHeight: number,
) {
  if (rootHeight <= 0) return height;
  return clamp(
    height,
    rootHeight * snaps[0],
    rootHeight * snaps[snaps.length - 1],
  );
}

/** Keep the last `VELOCITY_WINDOW_MS` of samples (always at least two). */
export function pushSample(
  samples: VelocitySample[],
  sample: VelocitySample,
): VelocitySample[] {
  const next = [...samples, sample];
  const cutoff = sample.t - VELOCITY_WINDOW_MS;
  while (next.length > 2 && next[0].t < cutoff) next.shift();
  return next;
}

/**
 * Upward velocity (px/ms) from recent samples. Pointer `clientY` grows
 * downward, so a finger moving up gives a positive value.
 */
export function releaseVelocity(samples: readonly VelocitySample[], now?: number) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  // A pause before release kills momentum.
  if (now != null && now - last.t > VELOCITY_WINDOW_MS) return 0;
  const first = samples[0];
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (first.y - last.y) / dt;
}

/**
 * Snap to land on after a release: a flick moves one step from `startIndex`
 * in the flick direction (if the drag didn't already pass it); otherwise
 * the nearest snap to the released height.
 */
export function releaseSnap(
  snaps: readonly number[],
  startIndex: number,
  fraction: number,
  velocity: number,
) {
  const nearest = nearestSnap(snaps, fraction);
  if (Math.abs(velocity) < FLICK_VELOCITY) return nearest;
  if (velocity > 0) {
    return clamp(Math.max(nearest, startIndex + 1), 0, snaps.length - 1);
  }
  return clamp(Math.min(nearest, startIndex - 1), 0, snaps.length - 1);
}

/** Tap on the handle: step up through the snaps, wrapping to the lowest. */
export function cycleSnap(snaps: readonly number[], index: number) {
  return index >= snaps.length - 1 ? 0 : index + 1;
}
