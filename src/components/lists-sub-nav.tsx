"use client";

import { ChipLinkRow } from "@/components/compact";
import { useT } from "@/components/i18n-provider";

const links = [
  { href: "/lists", key: "common.overview" },
  { href: "/places", key: "places.title" },
  { href: "/stays", key: "stays.title" },
  { href: "/transit", key: "transit.title" },
] as const;

export function ListsSubNav({ current }: { current: string }) {
  const { t } = useT();

  return (
    <ChipLinkRow
      current={current}
      items={links.map((link) => ({
        href: link.href,
        label: t(link.key),
      }))}
    />
  );
}
