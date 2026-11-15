"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n-provider";
import { SlideInPage } from "@/components/slide-in-page";
import type { DictKey } from "@/lib/i18n/dictionaries";

export function SubPage({
  children,
  backHref = "/settings",
  backKey = "more.title",
}: {
  children: ReactNode;
  backHref?: string;
  backKey?: DictKey;
}) {
  const { t } = useT();
  return (
    <SlideInPage backHref={backHref} backLabel={t(backKey)}>
      {children}
    </SlideInPage>
  );
}
