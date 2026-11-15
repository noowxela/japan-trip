#!/usr/bin/env node
/**
 * One-shot: add a Train option to the Transit Mode select.
 * Schema only — does not change any existing transit row values.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_TRANSIT_DS=... \
 *     node notion/scripts/add-transit-train-mode.mjs
 *
 * Also reads app-root .env.local when those variables are unset.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..", "..");
const OPTION_NAME = "Train";
const OPTION_COLOR = "yellow";

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
const transitId = process.env.NOTION_TRANSIT_DS;
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !transitId) {
	console.error(
		"Set NOTION_TOKEN and NOTION_TRANSIT_DS, or put them in .env.local, then rerun.",
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

const schema = await api(`v1/data_sources/${transitId}`);
const mode = schema.properties?.Mode;
if (!mode) {
	console.error("Transit has no Mode property. Not changing anything.");
	process.exit(1);
}
if (mode.type !== "select") {
	console.error(
		`Transit Mode is type "${mode.type}", expected select. Not changing it.`,
	);
	process.exit(1);
}

const existing = mode.select?.options ?? [];
if (existing.some((option) => option.name === OPTION_NAME)) {
	console.log(`Transit Mode already has ${OPTION_NAME}. Nothing to do.`);
	process.exit(0);
}

const options = [
	...existing.map((option) => ({
		id: option.id,
		name: option.name,
		color: option.color,
	})),
	{ name: OPTION_NAME, color: OPTION_COLOR },
];

await api(`v1/data_sources/${transitId}`, {
	method: "PATCH",
	body: {
		properties: {
			Mode: {
				select: { options },
			},
		},
	},
});

const next = await api(`v1/data_sources/${transitId}`);
const nextOptions = next.properties?.Mode?.select?.options ?? [];
if (!nextOptions.some((option) => option.name === OPTION_NAME)) {
	console.error(`PATCH completed but ${OPTION_NAME} was not found on Transit Mode.`);
	process.exit(1);
}

console.log(`Added ${OPTION_NAME} to Transit Mode.`);
