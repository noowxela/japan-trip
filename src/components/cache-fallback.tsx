"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CacheFallbackContextValue = {
  fromCache: boolean;
  setFromCache: (value: boolean) => void;
};

const CacheFallbackContext = createContext<CacheFallbackContextValue>({
  fromCache: false,
  setFromCache: () => {},
});

export function CacheFallbackProvider({ children }: { children: ReactNode }) {
  const [fromCache, setFromCache] = useState(false);
  const value = useMemo(
    () => ({ fromCache, setFromCache }),
    [fromCache],
  );
  return (
    <CacheFallbackContext.Provider value={value}>
      {children}
    </CacheFallbackContext.Provider>
  );
}

export function useCacheFallback() {
  return useContext(CacheFallbackContext);
}

/** Mark this page as serving Notion-fail / local cache UI. */
export function CacheFallbackSignal() {
  const { setFromCache } = useCacheFallback();
  useEffect(() => {
    setFromCache(true);
    return () => setFromCache(false);
  }, [setFromCache]);
  return null;
}
