"use client";

import { PageErrorScreen } from "@/components/page-error-screen";

/**
 * Last resort when a crash replaces the root tree.
 * The sheet can lock body scroll, so iOS pull-to-refresh does nothing until a
 * full document load. `retry()` only re-renders the client tree.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          padding:
            "max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))",
          background: "#f6f1e8",
          color: "#1c1917",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <PageErrorScreen error={error} onRetry={retry} />
      </body>
    </html>
  );
}
