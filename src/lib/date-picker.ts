export type DatePickerRect = {
  top: number;
  left: number;
  bottom: number;
  width: number;
};

export type DatePickerViewport = {
  width: number;
  height: number;
};

export type DatePickerAnchor = {
  top: number;
  left: number;
  width: number;
  origin: "top" | "bottom";
};

const DEFAULT_GAP = 8;
const DEFAULT_PADDING = 16;

export function getViewportSize(
  win?: Pick<Window, "innerWidth" | "innerHeight" | "visualViewport">,
): DatePickerViewport {
  const view = win ?? (typeof window !== "undefined" ? window : undefined);
  if (!view) return { width: 390, height: 844 };
  const vv = view.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { width: vv.width, height: vv.height };
  }
  return { width: view.innerWidth, height: view.innerHeight };
}

/** Keep the calendar fully on-screen, including iPhone 375px viewports. */
export function placeDatePicker(options: {
  button: DatePickerRect;
  panelHeight: number;
  viewport: DatePickerViewport;
  gap?: number;
  padding?: number;
}): DatePickerAnchor {
  const gap = options.gap ?? DEFAULT_GAP;
  const padding = options.padding ?? DEFAULT_PADDING;
  const { button, panelHeight, viewport } = options;

  const width = Math.min(
    Math.max(button.width, 0),
    Math.max(0, viewport.width - padding * 2),
  );
  const left = clamp(
    button.left,
    padding,
    Math.max(padding, viewport.width - padding - width),
  );

  const spaceBelow = viewport.height - button.bottom - gap - padding;
  const spaceAbove = button.top - gap - padding;
  const openAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;
  const minTop = padding;
  const maxTop = Math.max(minTop, viewport.height - padding - panelHeight);
  const unclamped = openAbove
    ? button.top - panelHeight - gap
    : button.bottom + gap;

  return {
    top: clamp(unclamped, minTop, maxTop),
    left,
    width,
    origin: openAbove ? "bottom" : "top",
  };
}

export function datePickerAnchorsEqual(
  a: DatePickerAnchor | null,
  b: DatePickerAnchor,
): boolean {
  if (!a) return false;
  return (
    a.origin === b.origin &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
