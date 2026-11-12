import type { ReactNode } from "react";
import { APP_SCROLL_ID } from "@/lib/app-shell";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell relative flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden">
      <div
        aria-hidden
        className="app-safe-top pointer-events-none fixed inset-x-0 top-0 z-30 bg-canvas"
      />
      <div
        id={APP_SCROLL_ID}
        className="app-scroll min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto overscroll-none"
      >
        {children}
      </div>
    </div>
  );
}
