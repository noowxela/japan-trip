#!/usr/bin/env node
/**
 * One-shot: add a Spend → Places relation property named Place.
 * Schema only — does not change any existing spend row values.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_SPEND_DS=... NOTION_PLACES_DS=... \
 *     node notion/scripts/add-spend-place.mjs
 *
 * Also reads app-root .env.local when those variables are unset.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..", "..");

function loadEnvFile(path) {
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
		if (!match) continue;
		if (process.env[match[1]]) continue;
		process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
	}
}

loadEnvFile(join(appRoot, ".env.local"));

const token = process.env.NOTION_TOKEN || process.env.NOTION_API_TOKEN;
const spendId = process.env.NOTION_SPEND_DS;
const placesId = process.env.NOTION_PLACES_DS;
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !spendId || !placesId) {
	console.error(
		"Set NOTION_TOKEN, NOTION_SPEND_DS, and NOTION_PLACES_DS, or put them in .env.local, then rerun.",
	);
	process.exit(1);
}

async function api(path, { method = "GET", body } = {}) {
	const response = await fetch(`https://api.notion.com/${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			"Notion-Version": apiVersion,
			"Content-Type": "application/json",
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await response.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		data = { message: text };
	}
	if (!response.ok) {
		const message = data.message || response.statusText;
		throw new Error(`Notion ${method} ${path} failed (${response.status}): ${message}`);
	}
	return data;
}

const schema = await api(`v1/data_sources/${spendId}`);
const existing = schema.properties?.Place;
if (existing) {
	if (existing.type === "relation") {
		console.log("Spend already has Place (relation). Nothing to do.");
		process.exit(0);
	}
	console.error(
		`Spend already has Place as type "${existing.type}", expected relation. Not changing it.`,
	);
	process.exit(1);
}

await api(`v1/data_sources/${spendId}`, {
	method: "PATCH",
	body: {
		properties: {
			Place: {
				relation: {
					data_source_id: placesId,
					type: "single_property",
					single_property: {},
				},
			},
		},
	},
});

const next = await api(`v1/data_sources/${spendId}`);
if (next.properties?.Place?.type !== "relation") {
	console.error("PATCH completed but Place relation was not found on Spend.");
	process.exit(1);
}

console.log("Added Place (relation to Places) on Spend. Existing rows are unchanged.");
