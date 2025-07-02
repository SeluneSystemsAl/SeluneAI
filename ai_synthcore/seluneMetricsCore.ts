// selkaMetricsCache.ts

import Redis from 'ioredis'
import { SelkaPatternEngine } from './selkaPatternEngine'

/**
 * Wrapper around SelkaPatternEngine that caches aura metrics in Redis
 */
export class MetricsCache {
  private redis: Redis.Redis
  private engine: SelkaPatternEngine
  private ttlSeconds: number

  /**
   * @param redisUrl URL of the Redis server
   * @param apiUrl   Base URL of the Selka API
   * @param apiKey   API key for Selka
   * @param ttl      Time-to-live for cached entries, in seconds
   */
  constructor(
    redisUrl: string,
    apiUrl: string,
    apiKey: string,
    ttl: number = 300
  ) {
    this.redis = new Redis(redisUrl)
    this.engine = new SelkaPatternEngine(apiUrl, apiKey)
    this.ttlSeconds = ttl
  }

  /**
   * Generates a unique cache key for Selka metrics
   */
  private cacheKey(contractAddress: string, timeframeHours: number): string {
    return `selka:metrics:${contractAddress}:${timeframeHours}`
  }

  /**
   * Retrieves Selka metrics from cache or fetches if unavailable
   */
  async getMetrics(
    contractAddress: string,
    timeframeHours: number
  ): Promise<import('./selkaPatternEngine').AuraMetric[]> {
    const key = this.cacheKey(contractAddress, timeframeHours)
    const cached = await this.redis.get(key)

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as import('./selkaPatternEngine').AuraMetric[]
        return parsed
      } catch {
        // fall through to fetch fresh if corrupted
      }
    }

    const fresh = await this.engine.fetchMetrics(contractAddress, timeframeHours)
    await this.redis.set(key, JSON.stringify(fresh), 'EX', this.ttlSeconds)
    return fresh
  }

  /**
   * Clears specific Selka cache entry
   */
  async clearCache(contractAddress: string, timeframeHours: number): Promise<void> {
    const key = this.cacheKey(contractAddress, timeframeHours)
    await this.redis.del(key)
  }

  /**
   * Graceful Redis shutdown
   */
  async shutdown(): Promise<void> {
    await this.redis.quit()
  }
}
