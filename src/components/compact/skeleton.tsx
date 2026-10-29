"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n-provider";
import { PageShell } from "@/components/page-shell";

/**
 * Loading skeletons that reuse the compact components' box sizes
 * (PageHeader 16+24px, chips h-7, CompactRow min-h-11 / 50px with secondary,
 * SummaryStrip px-3 py-2) so content swaps in without a layout jump.
 */

const pulseClass = "animate-pulse motion-reduce:animate-none";

/** One placeholder bar. Pass size/shape via className. */
export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block rounded bg-ink/10 ${pulseClass} ${className}`.trim()}
    />
  );
}

/** A text line box (`box` = the real line-height) holding a shorter bar. */
export function SkeletonLine({
  box = "h-5",
  bar = "h-3",
  width = "w-1/2",
  className = "",
}: {
  box?: string;
  bar?: string;
  width?: string;
  className?: string;
}) {
  return (
    <span aria-hidden className={`flex items-center ${box} ${className}`.trim()}>
      <SkeletonBar className={`${bar} ${width}`} />
    </span>
  );
}

/** Live region wrapper; keeps the parent flex gap via its own `gap-3`. */
export function SkeletonStatus({
  children,
  label,
  className = "flex min-w-0 flex-col gap-3",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const { t } = useT();
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label ?? t("common.loading")}
      className={className}
    >
      {children}
    </div>
  );
}

/** PageShell + status region (same padding / gap as real pages). */
export function SkeletonPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <PageShell className={className}>
      <SkeletonStatus>{children}</SkeletonStatus>
    </PageShell>
  );
}

/** Mirrors `PageHeader`: 16px eyebrow + 24px title, optional h-8 action. */
export function SkeletonHeader({
  eyebrow = true,
  titleWidth = "w-16",
  action,
}: {
  eyebrow?: boolean;
  titleWidth?: string;
  action?: "button" | "pair";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <SkeletonLine box="h-4" bar="h-2.5" width="w-12" /> : null}
        <SkeletonLine box="h-6" bar="h-4" width={titleWidth} />
      </div>
      {action === "button" ? (
        <SkeletonBar className="h-8 w-[50px] shrink-0 rounded-full" />
      ) : action === "pair" ? (
        <div className="flex shrink-0 items-center gap-3 pr-3">
          <SkeletonBar className="h-3 w-10" />
          <SkeletonBar className="h-4 w-4 rounded-full" />
        </div>
      ) : null}
    </div>
  );
}

/** Mirrors `ChipRow` / `ChipLinkRow`: h-7 outlined pills, gap-1.5. */
export function SkeletonChips({
  count = 4,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`chip-scroll-fade ${className}`.trim()}>
      <div className="-mx-1 flex gap-1.5 overflow-hidden px-1 pb-0.5">
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            className="inline-flex h-7 shrink-0 items-center rounded-full border border-line bg-surface px-2.5"
          >
            <SkeletonBar className={`h-2.5 ${index % 3 === 1 ? "w-8" : "w-6"}`} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mirrors `SummaryStrip` (one 20px line, optional progress track). */
export function SkeletonStrip({
  progress = false,
  className = "",
}: {
  progress?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-hidden
      className={`rounded-xl border border-line bg-surface px-3 py-2 ${className}`.trim()}
    >
      <SkeletonLine box="h-5" bar="h-3" width="w-4/5" />
      {progress ? <div className="mt-1 h-1.5 rounded-full bg-canvas" /> : null}
    </section>
  );
}

/** Mirrors `SectionHeader` (h-7). */
export function SkeletonSectionHeader({ right = false }: { right?: boolean }) {
  return (
    <div className="flex h-7 items-center justify-between gap-2">
      <SkeletonBar className="h-2.5 w-14" />
      {right ? <SkeletonBar className="h-2.5 w-6" /> : null}
    </div>
  );
}

const TITLE_WIDTHS = ["w-[58%]", "w-[44%]", "w-[66%]", "w-[50%]", "w-[38%]"];
const META_WIDTHS = ["w-[40%]", "w-[52%]", "w-[34%]", "w-[46%]"];

export type SkeletonLeading = "time" | "date" | "check";
export type SkeletonTrailing = "more" | "chevron" | "pair";

/** One `CompactRow`: min-h-11, py-1.5 body, 20px title + 16px secondary. */
export function SkeletonRow({
  index = 0,
  leading,
  secondary = true,
  trailing,
}: {
  index?: number;
  leading?: SkeletonLeading;
  secondary?: boolean;
  trailing?: SkeletonTrailing;
}) {
  return (
    <li className="flex min-h-11 w-full min-w-0 items-center gap-2 px-1">
      {leading ? (
        <div className="flex w-16 shrink-0 flex-col items-end justify-center gap-1 self-stretch">
          {leading === "check" ? (
            <span className="flex h-10 w-10 items-center justify-center">
              <span className="h-6 w-6 rounded-full border-2 border-line" />
            </span>
          ) : (
            <>
              <SkeletonBar className="h-2.5 w-8" />
              {leading === "date" ? <SkeletonBar className="h-2.5 w-6" /> : null}
            </>
          )}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 py-1.5">
        <SkeletonLine
          box="h-5"
          bar="h-3.5"
          width={TITLE_WIDTHS[index % TITLE_WIDTHS.length]}
        />
        {secondary ? (
          <SkeletonLine
            box="mt-0.5 h-4"
            bar="h-2.5"
            width={META_WIDTHS[index % META_WIDTHS.length]}
          />
        ) : null}
      </div>
      {trailing === "chevron" ? (
        <span className="w-4 shrink-0" />
      ) : trailing ? (
        <div className="flex shrink-0 items-center gap-0.5">
          {trailing === "pair" ? (
            <span className="flex h-10 w-12 items-center justify-center">
              <SkeletonBar className="h-4 w-9 rounded-full" />
            </span>
          ) : null}
          <span className="flex h-10 w-10 items-center justify-center">
            <SkeletonBar className="h-1 w-4 rounded-full" />
          </span>
        </div>
      ) : null}
    </li>
  );
}

/** Mirrors `CompactRowList` filled with `rows` × `SkeletonRow`. */
export function SkeletonRows({
  rows,
  leading,
  secondary = true,
  trailing,
}: {
  rows: number;
  leading?: SkeletonLeading;
  secondary?: boolean;
  trailing?: SkeletonTrailing;
}) {
  return (
    <ul
      aria-hidden
      className="overflow-hidden rounded-xl border border-line/80 bg-surface"
    >
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow
          key={index}
          index={index}
          leading={leading}
          secondary={secondary}
          trailing={trailing}
        />
      ))}
    </ul>
  );
}

/** Two-segment / three-segment control placeholder (h-8, first thumb lit). */
export function SkeletonSegmented({ count }: { count: number }) {
  return (
    <div aria-hidden className="flex h-8 rounded-lg bg-canvas p-0.5">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={`flex min-w-0 flex-1 items-center justify-center rounded-md ${
            index === 0 ? "bg-surface shadow-sm" : ""
          }`}
        >
          <SkeletonBar className="h-2.5 w-8" />
        </span>
      ))}
    </div>
  );
}
