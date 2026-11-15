import { notionErrorCode } from "@/lib/notion-error";

export type PageErrorKind = "generic" | "spend";

export type PageErrorCopy = {
  kind: PageErrorKind;
  titleZh: string;
  bodyZh: string;
  bodyEn: string;
};

const GENERIC_COPY: PageErrorCopy = {
  kind: "generic",
  titleZh: "页面出错了",
  bodyZh: "重新加载后再试一次。",
  bodyEn: "Something went wrong. Reload, then try again.",
};

const SPEND_COPY: PageErrorCopy = {
  kind: "spend",
  titleZh: "页面出错了",
  bodyZh: "这笔花费没有保存。重新加载后再试一次。",
  bodyEn: "This expense was not saved. Reload, then try again.",
};

const SPEND_MESSAGE =
  /这笔花费没有保存|couldn't save this expense|this expense was not saved/i;

export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

export function errorDigest(error: unknown): string {
  if (!error || typeof error !== "object" || !("digest" in error)) return "";
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.trim() ? digest.trim() : "";
}

/** Spend/Notion save failures keep the expense copy; everything else is generic. */
export function pageErrorKind(error: unknown): PageErrorKind {
  const message = errorMessage(error);
  if (notionErrorCode(message) || SPEND_MESSAGE.test(message)) return "spend";
  return "generic";
}

export function pageErrorCopy(error: unknown): PageErrorCopy {
  return pageErrorKind(error) === "spend" ? SPEND_COPY : GENERIC_COPY;
}

/**
 * Selectable detail text for the collapsed-by-default error panel.
 * Prefer the message, then a Next.js digest, then the stack.
 */
export function formatPageErrorDetails(error: unknown): string {
  const lines: string[] = [];
  if (error instanceof Error) {
    const name = error.name?.trim();
    const message = error.message?.trim();
    if (name && name !== "Error") {
      lines.push(message ? `${name}: ${message}` : name);
    } else if (message) {
      lines.push(message);
    }
  } else {
    const message = errorMessage(error).trim();
    if (message) lines.push(message);
    else if (error != null) {
      try {
        lines.push(String(error));
      } catch {
        // ignore unstringifiable values
      }
    }
  }

  const digest = errorDigest(error);
  if (digest) lines.push(`digest: ${digest}`);

  if (error instanceof Error && error.stack?.trim()) {
    const stack = error.stack.trim();
    if (!lines.includes(stack)) lines.push(stack);
  }

  return lines.join("\n").trim();
}
