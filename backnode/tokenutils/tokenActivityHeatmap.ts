export type HeatmapPoint = { weekday: number; hour: number; count: number }
export class TokenActivityHeatmap {
  constructor(private conn: any) {}
  async generate(mint: string): Promise<HeatmapPoint[]> {
    const now = Date.now() / 1000, weekAgo = now - 7 * 24 * 3600
    const sigs = await this.conn.getSignaturesForAddress(mint)
    const buckets: Record<string, number> = {}
    for (const s of sigs) {
      if (!s.blockTime || s.blockTime < weekAgo) continue
      const dt = new Date(s.blockTime * 1000)
      const key = `${dt.getDay()}-${dt.getHours()}`
      buckets[key] = (buckets[key] || 0) + 1
    }
    return Array.from({ length: 168 }, (_, i) => {
      const day = Math.floor(i / 24), hour = i % 24
      const key = `${day}-${hour}`
      return { weekday: day, hour, count: buckets[key] || 0 }
    })
  }
}
