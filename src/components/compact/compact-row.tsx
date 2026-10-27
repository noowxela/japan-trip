import Link from "next/link";
import type { ReactNode } from "react";
import {
  compactMetaClass,
  compactPrimaryClass,
} from "@/components/compact/classes";

function RowBody({
  leading,
  title,
  meta,
  secondary,
  muted,
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  secondary?: ReactNode;
  muted?: boolean;
}) {
  return (
    <>
      {leading != null ? (
        <div className="flex w-16 shrink-0 flex-col items-end justify-center self-stretch text-right text-[12px] font-semibold leading-4 tabular-nums text-ink">
          {leading}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 py-1.5">
        <p className={`${compactPrimaryClass} ${muted ? "text-ink-muted" : ""}`}>
          {title}
          {meta != null && meta !== "" ? (
            <span className="font-normal text-ink-muted"> · {meta}</span>
          ) : null}
        </p>
        {secondary != null && secondary !== "" ? (
          <p className={`mt-0.5 ${compactMetaClass}`}>{secondary}</p>
        ) : null}
      </div>
    </>
  );
}

export function CompactRow({
  leading,
  title,
  meta,
  secondary,
  trailing,
  href,
  onClick,
  className = "",
  muted = false,
}: {
  /** Time/date column (~2.5rem) or 24px icon/check. */
  leading?: ReactNode;
  title: ReactNode;
  /** Inline muted bits after the primary (joined with · by caller or string). */
  meta?: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  muted?: boolean;
}) {
  const rowClass = `flex min-h-11 w-full min-w-0 items-center gap-2 border-b border-line/70 px-1 last:border-b-0 ${
    muted ? "opacity-70" : ""
  } ${className}`.trim();

  const body = (
    <RowBody
      leading={leading}
      title={title}
      meta={meta}
      secondary={secondary}
      muted={muted}
    />
  );

  if (href) {
    return (
      <div className={rowClass}>
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-2 text-inherit no-underline"
        >
          {body}
        </Link>
        {trailing != null ? (
          <div className="flex shrink-0 items-center gap-0.5 self-center">
            {trailing}
          </div>
        ) : null}
      </div>
    );
  }

  if (onClick) {
    return (
      <div className={rowClass}>
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {body}
        </button>
        {trailing != null ? (
          <div className="flex shrink-0 items-center gap-0.5 self-center">
            {trailing}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={rowClass}>
      {body}
      {trailing != null ? (
        <div className="flex shrink-0 items-center gap-0.5 self-center">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function CompactRowList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={`overflow-hidden rounded-xl border border-line/80 bg-surface ${className}`.trim()}
    >
      {children}
    </ul>
  );
}
