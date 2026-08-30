/**
 * perfTracker — Lightweight Firestore query instrumentation
 * 
 * Wire this into any service file to log query durations and detect
 * N+1 patterns (repeated single-doc reads that should be batch reads
 * or denormalized data).
 * 
 * Usage:
 *   import { perfTracker } from '../utils/perfTracker';
 *   const t0 = performance.now();
 *   const snap = await getDocs(q);
 *   perfTracker.logQuery('orders', performance.now() - t0);
 *   // ... at any point:
 *   perfTracker.printReport();
 */

interface QueryStat {
  count: number;
  totalMs: number;
  maxMs: number;
  callers: string[];
}

class PerfTracker {
  private queries = new Map<string, QueryStat>();
  private sessionStart = performance.now();
  private enabled = import.meta.env.DEV; // Only active in dev

  /** Log a Firestore read operation */
  logQuery(collectionPath: string, durationMs: number, caller?: string) {
    if (!this.enabled) return;

    const key = collectionPath;
    const stat = this.queries.get(key) || { count: 0, totalMs: 0, maxMs: 0, callers: [] };
    stat.count++;
    stat.totalMs += durationMs;
    stat.maxMs = Math.max(stat.maxMs, durationMs);
    if (caller && !stat.callers.includes(caller)) stat.callers.push(caller);
    this.queries.set(key, stat);
  }

  /** Print a diagnostic report to the console */
  printReport() {
    if (!this.enabled || this.queries.size === 0) return;

    const elapsed = ((performance.now() - this.sessionStart) / 1000).toFixed(1);
    console.group(`%c⚡ PerfTracker Report (${elapsed}s session)`, 'font-weight:bold; color:#f59e0b');

    const sorted = [...this.queries.entries()].sort((a, b) => b[1].count - a[1].count);
    const nPlusOne: string[] = [];

    for (const [path, stat] of sorted) {
      const avg = (stat.totalMs / stat.count).toFixed(1);
      const badge = stat.count > 5 ? '🔴' : stat.count > 2 ? '🟡' : '🟢';
      console.log(
        `${badge} ${path}: ${stat.count} calls, total ${stat.totalMs.toFixed(0)}ms (avg ${avg}ms, max ${stat.maxMs.toFixed(0)}ms)` +
        (stat.callers.length ? ` — from: ${stat.callers.join(', ')}` : '')
      );
      if (stat.count > 5) nPlusOne.push(path);
    }

    if (nPlusOne.length > 0) {
      console.warn(
        `%c⚠️ POTENTIAL N+1 DETECTED:`,
        'font-weight:bold; color:#ef4444',
        nPlusOne.map(p => `\n  → ${p} (${this.queries.get(p)!.count} calls)`).join('')
      );
    }

    console.groupEnd();
  }

  /** Reset all counters */
  reset() {
    this.queries.clear();
    this.sessionStart = performance.now();
  }
}

export const perfTracker = new PerfTracker();
