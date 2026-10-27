"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
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

  return (
    <>
      <button
        type="button"
        onClick={() => editOrUnlock(() => setOpen(true))}
        className={`shrink-0 ${btnPrimaryClass}`}
      >
        {t("common.add")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <ListAddSheetCloseContext.Provider value={() => setOpen(false)}>
          {children}
        </ListAddSheetCloseContext.Provider>
      </Modal>
    </>
  );
}
