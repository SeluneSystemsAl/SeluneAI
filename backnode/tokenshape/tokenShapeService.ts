import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"

export interface ShapeMetrics {
  meanBalance: number
  medianBalance: number
  variance: number
  skewness: number
}

export class TokenShapeService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed")
  }

  private computeMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length
    if (n === 0) return 0
    return n % 2
      ? sorted[(n - 1) / 2]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  }

  private computeVariance(values: number[], mean: number): number {
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length || 1)
  }

  private computeSkewness(values: number[], mean: number, variance: number): number {
    const std = Math.sqrt(variance)
    return (
      values.reduce((sum, v) => sum + ((v - mean) / std) ** 3, 0) /
      (values.length || 1)
    )
  }

  async analyzeDistribution(mintAddress: string): Promise<ShapeMetrics> {
    const key = new PublicKey(mintAddress)
    const resp = await this.connection.getParsedTokenAccountsByOwner(key, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    })

    const balances = resp.value.map(acc => {
      const info = (acc.account.data as ParsedAccountData).parsed.info.tokenAmount
      return Number(info.uiAmount)
    })

    const n = balances.length || 1
    const mean = balances.reduce((a, b) => a + b, 0) / n
    const median = this.computeMedian(balances)
    const variance = this.computeVariance(balances, mean)
    const skewness = this.computeSkewness(balances, mean, variance)

    return { meanBalance: mean, medianBalance: median, variance, skewness }
  }
}
