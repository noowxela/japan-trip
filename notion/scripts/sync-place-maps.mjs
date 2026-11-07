#!/usr/bin/env node
/**
 * Geocode every Places row into Lat/Lng/Maps URL, then drop Area and Order.
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
		process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
	}
}

loadEnvFile(join(appRoot, ".env.local"));

const token = process.env.NOTION_TOKEN;
const version = process.env.NOTION_API_VERSION || "2025-09-03";
const placesId = process.env.NOTION_PLACES_DS;
const daysId = process.env.NOTION_DAYS_DS;

if (!token || !placesId || !daysId) {
	console.error("Missing NOTION_TOKEN or data-source IDs in .env.local");
	process.exit(1);
}

const LANDMARKS = [
	[/土井活鰻|doi\s*katsu|doikatsuman/i, 34.9679, 135.7709],
	[/oagari|おあがり|肉の隠れ家|volcano-?\s*steak/i, 35.0037, 135.7751],
	[/fushimi\s*inari|伏見稲荷/i, 34.96714, 135.77268],
	[/kiyomizu|清水寺/i, 34.99486, 135.78504],
	[/ninen|sannen|二年坂|三年坂/i, 34.99755, 135.78072],
	[/kodai-?ji|高台寺/i, 35.00062, 135.78141],
	[/namba\s*yasaka|難波八阪/i, 34.66148, 135.49673],
	[/nanaya|ななや/i, 35.0084, 135.7645],
	[/idumoya|izumoya|いづもや/i, 35.00403, 135.77109],
	[/sadakazu|さだかず/i, 35.00422, 135.77626],
	[/sushiro|スシロー/i, 35.0058, 135.76853],
	[/katsuda|かつだ|かつ田/i, 35.0029, 135.769],
	[/kagizen|鍵善良房/i, 35.00365, 135.7745],
	[/gokago/i, 34.99554, 135.78179],
	[/katsuoji|勝尾寺/i, 34.86583, 135.49111],
	[/yasaka|八坂/i, 35.00365, 135.77856],
	[/nishiki|錦市場|锦市场/i, 35.00505, 135.76497],
	[/gion|祇園/i, 35.00361, 135.775],
	[/kamo\s*river|鴨川|鸭川/i, 35.0137, 135.7716],
	[/kyoto\s*station|京都駅|京都站/i, 34.98585, 135.75877],
	[/back hotel|mitsui garden|kyoto shijo|京都四条/i, 35.00288, 135.76155],
	[/todaiji|東大寺|东大寺/i, 34.689, 135.8398],
	[/二月堂|nigatsu/i, 34.6892, 135.8436],
	[/若草|wakakusa/i, 34.6913, 135.8556],
	[/春日大社|kasugataisha|kasuga\s*taisha/i, 34.6814, 135.8485],
	[/奈良公園|nara park/i, 34.6851, 135.843],
	[/中谷堂|nakatanidou/i, 34.6847, 135.8275],
	[/東向|东向|higashimuki/i, 34.6845, 135.8286],
	[/kintetsu\s*nara|奈良站|奈良駅/i, 34.6845, 135.8278],
	[/dotonbori|道顿掘|道頓堀|道顿堀/i, 34.66903, 135.50157],
	[/kuromon|黒門/i, 34.66371, 135.50693],
	[/tsutenkaku|通天閣/i, 34.65254, 135.50631],
	[/namba|難波|南波/i, 34.6628, 135.5013],
	[/水谷茶屋|mizuya/i, 34.6817, 135.8479],
	[/平宗|hiraso/i, 34.6779, 135.8289],
	[/麺闘庵|mentouan/i, 34.6774, 135.8305],
	[/柿の専門|kaki no senmon/i, 34.6776, 135.8294],
	[/kakinoha|柿の葉|tanaka/i, 34.6772, 135.829],
	[/tori\s*tamura|鶏田村/i, 34.6849, 135.8282],
	[/yakiniku.*moku|焼肉工房|shinomiya/i, 34.6947, 135.8042],
	[/edogawa|江戸川|shinsaibashi\s*parco/i, 34.6751, 135.5015],
	[/ichiran/i, 34.67429, 135.50191],
	[/nishiya|にし家/i, 34.67373, 135.5024],
	[/dorajyu|どら十|鉄板酒場/i, 34.67222, 135.50237],
	[/tokito|と木と/i, 34.67307, 135.51349],
	[/harbs|daimaru\s*umeda|大丸梅田/i, 34.70187, 135.49626],
	[/lucua|united\s*arrows/i, 34.70188, 135.49634],
	[/kansai\s*international|関西国際/i, 34.4342, 135.2442],
	[/王将|百万遍|hyakumanben/i, 35.02958, 135.77882],
	[/m\s*stand|nanzenji\s*cafe/i, 35.01155, 135.78932],
	[/blue\s*bottle/i, 35.01139, 135.78949],
	[/yamatoan|大和庵|茶粥/i, 34.6816, 135.8212],
	[/amadeo|あまでお/i, 34.69742, 135.49356],
	[/klia|kuala\s*lumpur/i, 2.74313, 101.7064],
];

function mapsUrl(lat, lng) {
	return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function lookupLandmark(name) {
	const hit = LANDMARKS.find(([match]) => match.test(name));
	if (!hit) return null;
	return { lat: hit[1], lng: hit[2], mapsUrl: mapsUrl(hit[1], hit[2]), source: "landmark" };
}

function inferCity(name, dayCity) {
	if (/奈良|nara|todaiji|kasuga|wakakusa|nigatsu|二月堂|春日|若草|東大寺|東向|东向|平宗|中谷堂|麺闘|柿|kakinoha|shinomiya|新大宮|yamatoan|大和庵|茶粥/i.test(name)) {
		return "Nara";
	}
	if (/難波|南波|namba|心斎橋|shinsaibashi|parco|dotonbori|道顿|道頓|kuromon|黒門|tsutenkaku|通天閣|umeda|lucua|harbs|ichiran|kansai|kitashinchi|amadeo/i.test(name)) {
		return "Osaka";
	}
	if (/伏見|fushimi|祇園|gion|清水|kiyomizu|錦|nishiki|八坂|yasaka|四条|shijo|百万遍|blue\s*bottle|nanzenji|m\s*stand/i.test(name)) {
		return "Kyoto";
	}
	return dayCity || undefined;
}

function cleanQuery(query) {
	return query
		.replace(/[🌄🍑]/g, " ")
		.replace(/[（）()&，,]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

async function nominatim(query, city) {
	const url = new URL("https://nominatim.openstreetmap.org/search");
	url.searchParams.set("q", [query, city, "Japan"].filter(Boolean).join(", "));
	url.searchParams.set("format", "json");
	url.searchParams.set("limit", "1");
	url.searchParams.set("countrycodes", "jp");
	const response = await fetch(url, {
		headers: { "User-Agent": "japan-trip-app/1.0 (itinerary sync)" },
	});
	if (!response.ok) return null;
	const results = await response.json();
	const first = results[0];
	if (!first) return null;
	const lat = Number(first.lat);
	const lng = Number(first.lon);
	if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
	return { lat, lng, mapsUrl: mapsUrl(lat, lng), source: "nominatim" };
}

async function api(path, init = {}) {
	const res = await fetch(`https://api.notion.com/${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Notion-Version": version,
			"Content-Type": "application/json",
			...(init.headers || {}),
		},
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 800)}`);
	return text ? JSON.parse(text) : null;
}

async function queryAll(dataSourceId) {
	const pages = [];
	let cursor;
	do {
		const response = await api(`v1/data_sources/${dataSourceId}/query`, {
			method: "POST",
			body: JSON.stringify({
				page_size: 100,
				...(cursor ? { start_cursor: cursor } : {}),
			}),
		});
		pages.push(...response.results);
		cursor = response.has_more ? response.next_cursor : undefined;
	} while (cursor);
	return pages;
}

function titleOf(page) {
	const title = Object.values(page.properties).find((p) => p.type === "title");
	return title?.title?.map((t) => t.plain_text).join("").trim() || "Untitled";
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const days = await queryAll(daysId);
const dayById = new Map(
	days.map((page) => [
		page.id,
		{
			name: titleOf(page),
			city: page.properties.City?.select?.name ?? null,
		},
	]),
);

const places = await queryAll(placesId);
console.log(`Geocoding ${places.length} places…`);

for (const page of places) {
	const name = titleOf(page);
	const dayId = page.properties.Day?.relation?.[0]?.id;
	const day = dayId ? dayById.get(dayId) : null;
	const city = inferCity(name, day?.city ?? undefined);

	if ((/session/i.test(name) && /🍑/.test(name)) || /returning flight/i.test(name)) {
		console.log(`skip  ${name}`);
		continue;
	}

	const existingLat = page.properties.Lat?.number;
	const existingLng = page.properties.Lng?.number;
	if (existingLat != null && existingLng != null) {
		console.log(`have  ${name}`);
		continue;
	}

	let coords = lookupLandmark(name);
	if (!coords) {
		const query = cleanQuery(name);
		coords = await nominatim(query, city);
		await sleep(1100);
		if (!coords) {
			const latin = query.replace(/[\u3000-\u9fff]/g, " ").replace(/\s+/g, " ").trim();
			const jp = query.replace(/[A-Za-z0-9.,'’\-]+/g, " ").replace(/\s+/g, " ").trim();
			if (latin && latin !== query) {
				coords = await nominatim(latin, city);
				await sleep(1100);
			}
			if (!coords && jp && jp !== query) {
				coords = await nominatim(jp, city);
				await sleep(1100);
			}
		}
	}

	if (!coords) {
		console.log(`MISS  ${name} (${city ?? "no city"})`);
		continue;
	}

	await api(`v1/pages/${page.id}`, {
		method: "PATCH",
		body: JSON.stringify({
			properties: {
				Lat: { number: coords.lat },
				Lng: { number: coords.lng },
				"Maps URL": { url: coords.mapsUrl },
			},
		}),
	});
	console.log(
		`ok    ${name}  ${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}  [${coords.source}]`,
	);
}

const schema = await api(`v1/data_sources/${placesId}`);
const leftover = ["Area", "Order"].filter((name) => schema.properties?.[name]);
if (leftover.length) {
	console.log(`Removing ${leftover.join(" and ")} from Places…`);
	await api(`v1/data_sources/${placesId}`, {
		method: "PATCH",
		body: JSON.stringify({
			properties: Object.fromEntries(leftover.map((name) => [name, null])),
		}),
	});
}

const nextSchema = leftover.length ? await api(`v1/data_sources/${placesId}`) : schema;
console.log(
	"Places columns:",
	Object.keys(nextSchema.properties || {})
		.sort()
		.join(", "),
);
console.log("Done.");
