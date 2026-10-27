"use client";

import { createContext, useContext, type ReactNode } from "react";
import { t, type Locale } from "@/lib/i18n/dictionaries";

type I18nContextValue = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  t: (key, vars) => t("zh", key, vars),
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider
      value={{
        locale,
        t: (key, vars) => t(locale, key, vars),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}

export function useLocale() {
  return useContext(I18nContext).locale;
}
