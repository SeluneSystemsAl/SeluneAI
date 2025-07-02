
export interface RiskScore { address: string; score: number; level: "low" | "medium" | "high" }
export class RiskScoring {
  constructor(private conn: any) {}
  async compute(address: string): Promise<RiskScore> {
    const info = await this.conn.getAccountInfo(address)
    const size = info?.data.length ?? 0
    const score = Math.min(100, Math.round((size / 1024) * 10))
    const level = score > 70 ? "high" : score > 40 ? "medium" : "low"
    return { address, score, level }
  }
}
