#!/usr/bin/env node
/**
 * One-shot: add an Each Paid Own checkbox to the live Spend data source.
 * Schema only — does not change any existing spend row values.
 * New checkboxes default to unchecked.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_SPEND_DS=... \
 *     node notion/scripts/add-spend-each-paid-own.mjs
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
const existing = schema.properties?.["Each Paid Own"];
if (existing) {
	if (existing.type === "checkbox") {
		console.log("Spend already has Each Paid Own (checkbox). Nothing to do.");
		process.exit(0);
	}
	console.error(
		`Spend already has Each Paid Own as type "${existing.type}", expected checkbox. Not changing it.`,
	);
	process.exit(1);
}

await api(`v1/data_sources/${spendId}`, {
	method: "PATCH",
	body: {
		properties: {
			"Each Paid Own": { checkbox: {} },
		},
	},
});

const next = await api(`v1/data_sources/${spendId}`);
if (next.properties?.["Each Paid Own"]?.type !== "checkbox") {
	console.error("PATCH completed but Each Paid Own checkbox was not found on Spend.");
	process.exit(1);
}

console.log("Added Each Paid Own (checkbox) to Spend. Existing rows default to unchecked.");
