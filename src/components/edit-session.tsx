"use client";

import { createContext, useContext, type ReactNode } from "react";

type EditSessionValue = {
  canEdit: boolean;
  editorName: string | null;
};

const EditSessionContext = createContext<EditSessionValue>({
  canEdit: true,
  editorName: null,
});

export function EditSessionProvider({
  canEdit,
  editorName,
  children,
}: EditSessionValue & { children: ReactNode }) {
  return (
    <EditSessionContext.Provider value={{ canEdit, editorName }}>
      {children}
    </EditSessionContext.Provider>
  );
}

export function useEditSession() {
  return useContext(EditSessionContext);
}

export function useCanEdit() {
  return useContext(EditSessionContext).canEdit;
}

export function EditOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const canEdit = useCanEdit();
  return canEdit ? children : fallback;
}
