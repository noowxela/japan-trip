import { Client, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from "@notionhq/client/build/src/api-endpoints";

export function isConfigured() {
  return Boolean(
    process.env.NOTION_TOKEN &&
      process.env.NOTION_DAYS_DS &&
      process.env.NOTION_PLACES_DS &&
      process.env.NOTION_STAYS_DS &&
      process.env.NOTION_TRANSIT_DS &&
      process.env.NOTION_SPEND_DS,
  );
}

export function hasToken() {
  return Boolean(process.env.NOTION_TOKEN);
}

export function getNotion() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("NOTION_TOKEN is missing");
  }
  return new Client({
    auth: token,
    notionVersion: process.env.NOTION_API_VERSION ?? "2025-09-03",
  });
}

export function ds(
  name: "DAYS" | "PLACES" | "STAYS" | "TRANSIT" | "SPEND" | "EDITORS",
) {
  const id = process.env[`NOTION_${name}_DS`];
  if (!id) {
    throw new Error(`NOTION_${name}_DS is missing`);
  }
  return id;
}

export function hasEditorsDs() {
  return Boolean(process.env.NOTION_EDITORS_DS);
}

export async function queryAll(
  dataSourceId: string,
  options: Omit<QueryDataSourceParameters, "data_source_id"> = {},
) {
  const notion = getNotion();
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      ...options,
    });
    for (const result of response.results) {
      if (isFullPage(result)) pages.push(result);
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

export function titleOf(page: PageObjectResponse) {
  const title = Object.values(page.properties).find(
    (property) => property.type === "title",
  );
  if (!title || title.type !== "title") return "Untitled";
  return title.title.map((part) => part.plain_text).join("").trim() || "Untitled";
}

export function richTextOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "rich_text") return "";
  return property.rich_text.map((part) => part.plain_text).join("");
}

export function selectOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "select") return null;
  return property.select?.name ?? null;
}

export function statusOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "status") return null;
  return property.status?.name ?? null;
}

export function dateOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "date") return null;
  return property.date?.start ?? null;
}

export function urlOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "url") return null;
  return property.url;
}

export function checkboxOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "checkbox") return false;
  return property.checkbox;
}

export function relationIdsOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "relation") return [];
  return property.relation.map((item) => item.id);
}

export function numberOf(page: PageObjectResponse, name: string) {
  const property = page.properties[name];
  if (!property || property.type !== "number") return null;
  return property.number;
}

export function textProp(value: string) {
  return {
    rich_text: [{ type: "text" as const, text: { content: value } }],
  };
}

export function titleProp(value: string) {
  return {
    title: [{ type: "text" as const, text: { content: value } }],
  };
}
