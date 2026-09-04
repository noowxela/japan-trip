"use client";

import { useState } from "react";
import { useToast } from "@/components/toast-provider";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Could not copy", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="notebook-btn bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
