// Singleton in-memory image store shared between /api/share routes.
// Entries expire after 30 minutes. Suitable for single-instance deployments.

interface ShareEntry {
  data: Buffer;
  mime: string;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __shareStore: Map<string, ShareEntry> | undefined;
}

export const shareStore: Map<string, ShareEntry> =
  globalThis.__shareStore ?? (globalThis.__shareStore = new Map());

export function purgeExpired() {
  const now = Date.now();
  for (const [id, entry] of shareStore) {
    if (entry.expiresAt < now) shareStore.delete(id);
  }
}
