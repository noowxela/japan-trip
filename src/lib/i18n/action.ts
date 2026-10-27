import { t, type Locale } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export async function actionT(
  key: string,
  vars?: Record<string, string | number>,
) {
  return t(await getLocale(), key, vars);
}

export async function withLocale<T>(fn: (locale: Locale) => T | Promise<T>) {
  return fn(await getLocale());
}
