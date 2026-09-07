import { SlideInPage } from "@/components/slide-in-page";
import type { ReactNode } from "react";

export default function ExpenseDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SlideInPage>{children}</SlideInPage>;
}
