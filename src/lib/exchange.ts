import { JPY_PER_RM } from "@/lib/types";

export type FxQuote = {
  jpyPerRm: number;
  asOf: string | null;
  live: boolean;
};

const fetchOpts = { next: { revalidate: 3600 } } as const;

function quote(jpyPerRm: number, asOf: string | null, live: boolean): FxQuote | null {
  if (!Number.isFinite(jpyPerRm) || jpyPerRm <= 0) return null;
  return { jpyPerRm, asOf, live };
}

async function fromFrankfurter(): Promise<FxQuote | null> {
  const res = await fetch(
    "https://api.frankfurter.app/latest?from=MYR&to=JPY",
    fetchOpts,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    date?: string;
    rates?: { JPY?: number };
  };
  return quote(Number(data.rates?.JPY), data.date ?? null, true);
}

async function fromOpenEr(): Promise<FxQuote | null> {
  const res = await fetch("https://open.er-api.com/v6/latest/MYR", fetchOpts);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    rates?: { JPY?: number };
    time_last_update_utc?: string;
  };
  const asOf = data.time_last_update_utc
    ? new Date(data.time_last_update_utc).toISOString().slice(0, 10)
    : null;
  return quote(Number(data.rates?.JPY), asOf, true);
}

export async function getMyrToJpy(): Promise<FxQuote> {
  try {
    return (await fromFrankfurter()) ?? (await fromOpenEr()) ?? fallbackQuote();
  } catch {
    try {
      return (await fromOpenEr()) ?? fallbackQuote();
    } catch {
      return fallbackQuote();
    }
  }
}

function fallbackQuote(): FxQuote {
  return { jpyPerRm: JPY_PER_RM, asOf: null, live: false };
}

export function yenForMyr(myr: number, jpyPerRm: number) {
  return Math.round(myr * jpyPerRm);
}
