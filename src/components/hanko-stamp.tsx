import type { ReactNode } from "react";

const variants = {
  accent: "border-accent text-accent",
  ok: "border-ok text-ok",
} as const;

export function HankoStamp({
  children,
  variant = "accent",
  className = "",
  pop = false,
  size = "md",
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  /** Brief scale-in when marking visited (respects prefers-reduced-motion). */
  pop?: boolean;
  size?: "sm" | "md";
}) {
  const sizeClass =
    size === "sm"
      ? "rounded border px-1 py-px text-[9px]"
      : "rounded-md border-2 px-1.5 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center justify-center font-bold leading-none tracking-wide [-webkit-text-stroke:0] rotate-[-6deg] font-[ui-serif,Georgia,"Noto Serif JP",serif] ${sizeClass} ${variants[variant]} ${pop ? "hanko-pop" : ""} ${className}`.trim()}
      aria-hidden={typeof children === "string" ? undefined : true}
    >
      {children}
    </span>
  );
}
