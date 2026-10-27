"use client";

import Link from "next/link";
import { useT } from "@/components/i18n-provider";

export function Breadcrumb({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  const { t } = useT();

  return (
    <nav aria-label={t("common.breadcrumb")} className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
