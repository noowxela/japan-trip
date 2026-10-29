"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ChipRow,
  CompactRow,
  CompactRowList,
  PageHeader,
  SectionHeader,
  compactBtnGhostClass,
  compactBtnPrimaryClass,
  compactFieldClass,
  compactLabelClass,
} from "@/components/compact";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/i18n-provider";
import { PageShell } from "@/components/page-shell";
import { PhrasesSkeleton } from "@/components/page-skeletons";
import {
  BUILTIN_PHRASES,
  CUSTOM_PHRASES_STORAGE_KEY,
  EMPTY_CUSTOM_PHRASES,
  HOTEL_TAXI_PHRASE_JA,
  type CustomPhrase,
  type HotelPhraseCard,
  type Phrase,
  type PhraseCategory,
  PHRASE_CATEGORIES,
  buildHotelCards,
  createCustomPhrase,
  deleteCustomPhrase,
  invalidateCustomPhrasesMemory,
  readCustomPhrases,
  upsertCustomPhrase,
  writeCustomPhrases,
} from "@/lib/phrases";
import type { Stay } from "@/lib/types";
import {
  EMPTY_STAYS,
  readTripCache,
  subscribeTripCache,
} from "@/lib/trip-cache";

type CategoryFilter = PhraseCategory | "all";

type ShowItem = Phrase | HotelPhraseCard;

function isHotelCard(item: ShowItem): item is HotelPhraseCard {
  return "kind" in item && item.kind === "hotel";
}

function categoryLabelKey(cat: PhraseCategory): `phrases.cat.${PhraseCategory}` {
  return `phrases.cat.${cat}`;
}

function subscribeCustomPhrases(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CUSTOM_PHRASES_STORAGE_KEY) {
      // Force re-read on next getSnapshot (cross-tab / clear).
      invalidateCustomPhrasesMemory();
      onChange();
    }
  };
  const onLocal = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener("japan-trip-custom-phrases", onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("japan-trip-custom-phrases", onLocal);
  };
}

function getCustomSnapshot(): CustomPhrase[] {
  return readCustomPhrases();
}

function getCustomServerSnapshot(): CustomPhrase[] {
  return EMPTY_CUSTOM_PHRASES;
}

function getTripCacheSnapshot() {
  return readTripCache();
}

function getTripCacheServerSnapshot() {
  return null;
}

export function PhrasesView({
  initialStays,
  fromCache = false,
}: {
  initialStays: Stay[];
  fromCache?: boolean;
}) {
  const { t, locale } = useT();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [showIndex, setShowIndex] = useState<number | null>(null);
  const [showDeck, setShowDeck] = useState<ShowItem[]>([]);
  const [rotated, setRotated] = useState(false);
  const [editing, setEditing] = useState<CustomPhrase | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [ja, setJa] = useState("");
  const [reading, setReading] = useState("");
  const [zh, setZh] = useState("");
  const formId = useId();

  const custom = useSyncExternalStore(
    subscribeCustomPhrases,
    getCustomSnapshot,
    getCustomServerSnapshot,
  );

  const tripSnapshot = useSyncExternalStore(
    subscribeTripCache,
    getTripCacheSnapshot,
    getTripCacheServerSnapshot,
  );

  const stays = useMemo(() => {
    if (initialStays.length > 0) return initialStays;
    return tripSnapshot?.stays ?? EMPTY_STAYS;
  }, [initialStays, tripSnapshot]);

  const hotelCards = useMemo(() => buildHotelCards(stays), [stays]);

  const builtinList = useMemo(() => {
    if (category === "all") {
      return BUILTIN_PHRASES.filter((p) => p.category !== "hotel");
    }
    if (category === "custom" || category === "hotel") return [];
    return BUILTIN_PHRASES.filter((p) => p.category === category);
  }, [category]);

  const hotelBuiltin = useMemo(() => {
    if (category !== "all" && category !== "hotel") return [];
    return BUILTIN_PHRASES.filter((p) => p.category === "hotel");
  }, [category]);

  const showCustom = category === "all" || category === "custom";
  const showHotelSection = category === "all" || category === "hotel";

  const chipOptions = useMemo(
    () => [
      { value: "all" as const, label: t("phrases.cat.all") },
      ...PHRASE_CATEGORIES.map((cat) => ({
        value: cat,
        label: t(categoryLabelKey(cat)),
      })),
    ],
    [t],
  );

  const openShow = useCallback((deck: ShowItem[], index: number) => {
    setShowDeck(deck);
    setShowIndex(index);
    setRotated(false);
  }, []);

  const closeShow = useCallback(() => {
    setShowIndex(null);
    setShowDeck([]);
    setRotated(false);
  }, []);

  const goPrev = useCallback(() => {
    setShowIndex((i) => {
      if (i == null || showDeck.length === 0) return i;
      return (i - 1 + showDeck.length) % showDeck.length;
    });
  }, [showDeck.length]);

  const goNext = useCallback(() => {
    setShowIndex((i) => {
      if (i == null || showDeck.length === 0) return i;
      return (i + 1) % showDeck.length;
    });
  }, [showDeck.length]);

  const openAdd = () => {
    setEditing(null);
    setJa("");
    setReading("");
    setZh("");
    setFormOpen(true);
  };

  const openEdit = (phrase: CustomPhrase) => {
    setEditing(phrase);
    setJa(phrase.ja);
    setReading(phrase.reading);
    setZh(phrase.zh);
    setFormOpen(true);
  };

  const saveCustom = (event: FormEvent) => {
    event.preventDefault();
    if (!ja.trim() || !zh.trim()) return;
    const nextPhrase = editing
      ? {
          ...editing,
          ja: ja.trim(),
          reading: reading.trim(),
          zh: zh.trim(),
          en: zh.trim(),
        }
      : createCustomPhrase({ ja, reading, zh });
    writeCustomPhrases(upsertCustomPhrase(custom, nextPhrase));
    setFormOpen(false);
    setEditing(null);
    setCategory("custom");
  };

  const removeCustom = (id: string) => {
    writeCustomPhrases(deleteCustomPhrase(custom, id));
  };

  const meaning = (p: Phrase) => (locale === "en" ? p.en : p.zh);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("phrases.eyebrow")}
        title={t("phrases.title")}
        action={
          <button
            type="button"
            onClick={openAdd}
            className={compactBtnPrimaryClass}
          >
            {t("phrases.add")}
          </button>
        }
      />
      <p className="-mt-1 text-[12px] text-ink-muted">{t("phrases.subtitle")}</p>
      {fromCache ? (
        <p className="text-[11px] text-ink-muted">{t("phrases.fromCache")}</p>
      ) : null}

      <ChipRow
        value={category}
        options={chipOptions}
        onChange={setCategory}
        label={t("phrases.categories")}
      />

      {showHotelSection ? (
        <section className="space-y-1.5">
          <SectionHeader title={t("phrases.hotelSection")} />
          <p className="px-1 text-[12px] text-ink-muted">
            {t("phrases.hotelHint")}
          </p>
          {hotelCards.length === 0 ? (
            <p className="px-1 text-[13px] text-ink-muted">
              {t("phrases.hotelEmpty")}
            </p>
          ) : (
            <CompactRowList>
              {hotelCards.map((card, index) => (
                <li key={card.id}>
                  <CompactRow
                    title={card.stayName}
                    secondary={
                      card.phone
                        ? `${card.address} · ${card.phone}`
                        : card.address || HOTEL_TAXI_PHRASE_JA
                    }
                    onClick={() => openShow(hotelCards, index)}
                    trailing={
                      <span className="pr-1 text-[11px] text-ink-muted" aria-hidden>
                        ›
                      </span>
                    }
                  />
                </li>
              ))}
            </CompactRowList>
          )}
        </section>
      ) : null}

      {showCustom ? (
        <section className="space-y-1.5">
          <div className="flex h-7 items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[12px] font-medium text-ink-muted">
              {t("phrases.cat.custom")}
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-7 shrink-0 items-center text-[12px] font-medium text-accent"
            >
              {t("phrases.add")}
            </button>
          </div>
          {custom.length === 0 ? (
            <p className="px-1 text-[13px] text-ink-muted">
              {t("phrases.customEmpty")}
            </p>
          ) : (
            <CompactRowList>
              {custom.map((phrase, index) => (
                <li key={phrase.id}>
                  <CompactRow
                    title={
                      <span className="text-[16px] font-semibold tracking-wide">
                        {phrase.ja}
                      </span>
                    }
                    secondary={
                      [phrase.reading, meaning(phrase)].filter(Boolean).join(" · ")
                    }
                    onClick={() => openShow(custom, index)}
                    trailing={
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          className="inline-flex h-11 min-w-11 items-center justify-center text-[12px] text-ink-muted"
                          aria-label={t("phrases.editAria", { name: phrase.ja })}
                          onClick={() => openEdit(phrase)}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-11 min-w-11 items-center justify-center text-[12px] text-accent"
                          aria-label={t("phrases.deleteAria", {
                            name: phrase.ja,
                          })}
                          onClick={() => removeCustom(phrase.id)}
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    }
                  />
                </li>
              ))}
            </CompactRowList>
          )}
        </section>
      ) : null}

      {(category === "all" ||
        (category !== "custom" && category !== "hotel")) &&
      builtinList.length > 0 ? (
        <section className="space-y-1.5">
          <SectionHeader
            title={
              category === "all"
                ? t("phrases.builtinSection")
                : t(categoryLabelKey(category as PhraseCategory))
            }
          />
          <CompactRowList>
            {builtinList.map((phrase, index) => (
              <li key={phrase.id}>
                <CompactRow
                  title={
                    <span className="text-[16px] font-semibold tracking-wide">
                      {phrase.ja}
                    </span>
                  }
                  secondary={`${phrase.reading} · ${meaning(phrase)}`}
                  onClick={() => openShow(builtinList, index)}
                  trailing={
                    <span className="pr-1 text-[11px] text-ink-muted" aria-hidden>
                      ›
                    </span>
                  }
                />
              </li>
            ))}
          </CompactRowList>
        </section>
      ) : null}

      {hotelBuiltin.length > 0 ? (
        <section className="space-y-1.5">
          <SectionHeader title={t("phrases.cat.hotel")} />
          <CompactRowList>
            {hotelBuiltin.map((phrase, index) => (
              <li key={phrase.id}>
                <CompactRow
                  title={
                    <span className="text-[16px] font-semibold tracking-wide">
                      {phrase.ja}
                    </span>
                  }
                  secondary={`${phrase.reading} · ${meaning(phrase)}`}
                  onClick={() => openShow(hotelBuiltin, index)}
                  trailing={
                    <span className="pr-1 text-[11px] text-ink-muted" aria-hidden>
                      ›
                    </span>
                  }
                />
              </li>
            ))}
          </CompactRowList>
        </section>
      ) : null}

      {category !== "all" &&
      category !== "custom" &&
      category !== "hotel" &&
      builtinList.length === 0 ? (
        <EmptyState title={t("phrases.empty")}>
          {t("phrases.emptyBody")}
        </EmptyState>
      ) : null}

      {formOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={formId}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
          onClick={() => setFormOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setFormOpen(false);
          }}
        >
          <form
            className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveCustom}
          >
            <h2 id={formId} className="text-[16px] font-semibold text-ink">
              {editing ? t("phrases.editTitle") : t("phrases.addTitle")}
            </h2>
            <div className="mt-3 grid gap-2">
              <label className={compactLabelClass}>
                {t("phrases.fieldJa")}
                <input
                  required
                  value={ja}
                  onChange={(e) => setJa(e.target.value)}
                  className={`mt-1 ${compactFieldClass}`}
                  autoComplete="off"
                />
              </label>
              <label className={compactLabelClass}>
                {t("phrases.fieldReading")}
                <input
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  className={`mt-1 ${compactFieldClass}`}
                  autoComplete="off"
                />
              </label>
              <label className={compactLabelClass}>
                {t("phrases.fieldZh")}
                <input
                  required
                  value={zh}
                  onChange={(e) => setZh(e.target.value)}
                  className={`mt-1 ${compactFieldClass}`}
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={`flex-1 ${compactBtnGhostClass}`}
                onClick={() => setFormOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" className={`flex-1 ${compactBtnPrimaryClass}`}>
                {t("common.save")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showIndex != null && showDeck[showIndex] ? (
        <PhraseShowOverlay
          item={showDeck[showIndex]!}
          index={showIndex}
          total={showDeck.length}
          meaning={meaning(showDeck[showIndex]!)}
          rotated={rotated}
          onToggleRotate={() => setRotated((r) => !r)}
          onClose={closeShow}
          onPrev={goPrev}
          onNext={goNext}
        />
      ) : null}
    </PageShell>
  );
}

function PhraseShowOverlay({
  item,
  index,
  total,
  meaning,
  rotated,
  onToggleRotate,
  onClose,
  onPrev,
  onNext,
}: {
  item: ShowItem;
  index: number;
  total: number;
  meaning: string;
  rotated: boolean;
  onToggleRotate: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useT();
  const jaRef = useRef<HTMLParagraphElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function acquire() {
      try {
        if (!("wakeLock" in navigator)) return;
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        // unsupported / denied — graceful no-op
      }
    }

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;
      if (lock) void lock.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    const el = jaRef.current;
    if (!el) return;
    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;
      let size = 64;
      el.style.fontSize = `${size}px`;
      const maxH = parent.clientHeight;
      const maxW = parent.clientWidth;
      while (size > 22 && (el.scrollHeight > maxH || el.scrollWidth > maxW)) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [item.ja, rotated]);

  const phone = isHotelCard(item) ? item.phone : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("phrases.showTitle")}
      className="phrase-show fixed inset-0 z-[60] flex flex-col bg-canvas text-ink"
      onTouchStart={(e) => {
        const touch = e.changedTouches[0];
        if (!touch) return;
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        const touch = e.changedTouches[0];
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) onNext();
        else onPrev();
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-[14px] font-medium text-ink"
          aria-label={t("common.close")}
        >
          {t("common.close")}
        </button>
        <p className="text-[12px] tabular-nums text-ink-muted">
          {index + 1}/{total}
        </p>
        <button
          type="button"
          onClick={onToggleRotate}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-[13px] font-medium text-ink-muted"
          aria-pressed={rotated}
          aria-label={t("phrases.rotate")}
        >
          {t("phrases.rotateShort")}
        </button>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
          rotated ? "phrase-show-flip" : ""
        }`}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-2">
          <p
            ref={jaRef}
            className="max-h-full w-full whitespace-pre-wrap break-words text-center font-semibold leading-tight tracking-wide text-ink"
          >
            {item.ja}
          </p>
        </div>
        <div className="shrink-0 space-y-1 border-t border-line pt-3 text-center">
          {item.reading ? (
            <p className="text-[14px] text-ink-muted">{item.reading}</p>
          ) : null}
          <p className="text-[15px] text-ink">{meaning}</p>
          {phone ? (
            <p className="text-[14px] tabular-nums text-ink-muted">{phone}</p>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-[14px] font-medium"
            aria-label={t("phrases.prev")}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-[14px] font-medium"
            aria-label={t("phrases.next")}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

/** Offline / Notion-fail: stays from trip snapshot. */
export function PhrasesOfflineFallback() {
  const tripSnapshot = useSyncExternalStore(
    subscribeTripCache,
    getTripCacheSnapshot,
    getTripCacheServerSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeTripCache,
    () => true,
    () => false,
  );

  const stays = tripSnapshot?.stays ?? EMPTY_STAYS;

  if (!ready) {
    return <PhrasesSkeleton />;
  }

  return <PhrasesView initialStays={stays} fromCache />;
}
