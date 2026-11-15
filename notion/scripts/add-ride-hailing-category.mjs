#!/usr/bin/env node
/**
 * One-shot: add a Ride-hailing option to the Spend Category select.
 * Schema only — does not change any existing spend row values.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_SPEND_DS=... \
 *     node notion/scripts/add-ride-hailing-category.mjs
 *
 * Also reads app-root .env.local when those variables are unset.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..", "..");
const OPTION_NAME = "Ride-hailing";
const OPTION_COLOR = "brown";

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
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !spendId) {
	console.error(
		"Set NOTION_TOKEN and NOTION_SPEND_DS, or put them in .env.local, then rerun.",
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
const category = schema.properties?.Category;
if (!category) {
	console.error("Spend has no Category property. Not changing anything.");
	process.exit(1);
}
if (category.type !== "select") {
	console.error(
		`Spend Category is type "${category.type}", expected select. Not changing it.`,
	);
	process.exit(1);
}

const existing = category.select?.options ?? [];
if (existing.some((option) => option.name === OPTION_NAME)) {
	console.log(`Spend Category already has ${OPTION_NAME}. Nothing to do.`);
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

await api(`v1/data_sources/${spendId}`, {
	method: "PATCH",
	body: {
		properties: {
			Category: {
				select: { options },
			},
		},
	},
});

const next = await api(`v1/data_sources/${spendId}`);
const nextOptions = next.properties?.Category?.select?.options ?? [];
if (!nextOptions.some((option) => option.name === OPTION_NAME)) {
	console.error(`PATCH completed but ${OPTION_NAME} was not found on Spend Category.`);
	process.exit(1);
}

console.log(`Added ${OPTION_NAME} to Spend Category.`);
