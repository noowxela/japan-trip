# Japan Trip — Notion as Code

Empty **Days**, **Places**, **Stays**, and **Transit** databases under a **Japan Trip** hub page.

## Apply (primary)

```sh
npm install
ntn login   # once, if you are not using NOTION_API_TOKEN
ntn notion-as-code apply .
```

Notion-as-Code is alpha. If apply is rejected, use the public API fallback:

```sh
npm run setup:api
```

That script needs `NOTION_API_TOKEN` (or `NOTION_TOKEN`) and a parent page the integration can write to (`NOTION_PARENT_PAGE_ID`). It writes data-source IDs to `../.env.local`.

Do not change `resourceId` values in `src/main.ts` after a successful apply.
