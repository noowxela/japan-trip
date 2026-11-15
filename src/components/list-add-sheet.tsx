"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  Fragment,
} from "react";
import { useEditOrUnlock } from "@/components/unlock-provider";
import { useT } from "@/components/i18n-provider";
import { Modal } from "@/components/modal";
import { btnPrimaryClass } from "@/components/page-shell";

const ListAddSheetCloseContext = createContext<(() => void) | null>(null);

/** Close the enclosing ListAddSheet (null when not inside one). */
export function useListAddSheetClose() {
  return useContext(ListAddSheetCloseContext);
}

export function ListAddSheet({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useT();
  const editOrUnlock = useEditOrUnlock();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  function openSheet() {
    setSession((n) => n + 1);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => editOrUnlock(openSheet)}
        className={`shrink-0 ${btnPrimaryClass}`}
      >
        {t("common.add")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <ListAddSheetCloseContext.Provider value={() => setOpen(false)}>
          <Fragment key={session}>{children}</Fragment>
        </ListAddSheetCloseContext.Provider>
      </Modal>
    </>
  );
}
