#!/usr/bin/env node
/**
 * One-shot: add Maps URL + Lat + Lng to the live Stays data source.
 * Does not change any row values — new properties are empty until a stay is saved.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_STAYS_DS=... \
 *     node notion/scripts/add-stay-maps.mjs
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
const staysId = process.env.NOTION_STAYS_DS;
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !staysId) {
	console.error(
		"Set NOTION_TOKEN and NOTION_STAYS_DS, or put them in .env.local, then rerun.",
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

function ensureType(schema, name, expected) {
	const prop = schema.properties?.[name];
	if (!prop) return "missing";
	if (prop.type === expected) return "ok";
	return `wrong:${prop.type}`;
}

const schema = await api(`v1/data_sources/${staysId}`);
const needed = {
	"Maps URL": "url",
	Lat: "number",
	Lng: "number",
};

const patch = {};
for (const [name, type] of Object.entries(needed)) {
	const state = ensureType(schema, name, type);
	if (state === "ok") {
		console.log(`Stays already has ${name} (${type}).`);
		continue;
	}
	if (state.startsWith("wrong:")) {
		console.error(
			`Stays already has ${name} as type "${state.slice(6)}", expected ${type}. Not changing it.`,
		);
		process.exit(1);
	}
	patch[name] = type === "url" ? { url: {} } : { number: { format: "number" } };
}

if (Object.keys(patch).length === 0) {
	console.log("Nothing to do.");
	process.exit(0);
}

await api(`v1/data_sources/${staysId}`, {
	method: "PATCH",
	body: { properties: patch },
});

const next = await api(`v1/data_sources/${staysId}`);
for (const [name, type] of Object.entries(needed)) {
	if (next.properties?.[name]?.type !== type) {
		console.error(`PATCH completed but ${name} (${type}) was not found on Stays.`);
		process.exit(1);
	}
}

console.log(
	`Added ${Object.keys(patch).join(", ")} to Stays. Existing rows stay empty until edited/saved with a Maps link.`,
);
