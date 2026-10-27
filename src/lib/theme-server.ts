import { cookies } from "next/headers";
import {
  THEME_COOKIE,
  parseThemePreference,
  type ThemePreference,
} from "@/lib/theme";

export async function getThemePreference(): Promise<ThemePreference> {
  const jar = await cookies();
  return parseThemePreference(jar.get(THEME_COOKIE)?.value);
}
