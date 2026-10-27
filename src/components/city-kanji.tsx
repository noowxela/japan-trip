import { cityKanji } from "@/lib/city-kanji";

export function CityKanji({
  city,
  className = "",
}: {
  city: string | null | undefined;
  className?: string;
}) {
  const kanji = cityKanji(city);
  if (!kanji) return null;
  return (
    <span
      className={`text-[13px] font-normal text-ink-muted ${className}`.trim()}
      lang="ja"
    >
      {kanji}
    </span>
  );
}
