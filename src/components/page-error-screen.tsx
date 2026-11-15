"use client";

import { pageErrorCopy, formatPageErrorDetails } from "@/lib/page-error";

/**
 * Self-contained fallback used by both `error.tsx` and `global-error.tsx`.
 * Inline styles only: global-error replaces the root layout, so CSS and i18n
 * providers are not available there.
 */
export function PageErrorScreen({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const copy = pageErrorCopy(error);
  const details = formatPageErrorDetails(error);

  return (
    <main style={{ maxWidth: 420, margin: "15vh auto 0" }}>
      <h1 style={{ fontSize: 22, lineHeight: 1.3, margin: "0 0 12px" }}>
        {copy.titleZh}
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 8px" }}>
        {copy.bodyZh}
      </p>
      <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 16px" }}>
        {copy.bodyEn}
      </p>
      {details ? (
        <details style={{ margin: "0 0 20px", fontSize: 13, color: "#44403c" }}>
          <summary
            style={{
              cursor: "pointer",
              userSelect: "none",
              WebkitUserSelect: "none",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            详情 / Details
          </summary>
          <pre
            style={{
              margin: "8px 0 0",
              padding: 12,
              maxHeight: "40vh",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.45,
              background: "#fff",
              border: "1px solid #e7e5e4",
              borderRadius: 8,
              userSelect: "text",
              WebkitUserSelect: "text",
            }}
          >
            {details}
          </pre>
        </details>
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            minHeight: 44,
            padding: "0 18px",
            border: 0,
            borderRadius: 999,
            background: "#c2410c",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => onRetry()}
          style={{
            minHeight: 44,
            padding: "0 18px",
            border: "1px solid #d6d3d1",
            borderRadius: 999,
            background: "#fff",
            color: "#1c1917",
            fontSize: 16,
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
