/**
 * Rolling-window speed tracker. Samples (bytes transferred, timestamp) are
 * kept for a bounded time window so displayed speed doesn't jitter on every
 * chunk ACK, and stays truthful to recent throughput.
 */
export class RollingSpeedTracker {
  private samples: { bytes: number; ts: number }[] = [];
  private totalBytes = 0;
  private peakBps = 0;
  private readonly startedAt = performance.now();

  constructor(private readonly windowMs = 3000) {}

  record(byteLength: number): void {
    const now = performance.now();
    this.totalBytes += byteLength;
    this.samples.push({ bytes: byteLength, ts: now });
    const cutoff = now - this.windowMs;
    while (this.samples.length > 0 && this.samples[0]!.ts < cutoff) {
      this.samples.shift();
    }
    const current = this.currentBps(now);
    if (current > this.peakBps) this.peakBps = current;
  }

  private currentBps(now: number): number {
    if (this.samples.length === 0) return 0;
    const windowStart = Math.max(this.samples[0]!.ts, now - this.windowMs);
    const elapsedSeconds = (now - windowStart) / 1000;
    if (elapsedSeconds <= 0) return 0;
    const bytesInWindow = this.samples.reduce((sum, s) => sum + s.bytes, 0);
    return bytesInWindow / elapsedSeconds;
  }

  get currentSpeedBps(): number {
    return this.currentBps(performance.now());
  }

  get averageSpeedBps(): number {
    const elapsedSeconds = (performance.now() - this.startedAt) / 1000;
    return elapsedSeconds > 0 ? this.totalBytes / elapsedSeconds : 0;
  }

  get peakSpeedBps(): number {
    return this.peakBps;
  }

  get transferred(): number {
    return this.totalBytes;
  }

  etaSeconds(remainingBytes: number): number {
    const speed = this.currentSpeedBps || this.averageSpeedBps;
    if (speed <= 0) return Infinity;
    return remainingBytes / speed;
  }
}
