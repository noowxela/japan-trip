"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Toast = {
  id: number;
  message: string;
  tone: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
};

type ToastOptions = {
  tone?: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (message: string, toneOrOptions?: "success" | "error" | ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, toneOrOptions: "success" | "error" | ToastOptions = "success") => {
      const options: ToastOptions =
        typeof toneOrOptions === "string" ? { tone: toneOrOptions } : toneOrOptions;
      const id = Date.now() + Math.random();
      const entry: Toast = {
        id,
        message,
        tone: options.tone ?? "success",
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      };
      setToasts((current) => [...current, entry]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, options.durationMs ?? 4200);
    },
    [],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-height,4.25rem)+0.75rem)] z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg motion-safe:animate-[toast-in_200ms_ease-out] ${
              item.tone === "error"
                ? "bg-accent text-white"
                : "bg-ink text-surface"
            }`}
          >
            <p className="min-w-0 flex-1">{item.message}</p>
            {item.actionLabel && item.onAction ? (
              <button
                type="button"
                onClick={() => {
                  item.onAction?.();
                  setToasts((current) => current.filter((row) => row.id !== item.id));
                }}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center underline underline-offset-2"
              >
                {item.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
