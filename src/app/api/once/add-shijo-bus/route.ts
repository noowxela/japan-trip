import { Client, isFullPage } from "@notionhq/client";
import { notionStartProperty } from "@/lib/notion-date";
import { ds, getNotion, queryAll, textProp, titleOf, titleProp } from "@/lib/notion";
import { relationIdsOf } from "@/lib/notion";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** One-shot bootstrap token — remove this route after use. */
const ONCE = "e4a991b5f419ebf7323fb932a3a91558992a826437debd28";

const DAY4_ID = "3cbb5fd4-cdf7-8174-863b-e28a86c1c109";
const NAME = "四条河原町巴士站";
const START = "2026-11-09T14:00:00+09:00";
const FROM =
  "四条河原町（市巴士207 / City Bus 207）";
const TO =
  "清水道 → 清水寺（步行约10分钟上山；塞车可能延误 / ~10 min walk uphill; traffic may delay）";

function authorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${ONCE}`;
}

async function findExisting(notion: Client) {
  const pages = await queryAll(ds("TRANSIT"));
  for (const page of pages) {
    if (titleOf(page) !== NAME) continue;
    const days = relationIdsOf(page, "Day");
    if (days.includes(DAY4_ID) || days.includes(DAY4_ID.replace(/-/g, ""))) {
      return page.id;
    }
    // Notion relation ids usually keep dashes
    if (days.some((id) => id.replace(/-/g, "") === DAY4_ID.replace(/-/g, ""))) {
      return page.id;
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const notion = getNotion();
    const existing = await findExisting(notion);
    if (existing) {
      return Response.json({
        ok: true,
        created: false,
        id: existing,
        name: NAME,
        message: "already exists",
      });
    }

    const page = await notion.pages.create({
      parent: { data_source_id: ds("TRANSIT") },
      properties: {
        Name: titleProp(NAME),
        Mode: { select: { name: "Bus" } },
        From: textProp(FROM),
        To: textProp(TO),
        Date: { date: { start: "2026-11-09" } },
        Day: { relation: [{ id: DAY4_ID }] },
        Start: notionStartProperty(START),
        Order: { number: 3 },
      },
    });

    if (!isFullPage(page)) {
      return Response.json({ ok: false, error: "create returned incomplete page" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      created: true,
      id: page.id,
      name: NAME,
      dayId: DAY4_ID,
      start: START,
      order: 3,
      from: FROM,
      to: TO,
      mode: "Bus",
      url: page.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("add-shijo-bus failed", error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
