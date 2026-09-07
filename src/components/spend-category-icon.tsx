import type { ReactNode } from "react";
import { SPEND_CATEGORIES } from "@/lib/types";

export const CATEGORY_COLOR: Record<(typeof SPEND_CATEGORIES)[number], string> = {
  Food: "#ea580c",
  Transit: "#3b82f6",
  Stay: "#16a34a",
  Ticket: "#9333ea",
  Shop: "#ca8a04",
  Other: "#78716c",
};

export function categoryColor(category: string | null): string {
  if (category && category in CATEGORY_COLOR) {
    return CATEGORY_COLOR[category as keyof typeof CATEGORY_COLOR];
  }
  return CATEGORY_COLOR.Other;
}

export function SpendCategoryIcon({
  category,
  className = "h-5 w-5",
}: {
  category: string | null;
  className?: string;
}) {
  const color = categoryColor(category);
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {iconFor(category, className)}
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
