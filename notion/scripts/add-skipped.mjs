#!/usr/bin/env node
/**
 * One-shot: add a Skipped checkbox to the live Places and Transit data sources.
 * Does not change any row values — new checkboxes default to unchecked.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_PLACES_DS=... NOTION_TRANSIT_DS=... \
 *     node notion/scripts/add-skipped.mjs
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
const placesId = process.env.NOTION_PLACES_DS;
const transitId = process.env.NOTION_TRANSIT_DS;
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !placesId || !transitId) {
	console.error(
		"Set NOTION_TOKEN, NOTION_PLACES_DS, and NOTION_TRANSIT_DS, or put them in .env.local, then rerun.",
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

async function ensureSkipped(dsId, label) {
	const schema = await api(`v1/data_sources/${dsId}`);
	const skipped = schema.properties?.Skipped;
	if (skipped) {
		if (skipped.type === "checkbox") {
			console.log(`${label} already has Skipped (checkbox). Nothing to do.`);
			return;
		}
		console.error(
			`${label} already has Skipped as type "${skipped.type}", expected checkbox. Not changing it.`,
		);
		process.exit(1);
	}

	await api(`v1/data_sources/${dsId}`, {
		method: "PATCH",
		body: {
			properties: {
				Skipped: { checkbox: {} },
			},
		},
	});

	const next = await api(`v1/data_sources/${dsId}`);
	if (next.properties?.Skipped?.type !== "checkbox") {
		console.error(`PATCH completed but Skipped checkbox was not found on ${label}.`);
		process.exit(1);
	}

	console.log(`Added Skipped (checkbox) to ${label}. Existing rows default to unchecked.`);
}

await ensureSkipped(placesId, "Places");
await ensureSkipped(transitId, "Transit");
