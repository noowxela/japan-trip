/** Pixel-distance grouping for trip-map day badges (no MarkerCluster lib). */

export type DayClusterPoint = {
  id: string;
  lat: number;
  lng: number;
  dayIndex: number;
};

export type DayCluster = {
  ids: string[];
  lat: number;
  lng: number;
  dayIndices: number[];
};

export type PixelPoint = { x: number; y: number };

/** Union-find clusters where container-pixel distance < threshold. */
export function clusterByPixelDistance(
  points: DayClusterPoint[],
  pixels: PixelPoint[],
  thresholdPx = 28,
): DayCluster[] {
  const n = points.length;
  if (n === 0) return [];
  if (pixels.length !== n) {
    throw new Error("points and pixels length mismatch");
  }

  const parent = Array.from({ length: n }, (_, i) => i);
  function find(i: number): number {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    let x = i;
    while (parent[x] !== r) {
      const next = parent[x];
      parent[x] = r;
      x = next;
    }
    return r;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  const thresh2 = thresholdPx * thresholdPx;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pixels[i].x - pixels[j].x;
      const dy = pixels[i].y - pixels[j].y;
      if (dx * dx + dy * dy < thresh2) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  return [...groups.values()].map((indexes) => {
    const members = indexes.map((i) => points[i]);
    const dayIndices = [
      ...new Set(members.map((m) => m.dayIndex)),
    ].sort((a, b) => a - b);
    return {
      ids: members.map((m) => m.id),
      lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
      lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
      dayIndices,
    };
  });
}

/** e.g. D5 · D5–7 · D5·D6·D8 · "4" when many non-consecutive. */
export function formatDayGroupLabel(dayIndices: number[]): string {
  if (dayIndices.length === 0) return "?";
  const days = dayIndices.map((i) => i + 1);
  if (days.length === 1) return `D${days[0]}`;

  let consecutive = true;
  for (let i = 1; i < days.length; i++) {
    if (days[i] !== days[i - 1] + 1) {
      consecutive = false;
      break;
    }
  }
  if (consecutive) {
    return `D${days[0]}–${days[days.length - 1]}`;
  }
  if (days.length <= 4) {
    return days.map((d) => `D${d}`).join("·");
  }
  return String(days.length);
}
