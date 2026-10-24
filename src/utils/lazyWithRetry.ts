import { lazy, ComponentType } from 'react';

const RELOAD_STORAGE_KEY = 'calebdeck_chunk_reload_guard_v1';
const RELOAD_COOLDOWN_MS = 30_000;

interface ReloadGuardRecord {
  path: string;
  moduleKey: string;
  timestamp: number;
  count: number;
}

export function isDynamicImportError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? `${error.name}: ${error.message}`
      : String((error as any)?.message || error);

  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('error loading dynamically imported module') ||
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('loading css chunk') ||
    normalized.includes('unable to preload css') ||
    normalized.includes('dynamically imported module')
  );
}

function readReloadGuard(): ReloadGuardRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(RELOAD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReloadGuardRecord;
  } catch {
    return null;
  }
}

function writeReloadGuard(record: ReloadGuardRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
}

export function clearChunkReloadGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(RELOAD_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

/**
 * Performs at most one automatic page reload per route within RELOAD_COOLDOWN_MS
 * to recover from stale deployment chunks without ever entering an infinite loop.
 */
export function attemptGuardedReload(moduleKey = 'route'): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const now = Date.now();
  const currentPath = window.location.pathname || '/';
  const existing = readReloadGuard();

  if (
    existing &&
    existing.path === currentPath &&
    now - existing.timestamp < RELOAD_COOLDOWN_MS &&
    existing.count >= 1
  ) {
    return false;
  }

  writeReloadGuard({
    path: currentPath,
    moduleKey,
    timestamp: now,
    count: (existing && existing.path === currentPath ? existing.count : 0) + 1,
  });

  window.location.reload();
  return true;
}

export async function importWithRetry<T>(
  importer: () => Promise<T>,
  moduleKey = 'module'
): Promise<T> {
  try {
    const mod = await importer();
    clearChunkReloadGuard();
    return mod;
  } catch (firstError) {
    // Brief retry for transient mobile/campus network blips
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 450));
        const mod = await importer();
        clearChunkReloadGuard();
        return mod;
      } catch (retryError) {
        if (isDynamicImportError(retryError)) {
          const reloaded = attemptGuardedReload(moduleKey);
          if (reloaded) {
            // Return a pending promise briefly while the browser navigates/reloads
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
        throw retryError;
      }
    }

    throw firstError;
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  moduleKey = 'component'
) {
  return lazy(() => importWithRetry(importer, moduleKey));
}

export function lazyRoute<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  moduleKey = 'route'
) {
  return async () => {
    const mod = await importWithRetry(importer, moduleKey);
    return { Component: mod.default };
  };
}

let preloadHandlerInstalled = false;

export function installVitePreloadErrorHandler(): void {
  if (typeof window === 'undefined' || preloadHandlerInstalled) return;
  preloadHandlerInstalled = true;

  window.addEventListener('vite:preloadError', (event: Event) => {
    const payload = (event as CustomEvent)?.detail || event;
    console.warn('[CalebDeck] Caught vite:preloadError, attempting guarded recovery:', payload);
    const reloaded = attemptGuardedReload('vite:preloadError');
    if (reloaded) {
      event.preventDefault();
    }
  });
}
