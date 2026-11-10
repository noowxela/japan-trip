"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  QuickExpenseSheet,
  type QuickExpenseDefaults,
} from "@/components/quick-expense-sheet";
import { useEditOrUnlock } from "@/components/unlock-provider";
import { readTripCache } from "@/lib/trip-cache";
import type { Place, TripDay } from "@/lib/types";

const PEOPLE_KEY = "japan-trip-people-v1";

export function syncQuickExpensePeople(people: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  } catch {
    /* ignore */
  }
}

function readPeople(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PEOPLE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

type QuickExpenseContextValue = {
  openQuickExpense: (defaults?: QuickExpenseDefaults) => void;
  closeQuickExpense: () => void;
  setTripData: (data: {
    days?: TripDay[];
    people?: string[];
    places?: Place[];
  }) => void;
};

const QuickExpenseContext = createContext<QuickExpenseContextValue | null>(
  null,
);

export function QuickExpenseProvider({ children }: { children: ReactNode }) {
  const editOrUnlock = useEditOrUnlock();
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<QuickExpenseDefaults>({});
  const [tripDays, setTripDays] = useState<TripDay[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [tripPlaces, setTripPlaces] = useState<Place[]>([]);

  const setTripData = useCallback(
    (data: { days?: TripDay[]; people?: string[]; places?: Place[] }) => {
      if (data.days) setTripDays(data.days);
      if (data.places) setTripPlaces(data.places);
      if (data.people) {
        setPeople(data.people);
        syncQuickExpensePeople(data.people);
      }
    },
    [],
  );

  const openQuickExpense = useCallback(
    (next?: QuickExpenseDefaults) => {
      editOrUnlock(() => {
        const cache = readTripCache();
        const days = next?.days ?? tripDays ?? cache?.days ?? [];
        const nextPeople = next?.people ?? people ?? readPeople();
        const places = next?.places ?? tripPlaces ?? cache?.places ?? [];
        setDefaults({
          ...next,
          days,
          people: nextPeople,
          places,
        });
        setOpen(true);
      });
    },
    [editOrUnlock, people, tripDays, tripPlaces],
  );

  const closeQuickExpense = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openQuickExpense, closeQuickExpense, setTripData }),
    [openQuickExpense, closeQuickExpense, setTripData],
  );

  return (
    <QuickExpenseContext.Provider value={value}>
      {children}
      <QuickExpenseSheet
        open={open}
        onClose={closeQuickExpense}
        defaults={defaults}
      />
    </QuickExpenseContext.Provider>
  );
}

export function useQuickExpense() {
  const context = useContext(QuickExpenseContext);
  if (!context) {
    throw new Error("useQuickExpense must be used within QuickExpenseProvider");
  }
  return context;
}

export function useQuickExpenseOptional() {
  return useContext(QuickExpenseContext);
}

export function QuickExpenseTripSync({
  days,
  people,
  places,
}: {
  days: TripDay[];
  people?: string[];
  places?: Place[];
}) {
  const ctx = useQuickExpenseOptional();
  useEffect(() => {
    ctx?.setTripData({ days, people, places });
  }, [ctx, days, people, places]);
  return null;
}
