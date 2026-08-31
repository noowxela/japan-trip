const tones: Record<string, string> = {
  Planned: "bg-stone-100 text-stone-700",
  Confirmed: "bg-emerald-100 text-emerald-800",
  Done: "bg-[#b42318]/10 text-[#b42318]",
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        tones[status] ?? "bg-stone-100 text-stone-700"
      }`}
    >
      {status}
    </span>
  );
}
