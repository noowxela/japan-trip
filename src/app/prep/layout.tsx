import type { ReactNode } from "react";
import { SubPage } from "@/components/sub-page";

export default function Layout({ children }: { children: ReactNode }) {
  return <SubPage>{children}</SubPage>;
}
