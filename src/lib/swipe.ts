export type SwipeAxis = "none" | "horizontal" | "vertical";
export type SwipeDirection = "left" | "right";

/** Movement before axis is decided. */
export const SWIPE_AXIS_LOCK_PX = 10;
/** Distance that commits a swipe when velocity is low. */
export const SWIPE_THRESHOLD_PX = 72;
/** |px/ms| that commits even below threshold. */
export const SWIPE_VELOCITY_PX_MS = 0.45;
/** Minimum |offset| required for a velocity-only commit (avoids jitter flicks). */
export const SWIPE_VELOCITY_MIN_OFFSET_PX = 32;
/** Visual reveal cap before rubber-band. */
export const SWIPE_REVEAL_PX = 88;

export function decideSwipeAxis(
  dx: number,
  dy: number,
  lockPx: number = SWIPE_AXIS_LOCK_PX,
): SwipeAxis {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < lockPx && ady < lockPx) return "none";
  return adx > ady ? "horizontal" : "vertical";
}

/** Positive offset = finger moved right (reveal left action). */
export function rubberBandOffset(
  offset: number,
  limit: number = SWIPE_REVEAL_PX,
  factor = 0.35,
): number {
  const sign = offset < 0 ? -1 : 1;
  const abs = Math.abs(offset);
  if (abs <= limit) return offset;
  return sign * (limit + (abs - limit) * factor);
}

export function commitSwipeDirection(options: {
  offset: number;
  /** Signed velocity in px/ms (positive = moving right). */
  velocity: number;
  threshold?: number;
  velocityThreshold?: number;
  /** Min |offset| for velocity-only commits. */
  velocityMinOffset?: number;
}): SwipeDirection | null {
  const threshold = options.threshold ?? SWIPE_THRESHOLD_PX;
  const velocityThreshold =
    options.velocityThreshold ?? SWIPE_VELOCITY_PX_MS;
  const velocityMinOffset =
    options.velocityMinOffset ?? SWIPE_VELOCITY_MIN_OFFSET_PX;
  const { offset, velocity } = options;

  if (offset >= threshold) return "right";
  if (offset <= -threshold) return "left";

  // Velocity-only: require enough travel and matching signs (no opposite flick).
  if (
    Math.abs(offset) >= velocityMinOffset &&
    velocity >= velocityThreshold &&
    offset > 0
  ) {
    return "right";
  }
  if (
    Math.abs(offset) >= velocityMinOffset &&
    velocity <= -velocityThreshold &&
    offset < 0
  ) {
    return "left";
  }
  return null;
}

export function shouldSuppressClick(didCommitOrDrag: boolean): boolean {
  return didCommitOrDrag;
}

export function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-no-swipe]")) return true;
  const tag = target.closest(
    "button, a, input, textarea, select, label, [role='button']",
  );
  return tag != null;
}
