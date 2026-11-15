"use client";

import { PageErrorScreen } from "@/components/page-error-screen";

/**
 * Segment error boundary (keeps the root layout). Same generic copy and
 * expandable details as `global-error.tsx`.
 */
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "60dvh",
        padding:
          "max(16px, env(safe-area-inset-top)) 20px max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <PageErrorScreen error={error} onRetry={retry} />
    </div>
  );
}
