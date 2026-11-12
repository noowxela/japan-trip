#!/usr/bin/env node
/**
 * Fallback when `ntn notion-as-code apply` is unavailable.
 * Uses the Notion CLI public API (`ntn api`) to create the Japan Trip hub
 * and empty Days / Places / Stays / Transit databases.
 *
 * Env:
 *   NOTION_API_TOKEN or NOTION_TOKEN
 *   NOTION_PARENT_PAGE_ID  (page the integration can write to)
 *   NOTION_API_VERSION     (default 2025-09-03)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PREP_ITEMS } from "./prep-defaults.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..", "..");
const envPath = join(appRoot, ".env.local");

function loadEnvFile(path) {
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
		if (!match) continue;
		process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
	}
}

loadEnvFile(envPath);

const token = process.env.NOTION_API_TOKEN || process.env.NOTION_TOKEN;
if (!token) {
	console.error(
		"Set NOTION_TOKEN in japan_trip_app/.env.local (internal integration secret).",
	);
	process.exit(1);
}
process.env.NOTION_API_TOKEN = token;
process.env.NOTION_API_VERSION ??= "2025-09-03";

const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

function ntnApi(path, body, method) {
	const args = ["--yes", "ntn", "api", path];
	if (method) args.push("-X", method);
	if (body !== undefined) args.push("-d", JSON.stringify(body));
	const stdout = execFileSync("npx", args, {
		encoding: "utf8",
		env: process.env,
		maxBuffer: 10 * 1024 * 1024,
	});
	return JSON.parse(stdout);
}

function title(content) {
	return [{ type: "text", text: { content } }];
}

function select(options) {
	return { select: { options } };
}

const HUB_MARKDOWN = `# Japan Trip

Plan days, places, stays, and transit in the databases on this page.
Fill rows in Notion (any device). The trip app reads and writes the same data.

## Databases

- **Days** — one row per itinerary day
- **Places** — sights, food, shops (related to a Day)
- **Stays** — hotels and bookings
- **Transit** — trains, flights, metro (related to a Day)
- **Editors** — name + PIN for people who can edit in the app
- **Prep** — packing and booking checklist shared with the app
`;

console.log("Creating Japan Trip hub page…");

let hub;
try {
	hub = ntnApi("v1/pages", {
		parent: { type: "workspace", workspace: true },
		icon: { type: "emoji", emoji: "🗾" },
		properties: {
			title: { title: title("Japan Trip") },
		},
	});
} catch (error) {
	if (!parentPageId) {
		console.error(
			"Could not create a workspace-level page. Share any Notion page with this integration, copy its URL id into NOTION_PARENT_PAGE_ID in .env.local, then re-run.",
		);
		console.error(String(error?.stderr || error?.message || error));
		process.exit(1);
	}
	console.log("Creating under NOTION_PARENT_PAGE_ID…");
	hub = ntnApi("v1/pages", {
		parent: { type: "page_id", page_id: parentPageId },
		icon: { type: "emoji", emoji: "🗾" },
		properties: {
			title: { title: title("Japan Trip") },
		},
	});
}

const hubId = hub.id;
console.log(`Hub: ${hub.url ?? hubId}`);

try {
	ntnApi(`v1/blocks/${hubId}/children`, {
		children: [
			{
				object: "block",
				type: "paragraph",
				paragraph: {
					rich_text: [
						{
							type: "text",
							text: { content: HUB_MARKDOWN.replace(/^# Japan Trip\n\n/, "") },
						},
					],
				},
			},
		],
	});
} catch (error) {
	console.warn("Could not append hub page content:", error.message);
}

function createDatabase(name, emoji, properties) {
	const db = ntnApi("v1/databases", {
		parent: { type: "page_id", page_id: hubId },
		title: title(name),
		icon: { type: "emoji", emoji },
		initial_data_source: { properties },
	});
	const dataSourceId = db.data_sources?.[0]?.id;
	if (!dataSourceId) {
		throw new Error(`No data source id returned for ${name}`);
	}
	console.log(`${name}: ${db.url} (ds ${dataSourceId})`);
	return { db, dataSourceId };
}

const days = createDatabase("Days", "📅", {
	Name: { title: {} },
	Date: { date: {} },
	City: select([
		{ name: "Tokyo", color: "red" },
		{ name: "Kyoto", color: "orange" },
		{ name: "Osaka", color: "blue" },
		{ name: "Other", color: "gray" },
	]),
	Status: { status: {} },
});

const places = createDatabase("Places", "📍", {
	Name: { title: {} },
	Type: select([
		{ name: "Sight", color: "purple" },
		{ name: "Food", color: "orange" },
		{ name: "Shop", color: "yellow" },
		{ name: "Cafe", color: "brown" },
		{ name: "Other", color: "gray" },
	]),
	"Maps URL": { url: {} },
	Notes: { rich_text: {} },
	Visited: { checkbox: {} },
	Skipped: { checkbox: {} },
	Day: {
		relation: {
			data_source_id: days.dataSourceId,
			type: "single_property",
			single_property: {},
		},
	},
});

const stays = createDatabase("Stays", "🏨", {
	Name: { title: {} },
	"Check-in": { date: {} },
	"Check-out": { date: {} },
	Address: { rich_text: {} },
	"Booking URL": { url: {} },
	Confirmation: { rich_text: {} },
	"Maps URL": { url: {} },
	Lat: { number: { format: "number" } },
	Lng: { number: { format: "number" } },
});

const transit = createDatabase("Transit", "🚆", {
	Name: { title: {} },
	Mode: select([
		{ name: "Shinkansen", color: "blue" },
		{ name: "Metro", color: "green" },
		{ name: "Bus", color: "orange" },
		{ name: "Flight", color: "purple" },
		{ name: "Walk", color: "gray" },
	]),
	From: { rich_text: {} },
	To: { rich_text: {} },
	Notes: { rich_text: {} },
	Date: { date: {} },
	"Booking URL": { url: {} },
	Day: {
		relation: {
			data_source_id: days.dataSourceId,
			type: "single_property",
			single_property: {},
		},
	},
	Visited: { checkbox: {} },
	Skipped: { checkbox: {} },
});

const editors = createDatabase("Editors", "🔑", {
	Name: { title: {} },
	PIN: { rich_text: {} },
});

const prep = createDatabase("Prep", "✅", {
	Name: { title: {} },
	Done: { checkbox: {} },
	Order: { number: { format: "number" } },
});

for (const [index, name] of DEFAULT_PREP_ITEMS.entries()) {
	ntnApi("v1/pages", {
		parent: { data_source_id: prep.dataSourceId },
		properties: {
			Name: { title: title(name) },
			Done: { checkbox: false },
			Order: { number: index + 1 },
		},
	});
}
console.log(`Seeded ${DEFAULT_PREP_ITEMS.length} Prep rows`);

const envLines = [
	`NOTION_TOKEN=${token}`,
	"NOTION_API_VERSION=2025-09-03",
	parentPageId ? `NOTION_PARENT_PAGE_ID=${parentPageId}` : "NOTION_PARENT_PAGE_ID=",
	`NOTION_HUB_PAGE_ID=${hubId}`,
	`NOTION_DAYS_DS=${days.dataSourceId}`,
	`NOTION_PLACES_DS=${places.dataSourceId}`,
	`NOTION_STAYS_DS=${stays.dataSourceId}`,
	`NOTION_TRANSIT_DS=${transit.dataSourceId}`,
	`NOTION_EDITORS_DS=${editors.dataSourceId}`,
	`NOTION_PREP_DS=${prep.dataSourceId}`,
	"",
];

mkdirSync(appRoot, { recursive: true });
writeFileSync(envPath, envLines.join("\n"));
console.log(`Wrote data-source IDs to ${envPath}`);
