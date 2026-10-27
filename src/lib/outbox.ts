import {
  makeOutboxEntry,
  sortOutboxByCreatedAt,
  type OutboxEntry,
  type OutboxKind,
  type OutboxPayload,
} from "@/lib/outbox-core";

const DB_NAME = "japan-trip";
const STORE = "outbox";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("indexedDB tx aborted"));
  });
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const rows = await new Promise<OutboxEntry[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OutboxEntry[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("outbox getAll failed"));
    });
    await txDone(tx);
    // Legacy rows may omit firstAttemptAt.
    return sortOutboxByCreatedAt(
      rows.map((row) => ({
        ...row,
        firstAttemptAt: row.firstAttemptAt ?? null,
        attempts: row.attempts ?? 0,
      })),
    );
  } finally {
    db.close();
  }
}

export async function putOutboxEntry(entry: OutboxEntry): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteOutboxEntry(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function enqueueOutbox(
  kind: OutboxKind,
  payload: OutboxPayload,
): Promise<OutboxEntry> {
  const entry = makeOutboxEntry(kind, payload);
  await putOutboxEntry(entry);
  return entry;
}
