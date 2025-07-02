import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"

export interface DeepMetrics {
  holderCount: number
  totalSupply: number
  avgBalance: number
  activeHolders: number
}

export class TokenDeepAnalyzer {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async analyze(mint: string): Promise<DeepMetrics> {
    const key = new PublicKey(mint)
    const resp = await this.conn.getParsedTokenAccountsByOwner(key, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    })
    const balances = resp.value.map(acc => {
      const info = (acc.account.data as ParsedAccountData).parsed.info.tokenAmount
      return Number(info.uiAmount)
    })
    const totalSupply = balances.reduce((a, b) => a + b, 0)
    const holderCount = balances.length
    const avgBalance = holderCount ? totalSupply / holderCount : 0
    const activeHolders = balances.filter(b => b > 0).length
    return { holderCount, totalSupply, avgBalance, activeHolders }
  }
}
