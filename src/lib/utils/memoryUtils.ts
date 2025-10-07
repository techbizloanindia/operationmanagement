export class MemoryManager {
  private static readonly MEMORY_THRESHOLD = 300 * 1024 * 1024; // 300MB threshold
  
  /**
   * Check current memory usage and log warning if approaching limits
   */
  static checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    
    if (usage.heapUsed > this.MEMORY_THRESHOLD) {
      console.warn(`⚠️ High memory usage detected: Heap=${heapUsedMB}MB, RSS=${rssMB}MB`);
    }
    
    // Log memory stats in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`📊 Memory: Heap=${heapUsedMB}MB, RSS=${rssMB}MB, External=${Math.round(usage.external / 1024 / 1024)}MB`);
    }
  }
  
  /**
   * Force garbage collection if available (requires --expose-gc flag)
   */
  static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
  }
  
  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    heapUsedMB: number;
    rssMB: number;
  } {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024),
    };
  }
  
  /**
   * Check if memory usage is approaching dangerous levels
   */
  static isMemoryHigh(): boolean {
    const usage = process.memoryUsage();
    return usage.heapUsed > this.MEMORY_THRESHOLD;
  }
  
  /**
   * Create a delay to allow memory cleanup between operations
   */
  static async memoryBreak(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Decorator function to monitor memory usage of API routes
 */
export function withMemoryMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  routeName: string
): T {
  return ((...args: any[]) => {
    const startStats = MemoryManager.getMemoryStats();
    console.log(`🚀 Starting ${routeName} - Memory: ${startStats.heapUsedMB}MB`);
    
    const result = fn(...args);
    
    // If result is a Promise, monitor async completion
    if (result instanceof Promise) {
      return result.finally(() => {
        const endStats = MemoryManager.getMemoryStats();
        const memoryDiff = endStats.heapUsedMB - startStats.heapUsedMB;
        console.log(`✅ Completed ${routeName} - Memory: ${endStats.heapUsedMB}MB (${memoryDiff > 0 ? '+' : ''}${memoryDiff}MB)`);
        
        if (MemoryManager.isMemoryHigh()) {
          MemoryManager.forceGarbageCollection();
        }
      });
    } else {
      const endStats = MemoryManager.getMemoryStats();
      const memoryDiff = endStats.heapUsedMB - startStats.heapUsedMB;
      console.log(`✅ Completed ${routeName} - Memory: ${endStats.heapUsedMB}MB (${memoryDiff > 0 ? '+' : ''}${memoryDiff}MB)`);
      
      if (MemoryManager.isMemoryHigh()) {
        MemoryManager.forceGarbageCollection();
      }
      
      return result;
    }
  }) as T;
}