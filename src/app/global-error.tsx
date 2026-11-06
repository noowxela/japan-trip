"use client";

import { notionErrorCode } from "@/lib/notion-error";

/**
 * Last resort when an add-expense failure still crashes the root tree.
 * The sheet locks body scroll, so iOS pull-to-refresh does nothing until a
 * full document load. `retry()` only re-renders the client tree.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const message = error instanceof Error ? error.message : "";
  const code = notionErrorCode(message);

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
        <main style={{ maxWidth: 420, margin: "15vh auto 0" }}>
          <h1 style={{ fontSize: 22, lineHeight: 1.3, margin: "0 0 12px" }}>
            页面卡住了
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 8px" }}>
            这笔花费没有保存。重新加载后再试一次。
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 16px" }}>
            This expense was not saved. Reload, then try again.
          </p>
          {code ? (
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.4,
                margin: "0 0 20px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {code}
            </p>
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
              onClick={() => retry()}
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
      </body>
    </html>
  );
}
