/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  SerwistPlugin,
} from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";
import {
  normalizeRscCacheKey,
  rscCacheableHeaders,
  rscCacheLookupKeys,
  shouldWarmRsc,
} from "@/lib/sw-rsc-key";
import { SERVED_FROM_CACHE_MESSAGE } from "@/lib/offline-status";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Tell the page when NetworkFirst had to answer from cache (SDD 015). */
const notifyServedFromCache: SerwistPlugin = {
  cachedResponseWillBeUsed: async ({ cachedResponse, event, request }) => {
    if (!cachedResponse) return cachedResponse;
    const clientId =
      event instanceof FetchEvent
        ? event.clientId || event.resultingClientId
        : "";
    if (clientId) {
      const client = await self.clients.get(clientId);
      client?.postMessage({
        type: SERVED_FROM_CACHE_MESSAGE,
        url: request.url,
        cachedAt: cachedResponse.headers.get("date"),
      });
    }
    return cachedResponse;
  },
};

const RSC_CACHE_MAX_ENTRIES = 96;

function rscCacheName(request: Request): string {
  return request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Next-Router-Segment-Prefetch")
    ? "pages-rsc-prefetch"
    : "pages-rsc";
}

async function putRscCache(cacheName: string, key: string, response: Response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, response);
    const keys = await cache.keys();
    if (keys.length <= RSC_CACHE_MAX_ENTRIES) return;
    const extras = keys.length - RSC_CACHE_MAX_ENTRIES;
    for (let i = 0; i < extras; i += 1) {
      const stale = keys[i];
      if (stale) await cache.delete(stale);
    }
  } catch {
    // Quota or a still-uncacheable response: the page already has the body.
  }
}

async function matchRscCache(
  cacheName: string,
  keys: string[],
): Promise<Response | undefined> {
  const cache = await caches.open(cacheName);
  for (const key of keys) {
    const hit = await cache.match(key, { ignoreVary: true });
    if (hit) return hit;
  }
  return undefined;
}

async function notifyRscServedFromCache(
  event: Event | undefined,
  request: Request,
  cached: Response,
) {
  const clientId =
    event instanceof FetchEvent
      ? event.clientId || event.resultingClientId
      : "";
  if (!clientId) return;
  const client = await self.clients.get(clientId);
  client?.postMessage({
    type: SERVED_FROM_CACHE_MESSAGE,
    url: request.url,
    cachedAt: cached.headers.get("date"),
  });
}

/**
 * Handle RSC (flight) requests without Serwist's NetworkFirst.
 *
 * The App Router needs the *complete* flight stream. NetworkFirst teed the
 * response into `cache.put(response.clone())` while the page read the other
 * branch, and Next's force-dynamic payloads send `Cache-Control: no-store`,
 * which Cache API rejects — cancelling the tee can abort the router's stream
 * mid-flight. The navigation then never commits (URL stays put, later
 * requests still carry the pending `Next-Url`). A 4s network timeout could
 * also answer with a cached prefetch/partial body.
 *
 * Online: wait for the full body, return a fresh Response from that buffer,
 * and store a cacheable copy. Offline (fetch throws): serve the normalised
 * key or a shallower full payload.
 */
async function handleRscRequest({
  request,
  event,
}: {
  request: Request;
  event?: Event;
}): Promise<Response> {
  const cacheName = rscCacheName(request);
  const keys = rscCacheLookupKeys(request.url, request.headers);
  const key = keys[0]!;

  try {
    const response = await fetch(request);
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.includes("text/x-component")) {
      return response;
    }
    const body = await response.arrayBuffer();
    const forPage = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    const work = putRscCache(
      cacheName,
      key,
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: rscCacheableHeaders(response.headers),
      }),
    );
    if (event instanceof FetchEvent) event.waitUntil(work);
    else await work;
    return forPage;
  } catch {
    const hit = await matchRscCache(cacheName, keys);
    if (hit) {
      await notifyRscServedFromCache(event, request, hit);
      return hit;
    }
    throw new Error(`rsc-offline-miss:${new URL(request.url).pathname}`);
  }
}

/**
 * A page opened by a full load only caches HTML, so an offline soft tap to it
 * would miss the RSC cache and fall back to a full reload. After an online
 * document load, fetch its full (root) RSC payload once in a while too.
 */
async function warmRscPayload(pageUrl: string) {
  const url = new URL(pageUrl);
  if (url.pathname.startsWith("/api/") || url.pathname === "/~offline") return;
  const headers = new Headers({ RSC: "1" });
  const key = normalizeRscCacheKey(url.toString(), headers);
  const cache = await caches.open("pages-rsc");
  const cached = await cache.match(key, { ignoreVary: true });
  if (!shouldWarmRsc(cached?.headers.get("date"), Date.now())) return;
  try {
    const response = await fetch(url.toString(), { headers, credentials: "same-origin" });
    const type = response.headers.get("content-type") ?? "";
    if (response.ok && type.includes("text/x-component")) {
      const body = await response.arrayBuffer();
      await cache.put(
        key,
        new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: rscCacheableHeaders(response.headers),
        }),
      );
    }
  } catch {
    // Offline or server error: keep whatever is cached.
  }
}

const warmRscAfterPageLoad: SerwistPlugin = {
  cacheDidUpdate: async ({ request, event }) => {
    const work = warmRscPayload(request.url);
    if (event instanceof FetchEvent) event.waitUntil(work);
    else await work;
  },
};

const pagesNetworkFirst = new NetworkFirst({
  cacheName: "pages",
  networkTimeoutSeconds: 4,
  plugins: [notifyServedFromCache, warmRscAfterPageLoad],
});

/** Shells that should survive subway rides after one online visit. */
const KEY_OFFLINE_SHELLS = [
  "/",
  "/schedule",
  "/budget",
  "/map",
  "/phrases",
  "/prep",
  "/settings",
  "/~offline",
];

async function warmKeyShells() {
  await Promise.all(
    KEY_OFFLINE_SHELLS.map(async (path) => {
      try {
        const response = await fetch(path, {
          credentials: "same-origin",
          headers: { "X-Japan-Trip-Warm": "1" },
        });
        if (!response.ok) return;
        const cache = await caches.open("pages");
        await cache.put(path, response.clone());
        await warmRscPayload(new URL(path, self.location.origin).toString());
      } catch {
        // ignore
      }
    }),
  );
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.method !== "GET",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        (pathname === "/api/version" ||
          pathname.startsWith("/api/push") ||
          pathname.startsWith("/api/cron") ||
          pathname.startsWith("/serwist/")),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: pagesNetworkFirst,
    },
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        request.headers.get("RSC") === "1" &&
        !pathname.startsWith("/api/"),
      handler: {
        handle: (options) => handleRscRequest(options),
      },
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await warmKeyShells();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  let payload: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }
  const title = payload.title?.trim() || "Japan Trip";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: "/icon/192",
    badge: "/icon/192",
    tag: payload.tag || "japan-trip",
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw =
    event.notification.data &&
    typeof event.notification.data === "object" &&
    "url" in event.notification.data
      ? String((event.notification.data as { url?: unknown }).url ?? "/")
      : "/";
  const targetUrl = raw.startsWith("/") ? raw : "/";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const origin = self.location.origin;
      const sameOrigin: WindowClient[] = [];
      const others: WindowClient[] = [];
      for (const client of clients) {
        if (!("focus" in client)) continue;
        const windowClient = client as WindowClient;
        try {
          if (new URL(windowClient.url).origin === origin) {
            sameOrigin.push(windowClient);
          } else {
            others.push(windowClient);
          }
        } catch {
          others.push(windowClient);
        }
      }

      for (const client of [...sameOrigin, ...others]) {
        await client.focus();
        if ("navigate" in client) {
          try {
            await client.navigate(targetUrl);
          } catch {
            // iOS WebKit may reject WindowClient.navigate.
            await self.clients.openWindow(targetUrl);
          }
        }
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

serwist.addEventListeners();
