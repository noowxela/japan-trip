#!/usr/bin/env node
/**
 * One-shot: add a Spend → Transit relation property named Transit.
 * Prefers a two-way (dual_property) relation so Transit pages also show
 * linked expenses. Falls back to a one-way relation if dual is rejected.
 * Schema only — does not change any existing spend row values.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_SPEND_DS=... NOTION_TRANSIT_DS=... \
 *     node notion/scripts/add-spend-transit.mjs
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
const transitId = process.env.NOTION_TRANSIT_DS;
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !spendId || !transitId) {
	console.error(
		"Set NOTION_TOKEN, NOTION_SPEND_DS, and NOTION_TRANSIT_DS, or put them in .env.local, then rerun.",
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
		const error = new Error(`Notion ${method} ${path} failed (${response.status}): ${message}`);
		error.status = response.status;
		error.body = data;
		throw error;
	}
	return data;
}

function transitRelation(dual) {
	if (dual) {
		return {
			relation: {
				data_source_id: transitId,
				type: "dual_property",
				dual_property: {},
			},
		};
	}
	return {
		relation: {
			data_source_id: transitId,
			type: "single_property",
			single_property: {},
		},
	};
}

const schema = await api(`v1/data_sources/${spendId}`);
const existing = schema.properties?.Transit;
if (existing) {
	if (existing.type === "relation") {
		console.log("Spend already has Transit (relation). Nothing to do.");
		process.exit(0);
	}
	console.error(
		`Spend already has Transit as type "${existing.type}", expected relation. Not changing it.`,
	);
	process.exit(1);
}

let mode = "two-way";
try {
	await api(`v1/data_sources/${spendId}`, {
		method: "PATCH",
		body: { properties: { Transit: transitRelation(true) } },
	});
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.warn(`Two-way Transit relation failed (${message}). Falling back to one-way.`);
	mode = "one-way";
	await api(`v1/data_sources/${spendId}`, {
		method: "PATCH",
		body: { properties: { Transit: transitRelation(false) } },
	});
}

const next = await api(`v1/data_sources/${spendId}`);
if (next.properties?.Transit?.type !== "relation") {
	console.error("PATCH completed but Transit relation was not found on Spend.");
	process.exit(1);
}

console.log(`Added Transit (relation to Transit, ${mode}) on Spend. Existing rows are unchanged.`);
