import type { ReactNode } from "react";
import {
  compactEyebrowClass,
  compactTitleClass,
} from "@/components/compact/classes";

const actionSlotClass =
  "shrink-0 self-center [&_button]:inline-flex [&_button]:h-8 [&_button]:items-center [&_button]:justify-center [&_button]:px-3 [&_button]:leading-none";

export function PageHeader({
  eyebrow,
  title,
  action,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${className}`.trim()}
    >
      <div className="min-w-0">
        {eyebrow ? <p className={compactEyebrowClass}>{eyebrow}</p> : null}
        <h1 className={compactTitleClass}>{title}</h1>
      </div>
      {action ? <div className={actionSlotClass}>{action}</div> : null}
    </div>
  );
}
