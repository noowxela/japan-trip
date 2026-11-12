export type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type SpendMenuPlacement = "below" | "above";

export function placeSpendContextMenu(options: {
  anchor: Rect;
  menuHeight: number;
  viewport: { width: number; height: number };
  padding?: number;
  gap?: number;
  scale?: number;
}): {
  preview: Rect;
  menu: Rect & { placement: SpendMenuPlacement };
  scale: number;
} {
  const padding = options.padding ?? 16;
  const gap = options.gap ?? 8;
  const scale = options.scale ?? 1.04;
  const { anchor, menuHeight, viewport } = options;

  const width = Math.min(anchor.width, Math.max(0, viewport.width - padding * 2));
  const left = clamp(
    anchor.left,
    padding,
    Math.max(padding, viewport.width - padding - width),
  );
  const previewHeight = anchor.height * scale;
  const menuWidth = Math.min(width, 280);
  const menuLeft = clamp(
    left,
    padding,
    Math.max(padding, viewport.width - padding - menuWidth),
  );

  const need = menuHeight + gap;
  const spaceBelow = viewport.height - padding - (anchor.top + previewHeight);
  const spaceAbove = anchor.top - padding;

  let previewTop = anchor.top;
  let placement: SpendMenuPlacement = "below";

  if (spaceBelow >= need) {
    placement = "below";
  } else if (spaceAbove >= need) {
    placement = "above";
  } else if (spaceBelow >= spaceAbove) {
    placement = "below";
    previewTop = Math.max(padding, anchor.top - (need - spaceBelow));
  } else {
    placement = "above";
    const maxTop = viewport.height - padding - previewHeight;
    previewTop = Math.min(maxTop, Math.max(padding + need, anchor.top));
  }

  const menuTop =
    placement === "below"
      ? previewTop + previewHeight + gap
      : previewTop - gap - menuHeight;

  return {
    preview: { top: previewTop, left, width, height: previewHeight },
    menu: {
      top: menuTop,
      left: menuLeft,
      width: menuWidth,
      height: menuHeight,
      placement,
    },
    scale,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
