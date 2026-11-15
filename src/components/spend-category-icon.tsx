import type { ReactNode } from "react";
import { SPEND_CATEGORIES } from "@/lib/types";

/** Soft tint backgrounds; icons use ink. */
export const CATEGORY_TINT: Record<
  (typeof SPEND_CATEGORIES)[number],
  { bg: string; fg: string }
> = {
  Food: { bg: "var(--maybe-soft)", fg: "var(--ink)" },
  Transit: { bg: "var(--transit-soft)", fg: "var(--ink)" },
  "Ride-hailing": { bg: "var(--transit-soft)", fg: "var(--ink)" },
  Airfare: { bg: "var(--transit-soft)", fg: "var(--ink)" },
  Stay: { bg: "var(--ok-soft)", fg: "var(--ink)" },
  Ticket: { bg: "var(--transit-soft)", fg: "var(--ink)" },
  Shop: { bg: "var(--maybe-soft)", fg: "var(--ink)" },
  Other: { bg: "var(--line)", fg: "var(--ink)" },
};

/** Legacy hex for charts that still need a stroke color (muted). */
export const CATEGORY_COLOR: Record<(typeof SPEND_CATEGORIES)[number], string> = {
  Food: "#a86b0c",
  Transit: "#55697a",
  "Ride-hailing": "#8a5a32",
  Airfare: "#3b6d8c",
  Stay: "#3f7d4e",
  Ticket: "#6b7280",
  Shop: "#92700f",
  Other: "#78716c",
};

export function categoryColor(category: string | null): string {
  if (category && category in CATEGORY_COLOR) {
    return CATEGORY_COLOR[category as keyof typeof CATEGORY_COLOR];
  }
  return CATEGORY_COLOR.Other;
}

export function categoryTint(category: string | null): {
  bg: string;
  fg: string;
} {
  if (category && category in CATEGORY_TINT) {
    return CATEGORY_TINT[category as keyof typeof CATEGORY_TINT];
  }
  return CATEGORY_TINT.Other;
}

export function SpendCategoryIcon({
  category,
  className,
  size = "md",
}: {
  category: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const tint = categoryTint(category);
  const box =
    size === "sm"
      ? "h-6 w-6 rounded-md"
      : "h-10 w-10 rounded-xl";
  const iconClass = className ?? (size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5");
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${box}`}
      style={{ backgroundColor: tint.bg, color: tint.fg }}
      aria-hidden
    >
      {iconFor(category, iconClass)}
    </span>
  );
}

function iconFor(category: string | null, className: string): ReactNode {
  const props = {
    className,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  if (category === "Food") {
    return (
      <svg {...props}>
        <path d="M8 3v10M6 3v6a2 2 0 0 0 4 0V3M16 3v18M16 8h3a2 2 0 0 1 0 4h-3" />
      </svg>
    );
  }
  if (category === "Stay") {
    return (
      <svg {...props}>
        <path d="M3 10h18M5 10V8l7-4 7 4v2M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
    );
  }
  if (category === "Transit") {
    return (
      <svg {...props}>
        <path d="M3 11h18L14 4M10 20h4M5 16h14a2 2 0 0 0 2-2v-3H3v3a2 2 0 0 0 2 2Z" />
      </svg>
    );
  }
  if (category === "Ride-hailing") {
    return (
      <svg {...props}>
        <path d="M5 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M7 16h10M3 13h18l-1.8-5.2A2 2 0 0 0 17.3 6H6.7a2 2 0 0 0-1.9 1.8L3 13Z" />
        <path d="M3 13v3h18v-3" />
      </svg>
    );
  }
  if (category === "Airfare") {
    return (
      <svg {...props}>
        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" />
      </svg>
    );
  }
  if (category === "Ticket") {
    return (
      <svg {...props}>
        <path d="M4 9a2 2 0 0 0 0 6v3h16v-3a2 2 0 0 0 0-6V6H4v3Z" />
        <path d="M12 6v12" />
      </svg>
    );
  }
  if (category === "Shop") {
    return (
      <svg {...props}>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}
