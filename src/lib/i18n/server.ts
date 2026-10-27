import { cookies } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n/dictionaries";

export const LANG_COOKIE = "lang";
export const LANG_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LANG_COOKIE)?.value;
  return isLocale(raw) ? raw : "zh";
}
