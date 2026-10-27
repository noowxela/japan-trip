import type { Stay } from "@/lib/types";

/** Built-in + hotel + custom phrase categories. */
export const PHRASE_CATEGORIES = [
  "allergy",
  "order",
  "directions",
  "transit",
  "emergency",
  "shopping",
  "hotel",
  "custom",
] as const;

export type PhraseCategory = (typeof PHRASE_CATEGORIES)[number];

export type Phrase = {
  id: string;
  category: PhraseCategory;
  /** Natural polite Japanese shown large to staff. */
  ja: string;
  /** Hiragana / romaji reading. */
  reading: string;
  zh: string;
  en: string;
};

export type CustomPhraseInput = {
  ja: string;
  reading?: string;
  zh: string;
};

export type CustomPhrase = Phrase & {
  category: "custom";
  custom: true;
};

export const CUSTOM_PHRASES_STORAGE_KEY = "japan-trip:custom-phrases-v1";
export const CUSTOM_PHRASES_VERSION = 1 as const;

export type CustomPhrasesStore = {
  v: typeof CUSTOM_PHRASES_VERSION;
  items: CustomPhrase[];
};

export type HotelPhraseCard = Phrase & {
  stayId: string;
  stayName: string;
  address: string;
  phone: string | null;
  kind: "hotel";
};

export const HOTEL_TAXI_PHRASE_JA = "この住所までお願いします";
export const HOTEL_TAXI_PHRASE_READING = "このじゅうしょまでおねがいします";

const ALLERGENS: { id: string; ja: string; reading: string; zh: string; en: string }[] =
  [
    { id: "ebi", ja: "えび", reading: "えび", zh: "虾", en: "shrimp" },
    { id: "kani", ja: "かに", reading: "かに", zh: "蟹", en: "crab" },
    { id: "tamago", ja: "卵", reading: "たまご", zh: "蛋", en: "egg" },
    { id: "nyuu", ja: "乳", reading: "にゅう", zh: "乳制品", en: "dairy / milk" },
    {
      id: "komugi",
      ja: "小麦",
      reading: "こむぎ",
      zh: "小麦",
      en: "wheat",
    },
    { id: "soba", ja: "そば", reading: "そば", zh: "荞麦", en: "buckwheat / soba" },
    {
      id: "rakkasei",
      ja: "落花生",
      reading: "らっかせい / ピーナッツ",
      zh: "花生",
      en: "peanut",
    },
    {
      id: "nuts",
      ja: "ナッツ",
      reading: "なっつ",
      zh: "坚果",
      en: "tree nuts",
    },
  ];

function allergenCards(): Phrase[] {
  return ALLERGENS.map((a) => ({
    id: `allergy-${a.id}`,
    category: "allergy" as const,
    ja: `${a.ja}アレルギーがあります`,
    reading: `${a.reading} アレルギーが あります`,
    zh: `我对${a.zh}过敏`,
    en: `I am allergic to ${a.en}`,
  }));
}

/** Bundled travel phrases (no Notion). */
export const BUILTIN_PHRASES: readonly Phrase[] = [
  // —— 过敏 / 饮食 ——
  ...allergenCards(),
  {
    id: "allergy-fill",
    category: "allergy",
    ja: "〇〇アレルギーがあります",
    reading: "まるまる アレルギーが あります",
    zh: "我对〇〇过敏（可改成具体食材）",
    en: "I am allergic to 〇〇 (fill in the allergen)",
  },
  {
    id: "allergy-contains",
    category: "allergy",
    ja: "この料理に〇〇は入っていますか？",
    reading: "このりょうりに まるまるは はいっていますか",
    zh: "这道菜里有〇〇吗？",
    en: "Does this dish contain 〇〇?",
  },
  {
    id: "allergy-none",
    category: "allergy",
    ja: "アレルギー対応のメニューはありますか？",
    reading: "アレルギーたいおうの めにゅーは ありますか",
    zh: "有过敏友好菜单吗？",
    en: "Do you have an allergy-friendly menu?",
  },
  {
    id: "allergy-vegetarian",
    category: "allergy",
    ja: "ベジタリアンの料理はありますか？",
    reading: "べじたリアンの りょうりは ありますか",
    zh: "有素食吗？",
    en: "Do you have vegetarian dishes?",
  },
  {
    id: "allergy-no-meat",
    category: "allergy",
    ja: "お肉とお魚は食べられません",
    reading: "おにくと おさかなは たべられません",
    zh: "我不能吃肉和鱼",
    en: "I cannot eat meat or fish",
  },

  // —— 点餐 ——
  {
    id: "order-menu",
    category: "order",
    ja: "メニューを見せてください",
    reading: "めにゅーを みせてください",
    zh: "请给我看菜单",
    en: "Could I see the menu, please?",
  },
  {
    id: "order-this",
    category: "order",
    ja: "これをお願いします",
    reading: "これを おねがいします",
    zh: "就要这个",
    en: "I'll have this, please",
  },
  {
    id: "order-recommend",
    category: "order",
    ja: "おすすめは何ですか？",
    reading: "おすすめは なんですか",
    zh: "有什么推荐吗？",
    en: "What do you recommend?",
  },
  {
    id: "order-water",
    category: "order",
    ja: "お水をください",
    reading: "おみずを ください",
    zh: "请给我水",
    en: "Water, please",
  },
  {
    id: "order-check",
    category: "order",
    ja: "お会計をお願いします",
    reading: "おかいけいを おねがいします",
    zh: "买单",
    en: "The check, please",
  },
  {
    id: "order-separate",
    category: "order",
    ja: "別々にお願いします",
    reading: "べつべつに おねがいします",
    zh: "分开付",
    en: "Separate checks, please",
  },
  {
    id: "order-card",
    category: "order",
    ja: "カードで払えますか？",
    reading: "かーどで はらえますか",
    zh: "可以刷卡吗？",
    en: "Can I pay by card?",
  },
  {
    id: "order-takeout",
    category: "order",
    ja: "持ち帰りできますか？",
    reading: "もちかえり できますか",
    zh: "可以外带吗？",
    en: "Can I get this to go?",
  },

  // —— 问路 ——
  {
    id: "dir-excuse",
    category: "directions",
    ja: "すみません、ちょっと伺ってもいいですか？",
    reading: "すみません、ちょっと うかがっても いいですか",
    zh: "不好意思，请问一下",
    en: "Excuse me, may I ask something?",
  },
  {
    id: "dir-where",
    category: "directions",
    ja: "〇〇はどこですか？",
    reading: "まるまるは どこですか",
    zh: "〇〇在哪里？",
    en: "Where is 〇〇?",
  },
  {
    id: "dir-station",
    category: "directions",
    ja: "駅はどちらですか？",
    reading: "えきは どちらですか",
    zh: "车站在哪边？",
    en: "Which way is the station?",
  },
  {
    id: "dir-toilet",
    category: "directions",
    ja: "トイレはどこですか？",
    reading: "といれは どこですか",
    zh: "洗手间在哪里？",
    en: "Where is the restroom?",
  },
  {
    id: "dir-this-map",
    category: "directions",
    ja: "この地図の場所まで行きたいです",
    reading: "このちずの ばしょまで いきたいです",
    zh: "我想去地图上这个地方",
    en: "I'd like to go to this place on the map",
  },
  {
    id: "dir-walk",
    category: "directions",
    ja: "歩いて何分くらいですか？",
    reading: "あるいて なんぷんくらい ですか",
    zh: "走路大概几分钟？",
    en: "About how many minutes on foot?",
  },
  {
    id: "dir-english",
    category: "directions",
    ja: "英語はわかりますか？",
    reading: "えいごは わかりますか",
    zh: "您会英语吗？",
    en: "Do you understand English?",
  },
  {
    id: "dir-slow",
    category: "directions",
    ja: "もう一度、ゆっくりお願いします",
    reading: "もういちど、ゆっくり おねがいします",
    zh: "请再说一遍，慢一点",
    en: "Once more, slowly please",
  },

  // —— 交通 ——
  {
    id: "transit-taxi",
    category: "transit",
    ja: "この住所までお願いします",
    reading: "このじゅうしょまで おねがいします",
    zh: "请送到这个地址",
    en: "Please take me to this address",
  },
  {
    id: "transit-stop",
    category: "transit",
    ja: "ここで降ろしてください",
    reading: "ここで おろしてください",
    zh: "请在这里下车",
    en: "Please let me off here",
  },
  {
    id: "transit-receipt",
    category: "transit",
    ja: "領収書をお願いします",
    reading: "りょうしゅうしょを おねがいします",
    zh: "请给我收据",
    en: "A receipt, please",
  },
  {
    id: "transit-platform",
    category: "transit",
    ja: "何番線ですか？",
    reading: "なんばんせん ですか",
    zh: "是几号站台？",
    en: "Which platform is it?",
  },
  {
    id: "transit-transfer",
    category: "transit",
    ja: "乗り換えはどこですか？",
    reading: "のりかえは どこですか",
    zh: "换乘在哪里？",
    en: "Where do I transfer?",
  },
  {
    id: "transit-ticket",
    category: "transit",
    ja: "切符売り場はどこですか？",
    reading: "きっぷうりばは どこですか",
    zh: "售票处在哪里？",
    en: "Where is the ticket counter?",
  },
  {
    id: "transit-ic",
    category: "transit",
    ja: "ICカードは使えますか？",
    reading: "あいしーかーどは つかえますか",
    zh: "可以用交通卡吗？",
    en: "Can I use an IC card?",
  },
  {
    id: "transit-reserved",
    category: "transit",
    ja: "指定席の予約があります",
    reading: "していせきの よやくが あります",
    zh: "我有指定席预约",
    en: "I have a reserved-seat booking",
  },

  // —— 紧急 ——
  {
    id: "em-ambulance",
    category: "emergency",
    ja: "救急車を呼んでください",
    reading: "きゅうきゅうしゃを よんでください",
    zh: "请叫救护车",
    en: "Please call an ambulance",
  },
  {
    id: "em-police",
    category: "emergency",
    ja: "警察を呼んでください",
    reading: "けいさつを よんでください",
    zh: "请叫警察",
    en: "Please call the police",
  },
  {
    id: "em-help",
    category: "emergency",
    ja: "助けてください",
    reading: "たすけてください",
    zh: "请帮帮我",
    en: "Please help me",
  },
  {
    id: "em-hospital",
    category: "emergency",
    ja: "病院はどこですか？",
    reading: "びょういんは どこですか",
    zh: "医院在哪里？",
    en: "Where is the hospital?",
  },
  {
    id: "em-pharmacy",
    category: "emergency",
    ja: "薬局はどこですか？",
    reading: "やっきょくは どこですか",
    zh: "药店在哪里？",
    en: "Where is the pharmacy?",
  },
  {
    id: "em-lost",
    category: "emergency",
    ja: "道に迷いました",
    reading: "みちに まよいました",
    zh: "我迷路了",
    en: "I am lost",
  },
  {
    id: "em-passport",
    category: "emergency",
    ja: "パスポートをなくしました",
    reading: "ぱすぽーとを なくしました",
    zh: "我护照丢了",
    en: "I lost my passport",
  },
  {
    id: "em-hurt",
    category: "emergency",
    ja: "具合が悪いです",
    reading: "ぐあいが わるいです",
    zh: "我身体不舒服",
    en: "I feel unwell",
  },

  // —— 购物 ——
  {
    id: "shop-looking",
    category: "shopping",
    ja: "見てるだけです",
    reading: "みてるだけです",
    zh: "我只是看看",
    en: "I'm just looking",
  },
  {
    id: "shop-how-much",
    category: "shopping",
    ja: "いくらですか？",
    reading: "いくらですか",
    zh: "多少钱？",
    en: "How much is it?",
  },
  {
    id: "shop-tax-free",
    category: "shopping",
    ja: "免税できますか？",
    reading: "めんぜい できますか",
    zh: "可以免税吗？",
    en: "Is tax-free available?",
  },
  {
    id: "shop-bag",
    category: "shopping",
    ja: "袋はいりません",
    reading: "ふくろは いりません",
    zh: "不用袋子",
    en: "No bag, thank you",
  },
  {
    id: "shop-size",
    category: "shopping",
    ja: "もう少し大きいサイズはありますか？",
    reading: "もうすこし おおきい さいずは ありますか",
    zh: "有大一点的尺码吗？",
    en: "Do you have a larger size?",
  },
  {
    id: "shop-try",
    category: "shopping",
    ja: "試着してもいいですか？",
    reading: "しちゃくして もいいですか",
    zh: "可以试穿吗？",
    en: "May I try this on?",
  },
  {
    id: "shop-wrap",
    category: "shopping",
    ja: "ギフト包装をお願いします",
    reading: "ぎふとほうそうを おねがいします",
    zh: "请帮忙礼品包装",
    en: "Gift wrapping, please",
  },
  {
    id: "shop-this",
    category: "shopping",
    ja: "これをください",
    reading: "これを ください",
    zh: "我要这个",
    en: "I'll take this",
  },

  // —— 酒店 ——
  {
    id: "hotel-checkin",
    category: "hotel",
    ja: "チェックインお願いします",
    reading: "ちぇっくいん おねがいします",
    zh: "我要办理入住",
    en: "I'd like to check in",
  },
  {
    id: "hotel-checkout",
    category: "hotel",
    ja: "チェックアウトお願いします",
    reading: "ちぇっくあうと おねがいします",
    zh: "我要办理退房",
    en: "I'd like to check out",
  },
  {
    id: "hotel-reservation",
    category: "hotel",
    ja: "予約しています",
    reading: "よやくして います",
    zh: "我有预订",
    en: "I have a reservation",
  },
  {
    id: "hotel-wifi",
    category: "hotel",
    ja: "Wi-Fiのパスワードを教えてください",
    reading: "わいふぁいの ぱすわーどを おしえてください",
    zh: "请告诉我 Wi-Fi 密码",
    en: "Could you tell me the Wi-Fi password?",
  },
  {
    id: "hotel-luggage",
    category: "hotel",
    ja: "荷物を預けてもいいですか？",
    reading: "にもつを あずけても いいですか",
    zh: "可以寄存行李吗？",
    en: "May I leave my luggage?",
  },
  {
    id: "hotel-key",
    category: "hotel",
    ja: "部屋の鍵を忘れました",
    reading: "へやの かぎを わすれました",
    zh: "我忘了房卡",
    en: "I forgot my room key",
  },
  {
    id: "hotel-late",
    category: "hotel",
    ja: "少し遅れて到着します",
    reading: "すこし おくれて とうちゃくします",
    zh: "我会晚一点到",
    en: "I will arrive a little late",
  },
  {
    id: "hotel-invoice",
    category: "hotel",
    ja: "領収書をお願いします",
    reading: "りょうしゅうしょを おねがいします",
    zh: "请给我收据",
    en: "A receipt, please",
  },
];

export function phrasesByCategory(
  category: PhraseCategory,
  phrases: readonly Phrase[] = BUILTIN_PHRASES,
): Phrase[] {
  return phrases.filter((p) => p.category === category);
}

/** Prefer Japanese address fields when present; Stay today only has `address`. */
export function stayDisplayAddress(
  stay: Pick<Stay, "address"> & {
    addressJa?: string | null;
    japaneseAddress?: string | null;
  },
): string {
  const ja =
    (typeof stay.addressJa === "string" && stay.addressJa.trim()) ||
    (typeof stay.japaneseAddress === "string" && stay.japaneseAddress.trim()) ||
    "";
  if (ja) return ja;
  return stay.address.trim();
}

export function stayPhone(
  stay: Stay & { phone?: string | null },
): string | null {
  if (typeof stay.phone === "string" && stay.phone.trim()) {
    return stay.phone.trim();
  }
  return null;
}

/** Build show-to-driver cards from stays (name + address + fixed taxi phrase). */
export function buildHotelCards(
  stays: readonly Stay[],
): HotelPhraseCard[] {
  const cards: HotelPhraseCard[] = [];
  for (const stay of stays) {
    const address = stayDisplayAddress(stay);
    if (!address && !stay.name.trim()) continue;
    const phone = stayPhone(stay as Stay & { phone?: string | null });
    const name = stay.name.trim() || address;
    const jaLines = [
      name,
      address || null,
      HOTEL_TAXI_PHRASE_JA,
    ].filter(Boolean) as string[];
    cards.push({
      id: `hotel-stay-${stay.id}`,
      category: "hotel",
      ja: jaLines.join("\n"),
      reading: HOTEL_TAXI_PHRASE_READING,
      zh: `请送到：${name}${address ? `（${address}）` : ""}`,
      en: `Please take me to: ${name}${address ? ` (${address})` : ""}`,
      stayId: stay.id,
      stayName: name,
      address,
      phone,
      kind: "hotel",
    });
  }
  return cards;
}

function isCustomPhrase(value: unknown): value is CustomPhrase {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    r.category === "custom" &&
    r.custom === true &&
    typeof r.ja === "string" &&
    typeof r.zh === "string" &&
    typeof r.reading === "string" &&
    typeof r.en === "string"
  );
}

/** Stable empty list for useSyncExternalStore snapshots (React #185). */
export const EMPTY_CUSTOM_PHRASES: CustomPhrase[] = [];
Object.freeze(EMPTY_CUSTOM_PHRASES);

/** Parse versioned custom-phrase JSON; returns [] on bad/missing data. */
export function parseCustomPhrasesJson(
  raw: string | null | undefined,
): CustomPhrase[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const record = parsed as Record<string, unknown>;
  if (record.v !== CUSTOM_PHRASES_VERSION) return [];
  if (!Array.isArray(record.items)) return [];
  const out: CustomPhrase[] = [];
  const seen = new Set<string>();
  for (const item of record.items) {
    if (!isCustomPhrase(item)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({
      id: item.id,
      category: "custom",
      custom: true,
      ja: item.ja.trim(),
      reading: item.reading.trim(),
      zh: item.zh.trim(),
      en: item.en.trim() || item.zh.trim(),
    });
  }
  return out;
}

/** Module memo so getSnapshot returns a stable reference (React #185). */
let customMemoryRaw: string | null | undefined = undefined;
let customMemoryItems: CustomPhrase[] = EMPTY_CUSTOM_PHRASES;

/** Invalidate memo (tests / cross-tab storage). */
export function invalidateCustomPhrasesMemory() {
  customMemoryRaw = undefined;
  customMemoryItems = EMPTY_CUSTOM_PHRASES;
}

/**
 * Cached custom-phrase reader. Re-parses only when the raw string changes.
 * Inject `getRaw` for pure tests (no jsdom / localStorage).
 */
export function readCachedCustomPhrases(
  getRaw: () => string | null,
): CustomPhrase[] {
  const raw = getRaw();
  if (raw === customMemoryRaw) return customMemoryItems;
  if (!raw?.trim()) {
    customMemoryRaw = raw;
    customMemoryItems = EMPTY_CUSTOM_PHRASES;
    return customMemoryItems;
  }
  const parsed = parseCustomPhrasesJson(raw);
  customMemoryRaw = raw;
  customMemoryItems =
    parsed.length === 0 ? EMPTY_CUSTOM_PHRASES : parsed;
  return customMemoryItems;
}

export function serializeCustomPhrases(
  items: readonly CustomPhrase[],
): string {
  const store: CustomPhrasesStore = {
    v: CUSTOM_PHRASES_VERSION,
    items: items.map((item) => ({
      id: item.id,
      category: "custom",
      custom: true,
      ja: item.ja,
      reading: item.reading,
      zh: item.zh,
      en: item.en,
    })),
  };
  return JSON.stringify(store);
}

function newCustomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createCustomPhrase(input: CustomPhraseInput): CustomPhrase {
  const ja = input.ja.trim();
  const zh = input.zh.trim();
  const reading = (input.reading ?? "").trim();
  return {
    id: newCustomId(),
    category: "custom",
    custom: true,
    ja,
    reading,
    zh,
    en: zh,
  };
}

/** SSR-safe read from localStorage (referentially stable while raw unchanged). */
export function readCustomPhrases(): CustomPhrase[] {
  if (typeof window === "undefined") return EMPTY_CUSTOM_PHRASES;
  try {
    return readCachedCustomPhrases(() =>
      window.localStorage.getItem(CUSTOM_PHRASES_STORAGE_KEY),
    );
  } catch {
    return EMPTY_CUSTOM_PHRASES;
  }
}

/** SSR-safe write; no-op without window. */
export function writeCustomPhrases(items: readonly CustomPhrase[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = serializeCustomPhrases(items);
    window.localStorage.setItem(CUSTOM_PHRASES_STORAGE_KEY, raw);
    customMemoryRaw = raw;
    customMemoryItems =
      items.length === 0 ? EMPTY_CUSTOM_PHRASES : items.slice();
    window.dispatchEvent(new Event("japan-trip-custom-phrases"));
  } catch {
    // quota / private mode — ignore
  }
}

export function upsertCustomPhrase(
  items: readonly CustomPhrase[],
  phrase: CustomPhrase,
): CustomPhrase[] {
  const idx = items.findIndex((p) => p.id === phrase.id);
  if (idx < 0) return [...items, phrase];
  const next = items.slice();
  next[idx] = phrase;
  return next;
}

export function deleteCustomPhrase(
  items: readonly CustomPhrase[],
  id: string,
): CustomPhrase[] {
  return items.filter((p) => p.id !== id);
}
