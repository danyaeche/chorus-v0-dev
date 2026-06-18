/**
 * In-memory demo store. Holds the seed in a module-level singleton so created
 * data persists across navigations within a server process. This is the demo
 * backend; when Supabase is configured the repository layer targets Postgres
 * instead (see lib/db/index.ts).
 */
import { buildSeed, type SeedData } from './seed';

declare global {
  // eslint-disable-next-line no-var
  var __chorusStore: SeedData | undefined;
}

export function store(): SeedData {
  if (!globalThis.__chorusStore) {
    globalThis.__chorusStore = buildSeed();
  }
  return globalThis.__chorusStore;
}

/** Reset the store to a fresh seed (test/dev helper). */
export function resetStore(): void {
  globalThis.__chorusStore = buildSeed();
}
