interface BenchmarkEntry {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class RequestBenchmark {
  private entries: Map<string, BenchmarkEntry> = new Map();
  private requestId: string;
  private startTime: number;

  constructor(requestId: string = Math.random().toString(36).slice(2)) {
    this.requestId = requestId;
    this.startTime = performance.now();
    console.log(`[BENCH] Request ${this.requestId} started`);
  }

  start(operation: string, metadata?: Record<string, any>): void {
    const entry: BenchmarkEntry = {
      operation,
      startTime: performance.now(),
      metadata,
    };
    this.entries.set(operation, entry);
    console.log(`[BENCH] ${this.requestId} | ${operation} started`);
  }

  end(operation: string, metadata?: Record<string, any>): number {
    const entry = this.entries.get(operation);
    if (!entry) {
      console.warn(`[BENCH] ${this.requestId} | ${operation} not found`);
      return 0;
    }

    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    console.log(`[BENCH] ${this.requestId} | ${operation} completed in ${entry.duration.toFixed(2)}ms`, 
                entry.metadata ? entry.metadata : '');
    
    return entry.duration;
  }

  async wrap<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(operation, metadata);
    try {
      const result = await fn();
      this.end(operation);
      return result;
    } catch (error) {
      this.end(operation, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  summary(): void {
    const totalTime = performance.now() - this.startTime;
    console.log(`[BENCH] Request ${this.requestId} SUMMARY:`);
    console.log(`[BENCH] Total request time: ${totalTime.toFixed(2)}ms`);
    
    const completed = Array.from(this.entries.values()).filter(e => e.duration !== undefined);
    completed.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    for (const entry of completed) {
      const pct = ((entry.duration! / totalTime) * 100).toFixed(1);
      console.log(`[BENCH] ${entry.operation}: ${entry.duration!.toFixed(2)}ms (${pct}%)`);
    }
  }
}

export function createBenchmark(requestId?: string): RequestBenchmark {
  return new RequestBenchmark(requestId);
}