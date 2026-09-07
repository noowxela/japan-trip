"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { fieldClass } from "@/components/page-shell";
import { formatDay, tokyoToday } from "@/lib/format";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const SWIPE_PX = 48;
const ANIM_MS = 220;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const PANEL_ESTIMATE = 360;
const GAP = 8;

const monthTitle = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthParts(value: string) {
  const key = value || tokyoToday();
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(year, month - 1 + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

type Cell = {
  key: string;
  day: number;
  inMonth: boolean;
};

function monthCells(year: number, month: number): Cell[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevDays = new Date(year, month - 1, 0).getDate();
  const cells: Cell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevDays - i;
    const prev = shiftMonth(year, month, -1);
    cells.push({ key: ymd(prev.year, prev.month, day), day, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: ymd(year, month, day), day, inMonth: true });
  }
  const next = shiftMonth(year, month, 1);
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      key: ymd(next.year, next.month, nextDay),
      day: nextDay,
      inMonth: false,
    });
    nextDay += 1;
  }
  return cells;
}

type Anchor = {
  top: number;
  left: number;
  width: number;
  origin: "top" | "bottom";
};

function anchorFromButton(
  button: HTMLElement,
  panelHeight = PANEL_ESTIMATE,
): Anchor {
  const rect = button.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - GAP - 16;
  const above = spaceBelow < panelHeight && rect.top > spaceBelow;
  return {
    left: rect.left,
    width: rect.width,
    top: above ? rect.top - panelHeight - GAP : rect.bottom + GAP,
    origin: above ? "bottom" : "top",
  };
}

export function DatePicker({
  name,
  value,
  onChange,
  tripDates,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  tripDates?: ReadonlySet<string>;
}) {
  const selected = value || tokyoToday();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [{ year, month }, setView] = useState(() => monthParts(selected));
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const today = tokyoToday();

  useEffect(() => {
    if (!mounted) return;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShown(true));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    function sync() {
      const button = buttonRef.current;
      if (!button) return;
      setAnchor(
        anchorFromButton(button, panelRef.current?.offsetHeight ?? PANEL_ESTIMATE),
      );
    }

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [mounted, year, month]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closePicker();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted]);

  function openPicker() {
    closingRef.current = false;
    setView(monthParts(selected));
    const button = buttonRef.current;
    if (button) setAnchor(anchorFromButton(button));
    setMounted(true);
  }

  function closePicker() {
    if (closingRef.current || !mounted) return;
    closingRef.current = true;
    setShown(false);
    window.setTimeout(() => {
      setMounted(false);
      closingRef.current = false;
    }, ANIM_MS);
  }

  function go(delta: number) {
    setView((view) => shiftMonth(view.year, view.month, delta));
  }

  function pick(key: string, inMonth: boolean) {
    onChange(key);
    if (!inMonth) setView(monthParts(key));
    closePicker();
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = startXRef.current;
    startXRef.current = null;
    if (startX == null) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = Math.abs(touch.clientY - startYRef.current);
    if (Math.abs(dx) < SWIPE_PX || dy > Math.abs(dx)) return;
    go(dx < 0 ? 1 : -1);
  }

  const popover =
    mounted && anchor && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close date picker"
              onClick={closePicker}
              className="absolute inset-0 bg-stone-900/25"
              style={{
                opacity: shown ? 1 : 0,
                transition: `opacity ${ANIM_MS}ms ${EASE}`,
              }}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Choose date"
              className="absolute rounded-2xl border border-sage bg-paper p-3 shadow-xl will-change-transform"
              style={{
                top: anchor.top,
                left: anchor.left,
                width: anchor.width,
                transformOrigin:
                  anchor.origin === "top" ? "top center" : "bottom center",
                opacity: shown ? 1 : 0,
                transform: shown
                  ? "translate3d(0,0,0) scale(1)"
                  : `translate3d(0,${anchor.origin === "top" ? "-10px" : "10px"},0) scale(0.86)`,
                transition: `opacity ${ANIM_MS}ms ${EASE}, transform ${ANIM_MS}ms ${EASE}`,
              }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => go(-1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-hanko"
                >
                  <MonthChevron />
                </button>
                <p className="min-w-0 text-center text-base font-semibold">
                  {monthTitle.format(new Date(year, month - 1, 1))}
                </p>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => go(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-hanko"
                >
                  <MonthChevron right />
                </button>
              </div>
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="py-1 text-center text-[11px] font-medium text-stone-400"
                  >
                    {label}
                  </div>
                ))}
                {cells.map((cell) => {
                  const isSelected = cell.key === selected;
                  const isToday = cell.key === today;
                  const isTrip = tripDates?.has(cell.key) ?? false;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => pick(cell.key, cell.inMonth)}
                      className={`relative flex h-10 items-center justify-center rounded-full text-sm ${
                        isSelected
                          ? "bg-hanko font-semibold text-white"
                          : cell.inMonth
                            ? "text-stone-800"
                            : "text-stone-300"
                      } ${isToday && !isSelected ? "ring-1 ring-moss/40" : ""}`}
                    >
                      {cell.day}
                      {isTrip && !isSelected ? (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-hanko" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-stone-500">Day</span>
      <input type="hidden" name={name} value={selected} />
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={mounted}
        onClick={() => (mounted ? closePicker() : openPicker())}
        className={`${fieldClass} flex items-center justify-between gap-2 text-left`}
      >
        <span>{formatDay(selected)}</span>
        <CalendarIcon />
      </button>
      {popover}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-stone-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </svg>
  );
}

function MonthChevron({ right = false }: { right?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${right ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
