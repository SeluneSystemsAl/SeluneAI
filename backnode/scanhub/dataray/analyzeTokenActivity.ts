import { Connection, PublicKey, ConfirmedSignatureInfo } from "@solana/web3.js"

export interface ActivityPoint {
  timestamp: number
  transfers: number
}

export class TokenActivityAnalyzer {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async analyze(mint: string): Promise<ActivityPoint[]> {
    const key = new PublicKey(mint)
    const now = Date.now() / 1000
    const dayAgo = now - 24 * 3600
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(key, { limit: 1000 })
    const buckets: Record<number, number> = {}
    for (const s of sigs) {
      if (!s.blockTime || s.blockTime < dayAgo) continue
      const hour = Math.floor((s.blockTime - dayAgo) / 3600)
      buckets[hour] = (buckets[hour] || 0) + 1
    }
    return Array.from({ length: 24 }, (_, h) => ({
      timestamp: (dayAgo + h * 3600) * 1000,
      transfers: buckets[h] || 0
    }))
  }
}
