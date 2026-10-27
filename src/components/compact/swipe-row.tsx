"use client";

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { haptic } from "@/lib/haptic";
import {
  SWIPE_REVEAL_PX,
  commitSwipeDirection,
  decideSwipeAxis,
  isSwipeIgnoredTarget,
  rubberBandOffset,
  shouldSuppressClick,
  type SwipeAxis,
  type SwipeDirection,
} from "@/lib/swipe";

type SwipeRowProps = {
  children: ReactNode;
  /** Revealed when swiping right (content moves right). */
  leftReveal?: ReactNode;
  /** Revealed when swiping left (content moves left). */
  rightReveal?: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  className?: string;
  /** Called once when |offset| first crosses threshold while dragging. */
  onThreshold?: (direction: SwipeDirection) => void;
};

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  velocity: number;
  axis: SwipeAxis;
  thresholdFired: boolean;
  moved: boolean;
};

export function SwipeRow({
  children,
  leftReveal,
  rightReveal,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  className = "",
  onThreshold,
}: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const gestureRef = useRef<Gesture | null>(null);
  const suppressClickRef = useRef(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback((animate: boolean) => {
    setSnapping(animate);
    setOffset(0);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isSwipeIgnoredTarget(event.target)) return;
    if (!onSwipeLeft && !onSwipeRight) return;

    suppressClickRef.current = false;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      axis: "none",
      thresholdFired: false,
      moved: false,
    };
    setSnapping(false);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const dt = Math.max(1, event.timeStamp - gesture.lastT);
    gesture.velocity = (event.clientX - gesture.lastX) / dt;
    gesture.lastX = event.clientX;
    gesture.lastT = event.timeStamp;

    if (gesture.axis === "none") {
      const axis = decideSwipeAxis(dx, dy);
      if (axis === "none") return;
      if (axis === "vertical") {
        gestureRef.current = null;
        reset(false);
        return;
      }
      gesture.axis = "horizontal";
      gesture.moved = true;
      rowRef.current?.setPointerCapture(event.pointerId);
    }

    if (gesture.axis !== "horizontal") return;

    event.preventDefault();
    let next = rubberBandOffset(dx);
    if (next > 0 && !onSwipeRight) next = rubberBandOffset(Math.min(dx, 24));
    if (next < 0 && !onSwipeLeft) next = rubberBandOffset(Math.max(dx, -24));
    setOffset(next);

    if (!gesture.thresholdFired && Math.abs(next) >= SWIPE_REVEAL_PX * 0.82) {
      gesture.thresholdFired = true;
      const direction: SwipeDirection = next > 0 ? "right" : "left";
      onThreshold?.(direction);
      haptic("tap");
    }
  };

  const finish = (
    event: React.PointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;

    if (rowRef.current?.hasPointerCapture(event.pointerId)) {
      rowRef.current.releasePointerCapture(event.pointerId);
    }

    if (cancelled || gesture.axis !== "horizontal") {
      reset(gesture.moved);
      return;
    }

    const dx = event.clientX - gesture.startX;
    const direction = commitSwipeDirection({
      offset: dx,
      velocity: gesture.velocity,
    });

    const canRight = direction === "right" && onSwipeRight;
    const canLeft = direction === "left" && onSwipeLeft;

    if (canRight || canLeft) {
      suppressClickRef.current = shouldSuppressClick(true);
      reset(true);
      if (canRight) onSwipeRight();
      else onSwipeLeft?.();
      return;
    }

    if (gesture.moved) {
      suppressClickRef.current = shouldSuppressClick(true);
    }
    reset(true);
  };

  const onClickCapture = (event: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const style: CSSProperties = {
    transform: offset ? `translate3d(${offset}px,0,0)` : undefined,
    transition: snapping
      ? "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)"
      : undefined,
    touchAction: "pan-y",
  };

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`.trim()}
      data-swipe-row=""
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 flex w-[5.5rem] items-center justify-center bg-ok text-[11px] font-semibold text-white"
        aria-hidden
        style={{ opacity: offset > 8 ? Math.min(1, offset / 56) : 0 }}
      >
        {leftReveal}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex w-[5.5rem] items-center justify-center bg-canvas text-[11px] font-semibold text-ink-muted"
        aria-hidden
        style={{ opacity: offset < -8 ? Math.min(1, -offset / 56) : 0 }}
      >
        {rightReveal}
      </div>
      <div
        ref={rowRef}
        style={style}
        className="relative will-change-transform"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finish(event, false)}
        onPointerCancel={(event) => finish(event, true)}
        onClickCapture={onClickCapture}
        onDragStart={(event) => {
          if (gestureRef.current?.axis === "horizontal") {
            event.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
