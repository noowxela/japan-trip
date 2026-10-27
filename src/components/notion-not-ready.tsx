import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export async function NotionNotReady({
  message,
  backHref,
  backLabel,
}: {
  message?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  const locale = await getLocale();
  return (
    <PageShell>
      <EmptyState title={t(locale, "notion.notReady")}>
        {message ?? t(locale, "notion.setupBody")}
      </EmptyState>
      {backHref ? (
        <p className="text-center text-sm">
          <Link href={backHref} className="font-medium text-ink-muted no-underline">
            {backLabel ?? t(locale, "nav.backOverview")}
          </Link>
        </p>
      ) : null}
    </PageShell>
  );
}
