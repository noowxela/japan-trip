/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const pagesNetworkFirst = new NetworkFirst({
  cacheName: "pages",
  networkTimeoutSeconds: 4,
});

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
