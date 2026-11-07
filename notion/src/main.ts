/**
 * Japan Trip workspace structure.
 *
 * Apply with: ntn notion-as-code apply .
 * Re-running updates the same resources (stable resourceIds). Do not seed trip rows.
 */

import { hubContent } from "./content";
import { notion } from "./lib/notion";

const spaceParent = {
	type: "resourceId",
	resourceId: "alex-notion-space",
} as const;

const trip = notion.teamspace({
	resourceId: "japan-trip-teamspace",
	parent: spaceParent,
	name: "Japan Trip",
	accessLevel: "open",
	icon: { type: "emoji", emoji: "🗾" },
	description: "Itinerary databases for the Japan trip.",
});

const hub = trip.addPage({
	resourceId: "japan-trip-hub",
	properties: { title: notion.text("Japan Trip") },
	icon: { type: "emoji", emoji: "🗾" },
	content: hubContent,
});

const hubParent = {
	type: "resourceId",
	resourceId: hub.resourceId,
} as const;

notion.database({
	resourceId: "days-db",
	parent: hubParent,
	name: "Days",
	icon: { type: "notion_icon", description: "calendar", color: "red" },
	description: "One row per itinerary day.",
	dataSources: [
		{
			resourceId: "days-ds",
			name: "Days",
			properties: [
				{ resourceId: "days-name-prop", name: "Name", type: "title" },
				{ resourceId: "days-date-prop", name: "Date", type: "date" },
				{
					resourceId: "days-city-prop",
					name: "City",
					type: "select",
					options: [
						{ name: "Tokyo", color: "red" },
						{ name: "Kyoto", color: "orange" },
						{ name: "Osaka", color: "blue" },
						{ name: "Other", color: "gray" },
					],
				},
				{
					resourceId: "days-status-prop",
					name: "Status",
					type: "status",
					options: {
						todo: [{ name: "Not started", color: "gray", default: true }],
						inProgress: [{ name: "In progress", color: "blue" }],
						complete: [{ name: "Done", color: "green" }],
					},
				},
			],
		},
	],
});

notion.database({
	resourceId: "places-db",
	parent: hubParent,
	name: "Places",
	icon: { type: "notion_icon", description: "pin", color: "pink" },
	description: "Sights, food, shops. Link each place to a Day.",
	dataSources: [
		{
			resourceId: "places-ds",
			name: "Places",
			properties: [
				{ resourceId: "places-name-prop", name: "Name", type: "title" },
				{
					resourceId: "places-type-prop",
					name: "Type",
					type: "select",
					options: [
						{ name: "Sight", color: "purple" },
						{ name: "Food", color: "orange" },
						{ name: "Shop", color: "yellow" },
						{ name: "Cafe", color: "brown" },
						{ name: "Other", color: "gray" },
					],
				},
				{ resourceId: "places-maps-prop", name: "Maps URL", type: "url" },
				{ resourceId: "places-notes-prop", name: "Notes", type: "text" },
				{
					resourceId: "places-visited-prop",
					name: "Visited",
					type: "checkbox",
				},
				{
					resourceId: "places-skipped-prop",
					name: "Skipped",
					type: "checkbox",
				},
				{
					resourceId: "places-day-prop",
					name: "Day",
					type: "relation",
					targetDataSourceResourceId: "days-ds",
					limit: 1,
				},
				{ resourceId: "places-start-prop", name: "Start", type: "date" },
				{ resourceId: "places-lat-prop", name: "Lat", type: "number" },
				{ resourceId: "places-lng-prop", name: "Lng", type: "number" },
			],
		},
	],
});

notion.database({
	resourceId: "stays-db",
	parent: hubParent,
	name: "Stays",
	icon: { type: "notion_icon", description: "home", color: "green" },
	description: "Hotels and lodging bookings.",
	dataSources: [
		{
			resourceId: "stays-ds",
			name: "Stays",
			properties: [
				{ resourceId: "stays-name-prop", name: "Name", type: "title" },
				{ resourceId: "stays-checkin-prop", name: "Check-in", type: "date" },
				{ resourceId: "stays-checkout-prop", name: "Check-out", type: "date" },
				{ resourceId: "stays-address-prop", name: "Address", type: "text" },
				{ resourceId: "stays-booking-prop", name: "Booking URL", type: "url" },
				{
					resourceId: "stays-confirmation-prop",
					name: "Confirmation",
					type: "text",
				},
			],
		},
	],
});

notion.database({
	resourceId: "transit-db",
	parent: hubParent,
	name: "Transit",
	icon: { type: "notion_icon", description: "train", color: "blue" },
	description: "Trains, flights, and other transport. Link to a Day.",
	dataSources: [
		{
			resourceId: "transit-ds",
			name: "Transit",
			properties: [
				{ resourceId: "transit-name-prop", name: "Name", type: "title" },
				{
					resourceId: "transit-mode-prop",
					name: "Mode",
					type: "select",
					options: [
						{ name: "Shinkansen", color: "blue" },
						{ name: "Metro", color: "green" },
						{ name: "Bus", color: "orange" },
						{ name: "Flight", color: "purple" },
						{ name: "Walk", color: "gray" },
					],
				},
				{ resourceId: "transit-from-prop", name: "From", type: "text" },
				{ resourceId: "transit-to-prop", name: "To", type: "text" },
				{ resourceId: "transit-date-prop", name: "Date", type: "date" },
				{
					resourceId: "transit-booking-prop",
					name: "Booking URL",
					type: "url",
				},
				{
					resourceId: "transit-day-prop",
					name: "Day",
					type: "relation",
					targetDataSourceResourceId: "days-ds",
					limit: 1,
				},
				{ resourceId: "transit-start-prop", name: "Start", type: "date" },
				{ resourceId: "transit-order-prop", name: "Order", type: "number" },
				{
					resourceId: "transit-visited-prop",
					name: "Visited",
					type: "checkbox",
				},
				{
					resourceId: "transit-skipped-prop",
					name: "Skipped",
					type: "checkbox",
				},
			],
		},
	],
});

notion.database({
	resourceId: "spend-db",
	parent: hubParent,
	name: "Spend",
	icon: { type: "notion_icon", description: "yen", color: "yellow" },
	description: "Estimates and actuals in RM, with optional Yen amounts.",
	dataSources: [
		{
			resourceId: "spend-ds",
			name: "Spend",
			properties: [
				{ resourceId: "spend-name-prop", name: "Name", type: "title" },
				{ resourceId: "spend-amount-prop", name: "Amount", type: "number" },
				{
					resourceId: "spend-currency-prop",
					name: "Currency",
					type: "select",
					options: [
						{ name: "RM", color: "green" },
						{ name: "Yen", color: "red" },
					],
				},
				{
					resourceId: "spend-kind-prop",
					name: "Kind",
					type: "select",
					options: [
						{ name: "Estimate", color: "blue" },
						{ name: "Actual", color: "green" },
					],
				},
				{
					resourceId: "spend-category-prop",
					name: "Category",
					type: "select",
					options: [
						{ name: "Food", color: "orange" },
						{ name: "Transit", color: "blue" },
						{ name: "Stay", color: "green" },
						{ name: "Ticket", color: "purple" },
						{ name: "Shop", color: "yellow" },
						{ name: "Other", color: "gray" },
					],
				},
				{
					resourceId: "spend-day-prop",
					name: "Day",
					type: "relation",
					targetDataSourceResourceId: "days-ds",
					limit: 1,
				},
				{ resourceId: "spend-start-prop", name: "Start", type: "date" },
				{
					resourceId: "spend-paid-by-prop",
					name: "Paid by",
					type: "select",
					options: [],
				},
				{ resourceId: "spend-notes-prop", name: "Notes", type: "text" },
			],
		},
	],
});

notion.database({
	resourceId: "editors-db",
	parent: hubParent,
	name: "Editors",
	icon: { type: "notion_icon", description: "key", color: "gray" },
	description:
		"People who can unlock editing in the trip app. PIN is a trip code, not a bank password.",
	dataSources: [
		{
			resourceId: "editors-ds",
			name: "Editors",
			properties: [
				{ resourceId: "editors-name-prop", name: "Name", type: "title" },
				{ resourceId: "editors-pin-prop", name: "PIN", type: "text" },
			],
		},
	],
});

notion.database({
	resourceId: "prep-db",
	parent: hubParent,
	name: "Prep",
	icon: { type: "notion_icon", description: "checkmark", color: "orange" },
	description: "Packing and booking tasks. Same list as the app Prep tab.",
	dataSources: [
		{
			resourceId: "prep-ds",
			name: "Prep",
			properties: [
				{ resourceId: "prep-name-prop", name: "Name", type: "title" },
				{ resourceId: "prep-done-prop", name: "Done", type: "checkbox" },
				{ resourceId: "prep-order-prop", name: "Order", type: "number" },
			],
		},
	],
});
