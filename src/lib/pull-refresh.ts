/** Pixels the user must pull past the top before a refresh is armed. */
export const PULL_THRESHOLD_PX = 64;

/**
 * Downward pull distance while the page is already at the top; 0 when the
 * user is scrolling the page or moving up.
 */
export function pullDistance(
  startY: number,
  currentY: number,
  scrollTop: number,
): number {
  if (scrollTop > 0) return 0;
  return Math.max(0, currentY - startY);
}

export function shouldReleaseRefresh(
  distance: number,
  threshold = PULL_THRESHOLD_PX,
): boolean {
  return distance >= threshold;
}

/** Rubber-band the indicator so it grows more slowly past the threshold. */
export function pulledOffset(
  distance: number,
  threshold = PULL_THRESHOLD_PX,
): number {
  if (distance <= 0) return 0;
  if (distance <= threshold) return distance;
  return threshold + (distance - threshold) * 0.35;
}
