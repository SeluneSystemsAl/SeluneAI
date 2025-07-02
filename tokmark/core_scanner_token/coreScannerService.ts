import { Connection, PublicKey, ParsedAccountData, ConfirmedSignatureInfo } from "@solana/web3.js"

export interface TransferRecord {
  signature: string
  amount: number
  timestamp: number
}

export interface TokenRiskMetrics {
  totalSupply: number
  holderCount: number
  recentTransfers: TransferRecord[]
  riskScore: number  // 0–100
}

export class CoreScannerService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed")
  }

  async scanHoldings(mintAddress: string): Promise<{ holderCount: number; totalSupply: number }> {
    const mintKey = new PublicKey(mintAddress)
    const resp = await this.connection.getParsedTokenAccountsByOwner(
      mintKey,
      { programId: new PublicKey() }
    )
    const balances = resp.value.map(acc => {
      const info = (acc.account.data as ParsedAccountData).parsed.info.tokenAmount
      return Number(info.uiAmount)
    })
    const totalSupply = balances.reduce((sum, b) => sum + b, 0)
    const holderCount = balances.filter(b => b > 0).length
    return { holderCount, totalSupply }
  }

  async scanRecentTransfers(mintAddress: string, limit: number = 50): Promise<TransferRecord[]> {
    const mintKey = new PublicKey(mintAddress)
    const sigs: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(mintKey, { limit })
    const transfers: TransferRecord[] = []
    for (const info of sigs) {
      const tx = await this.connection.getParsedConfirmedTransaction(info.signature)
      if (!tx) continue
      for (const instr of tx.transaction.message.instructions as any[]) {
        if (instr.program === "spl-token" && instr.parsed.type === "transfer") {
          const amt = Number(instr.parsed.info.amount) / 10 ** instr.parsed.info.decimals
          transfers.push({
            signature: info.signature,
            amount: amt,
            timestamp: (info.blockTime ?? 0) * 1000
          })
        }
      }
    }
    return transfers
  }

  async computeRisk(mintAddress: string): Promise<TokenRiskMetrics> {
    const { holderCount, totalSupply } = await this.scanHoldings(mintAddress)
    const transfers = await this.scanRecentTransfers(mintAddress, 100)
    // simple risk heuristic: high transfer volume relative to supply increases risk
    const recentVolume = transfers.reduce((sum, t) => sum + t.amount, 0)
    const usageRatio = totalSupply ? recentVolume / totalSupply : 0
    const riskScore = Math.min(100, Math.round(usageRatio * 100 * (holderCount > 0 ? holderCount / 100 : 1)))
    return { totalSupply, holderCount, recentTransfers: transfers, riskScore }
  }
}
