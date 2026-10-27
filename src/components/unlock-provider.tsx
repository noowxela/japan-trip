"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCanEdit } from "@/components/edit-session";
import { UnlockEditorSheet } from "@/components/unlock-editor-sheet";

type UnlockContextValue = {
  openUnlock: () => void;
  closeUnlock: () => void;
};

const UnlockContext = createContext<UnlockContextValue | null>(null);

export function UnlockProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openUnlock = useCallback(() => setOpen(true), []);
  const closeUnlock = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ openUnlock, closeUnlock }),
    [openUnlock, closeUnlock],
  );

  return (
    <UnlockContext.Provider value={value}>
      {children}
      <UnlockEditorSheet open={open} onClose={closeUnlock} />
    </UnlockContext.Provider>
  );
}

export function useUnlock() {
  const context = useContext(UnlockContext);
  if (!context) {
    throw new Error("useUnlock must be used within UnlockProvider");
  }
  return context;
}

export function useUnlockOptional() {
  return useContext(UnlockContext);
}

/** Run `fn` if editor; otherwise open unlock sheet. */
export function useEditOrUnlock() {
  const canEdit = useCanEdit();
  const unlock = useUnlockOptional();
  return useCallback(
    (fn: () => void) => {
      if (canEdit) {
        fn();
        return;
      }
      unlock?.openUnlock();
    },
    [canEdit, unlock],
  );
}
