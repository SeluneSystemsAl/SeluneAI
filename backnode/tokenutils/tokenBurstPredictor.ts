export interface BurstPrediction { mint: string; start: number; end: number; confidence: number }
export class TokenBurstPredictor {
  constructor(private conn: any) {}
  async predict(mint: string): Promise<BurstPrediction> {
    const accounts = await this.conn.getParsedTokenAccountsByOwner(mint)
    const amounts = accounts.map((a: any) => Number(a.parsed.info.tokenAmount.uiAmount))
    const avg = amounts.reduce((s, x) => s + x, 0) / (amounts.length || 1)
    const peak = Math.max(...amounts, 1)
    const confidence = Math.min(1, avg / peak)
    const now = Date.now(), start = now + 3600_000, end = start + 3600_000
    return { mint, start: Math.floor(start / 1000), end: Math.floor(end / 1000), confidence }
  }
}
