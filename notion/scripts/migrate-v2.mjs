#!/usr/bin/env node
/**
 * Patch existing Japan Trip data sources for itinerary v2.
 * Adds Start/Order (and Lat/Lng on Places), creates Spend, Editors, and Prep databases.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
	console.error("Set NOTION_TOKEN in .env.local");
	process.exit(1);
}
process.env.NOTION_API_TOKEN = token;
process.env.NOTION_API_VERSION ??= "2025-09-03";

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

function missingProps(schema, wanted) {
	const have = new Set(Object.keys(schema.properties ?? {}));
	const next = {};
	for (const [name, def] of Object.entries(wanted)) {
		if (!have.has(name)) next[name] = def;
	}
	return next;
}

function patchDataSource(id, wanted) {
	const schema = ntnApi(`v1/data_sources/${id}`);
	const properties = missingProps(schema, wanted);
	if (Object.keys(properties).length === 0) {
		console.log(`No new columns for ${id}`);
		return;
	}
	ntnApi(`v1/data_sources/${id}`, { properties }, "PATCH");
	console.log(`Added ${Object.keys(properties).join(", ")} to ${id}`);
}

function dropProps(id, names) {
	const schema = ntnApi(`v1/data_sources/${id}`);
	const have = schema.properties ?? {};
	const properties = {};
	for (const name of names) {
		if (have[name]) properties[name] = null;
	}
	if (Object.keys(properties).length === 0) return;
	ntnApi(`v1/data_sources/${id}`, { properties }, "PATCH");
	console.log(`Removed ${Object.keys(properties).join(", ")} from ${id}`);
}

const placesId = process.env.NOTION_PLACES_DS;
const transitId = process.env.NOTION_TRANSIT_DS;
const daysId = process.env.NOTION_DAYS_DS;
const hubId = process.env.NOTION_HUB_PAGE_ID;

if (!placesId || !transitId || !daysId || !hubId) {
	console.error("Run npm run setup:notion first (missing data-source IDs).");
	process.exit(1);
}

patchDataSource(placesId, {
	Start: { date: {} },
	Lat: { number: { format: "number" } },
	Lng: { number: { format: "number" } },
	Pending: { checkbox: {} },
	Skipped: { checkbox: {} },
});
dropProps(placesId, ["Area", "Order"]);

patchDataSource(transitId, {
	Start: { date: {} },
	Order: { number: { format: "number" } },
	Visited: { checkbox: {} },
	Skipped: { checkbox: {} },
});

let spendId = process.env.NOTION_SPEND_DS;
if (spendId) {
	try {
		ntnApi(`v1/data_sources/${spendId}`);
		console.log(`Spend already exists: ${spendId}`);
	} catch {
		spendId = "";
	}
}

if (!spendId) {
	const db = ntnApi("v1/databases", {
		parent: { type: "page_id", page_id: hubId },
		title: title("Spend"),
		icon: { type: "emoji", emoji: "💴" },
		initial_data_source: {
			properties: {
				Name: { title: {} },
				Amount: { number: { format: "number" } },
				Currency: select([
					{ name: "RM", color: "green" },
					{ name: "Yen", color: "red" },
				]),
				Kind: select([
					{ name: "Estimate", color: "blue" },
					{ name: "Actual", color: "green" },
				]),
				Category: select([
					{ name: "Food", color: "orange" },
					{ name: "Transit", color: "blue" },
					{ name: "Stay", color: "green" },
					{ name: "Ticket", color: "purple" },
					{ name: "Shop", color: "yellow" },
					{ name: "Other", color: "gray" },
				]),
				Day: {
					relation: {
						data_source_id: daysId,
						type: "single_property",
						single_property: {},
					},
				},
				Start: { date: {} },
				"Paid by": { select: { options: [] } },
				Notes: { rich_text: {} },
			},
		},
	});
	spendId = db.data_sources?.[0]?.id;
	if (!spendId) throw new Error("No Spend data source id");
	console.log(`Spend: ${db.url} (ds ${spendId})`);
}

if (spendId) {
	patchDataSource(spendId, {
		Currency: select([
			{ name: "RM", color: "green" },
			{ name: "Yen", color: "red" },
		]),
		Start: { date: {} },
		"Paid by": { select: { options: [] } },
	});
}

let editorsId = process.env.NOTION_EDITORS_DS;
if (editorsId) {
	try {
		ntnApi(`v1/data_sources/${editorsId}`);
		console.log(`Editors already exists: ${editorsId}`);
	} catch {
		editorsId = "";
	}
}

if (!editorsId) {
	const db = ntnApi("v1/databases", {
		parent: { type: "page_id", page_id: hubId },
		title: title("Editors"),
		icon: { type: "emoji", emoji: "🔑" },
		initial_data_source: {
			properties: {
				Name: { title: {} },
				PIN: { rich_text: {} },
			},
		},
	});
	editorsId = db.data_sources?.[0]?.id;
	if (!editorsId) throw new Error("No Editors data source id");
	console.log(`Editors: ${db.url} (ds ${editorsId})`);
}

let prepId = process.env.NOTION_PREP_DS;
if (prepId) {
	try {
		ntnApi(`v1/data_sources/${prepId}`);
		console.log(`Prep already exists: ${prepId}`);
	} catch {
		prepId = "";
	}
}

if (!prepId) {
	const db = ntnApi("v1/databases", {
		parent: { type: "page_id", page_id: hubId },
		title: title("Prep"),
		icon: { type: "emoji", emoji: "✅" },
		initial_data_source: {
			properties: {
				Name: { title: {} },
				Done: { checkbox: {} },
				Order: { number: { format: "number" } },
			},
		},
	});
	prepId = db.data_sources?.[0]?.id;
	if (!prepId) throw new Error("No Prep data source id");
	console.log(`Prep: ${db.url} (ds ${prepId})`);
}

if (prepId) {
	patchDataSource(prepId, {
		Done: { checkbox: {} },
		Order: { number: { format: "number" } },
	});
	const existing = ntnApi(`v1/data_sources/${prepId}/query`, { page_size: 1 }, "POST");
	if ((existing.results ?? []).length === 0) {
		for (const [index, name] of DEFAULT_PREP_ITEMS.entries()) {
			ntnApi("v1/pages", {
				parent: { data_source_id: prepId },
				properties: {
					Name: { title: title(name) },
					Done: { checkbox: false },
					Order: { number: index + 1 },
				},
			});
		}
		console.log(`Seeded ${DEFAULT_PREP_ITEMS.length} Prep rows`);
	} else {
		console.log("Prep already has rows; skipped seed");
	}
}

const keys = [
	"NOTION_TOKEN",
	"NOTION_API_VERSION",
	"NOTION_PARENT_PAGE_ID",
	"NOTION_HUB_PAGE_ID",
	"NOTION_DAYS_DS",
	"NOTION_PLACES_DS",
	"NOTION_STAYS_DS",
	"NOTION_TRANSIT_DS",
];
const lines = keys.map((key) => `${key}=${process.env[key] ?? ""}`);
lines.push(
	`NOTION_SPEND_DS=${spendId}`,
	`NOTION_EDITORS_DS=${editorsId}`,
	`NOTION_PREP_DS=${prepId}`,
	"",
);
writeFileSync(envPath, lines.join("\n"));
console.log("Updated .env.local with NOTION_SPEND_DS, NOTION_EDITORS_DS, and NOTION_PREP_DS");
