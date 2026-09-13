/**
 * Best-effort in-memory sliding-window rate limiter for Vercel serverless
 * functions. Instances are ephemeral, so limits are per-instance — this blunts
 * bursts and abusive loops but is not a substitute for a shared WAF/edge limiter.
 */
const buckets = new Map<string, number[]>();

// Periodically drop stale buckets so the map cannot grow unbounded.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return;
    lastSweep = now;
    for (const [key, hits] of buckets) {
        const recent = hits.filter(t => now - t < 60 * 60 * 1000);
        if (recent.length === 0) buckets.delete(key);
        else buckets.set(key, recent);
    }
}

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    sweep(now);
    const hits = (buckets.get(key) || []).filter(t => now - t < windowMs);
    if (hits.length >= limit) {
        buckets.set(key, hits);
        return true;
    }
    hits.push(now);
    buckets.set(key, hits);
    return false;
}

export function clientIp(req: any): string {
    return String(
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers?.['x-real-ip'] ||
        'unknown'
    );
}
