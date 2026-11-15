import type { ReactNode } from "react";
import { SlideInPage } from "@/components/slide-in-page";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export default async function ExpenseDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  return (
    <SlideInPage backHref="/budget" backLabel={t(locale, "nav.expenses")}>
      {children}
    </SlideInPage>
  );
}
