/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  SerwistPlugin,
} from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";
import {
  normalizeRscCacheKey,
  shallowerRscKeys,
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

/**
 * RSC payloads: Next's `?_rsc=` hash changes with the screen you navigate
 * from, so the default per-URL cache misses on offline soft navigation.
 * Normalise the key (see `sw-rsc-key.ts`) so any cached payload for the
 * target page is reused. Online still always prefers the network.
 */
const rscCacheKey: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) =>
    normalizeRscCacheKey(request.url, request.headers),
  // Offline miss: reuse a payload rendered from a shallower segment.
  cachedResponseWillBeUsed: async ({ cacheName, cachedResponse, request }) => {
    if (cachedResponse) return cachedResponse;
    const cache = await caches.open(cacheName);
    for (const key of shallowerRscKeys(request.url)) {
      const hit = await cache.match(key, { ignoreVary: true });
      if (hit) return hit;
    }
    return cachedResponse;
  },
};

function rscNetworkFirst(cacheName: string) {
  return new NetworkFirst({
    cacheName,
    networkTimeoutSeconds: 4,
    matchOptions: { ignoreVary: true },
    plugins: [
      rscCacheKey,
      notifyServedFromCache,
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 86400 }),
    ],
  });
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
      await cache.put(key, response);
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

const rscPrefetchNetworkFirst = rscNetworkFirst("pages-rsc-prefetch");
const rscNavNetworkFirst = rscNetworkFirst("pages-rsc");

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
        handle: (options) =>
          options.request.headers.get("Next-Router-Prefetch") === "1"
            ? rscPrefetchNetworkFirst.handle(options)
            : rscNavNetworkFirst.handle(options),
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
