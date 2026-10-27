export const THEME_COOKIE = "theme";
export const THEME_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(
  value: string | undefined | null,
): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function parseThemePreference(
  value: string | undefined | null,
): ThemePreference {
  return isThemePreference(value) ? value : "system";
}

/** Inline head script: resolve system → light|dark before paint; listen for OS changes. */
export function themeBootScript(preference: ThemePreference): string {
  return `(function(){var p=${JSON.stringify(preference)};var r=document.documentElement;function a(){var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.setAttribute("data-theme",d?"dark":"light");}a();if(p==="system"){try{window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",a);}catch(e){}}})();`;
}
