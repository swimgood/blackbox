const DEFAULT_THRESHOLD = 2.0;
const MIN_SAMPLES = 3;

export interface GasAnomaly {
  signature: string;
  gasUsed: bigint;
  baseline: bigint;
  ratio: number;
  runIndex: number;
}

export class GasTracker {
  private history = new Map<string, bigint[]>();
  private threshold: number;

  constructor(threshold = DEFAULT_THRESHOLD) {
    this.threshold = threshold;
  }

  record(signature: string, gasUsed: bigint, runIndex: number): GasAnomaly | null {
    const history = this.history.get(signature) ?? [];
    let anomaly: GasAnomaly | null = null;

    if (history.length >= MIN_SAMPLES) {
      const baseline = this.median(history);
      if (baseline > 0n) {
        const ratio = Number(gasUsed) / Number(baseline);
        if (ratio > this.threshold) {
          anomaly = { signature, gasUsed, baseline, ratio, runIndex };
        }
      }
    }

    history.push(gasUsed);
    this.history.set(signature, history);
    return anomaly;
  }

  private median(values: bigint[]): bigint {
    const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2n
      : sorted[mid];
  }

  summary(): Record<string, { count: number; median: string; max: string }> {
    const out: Record<string, { count: number; median: string; max: string }> = {};
    for (const [sig, values] of this.history) {
      out[sig] = {
        count: values.length,
        median: this.median(values).toString(),
        max: values.reduce((a, b) => (a > b ? a : b), 0n).toString(),
      };
    }
    return out;
  }
}
