
import { Connection, PublicKey, ParsedAccountData, ConfirmedSignatureInfo } from "@solana/web3.js"

export interface TokenGroup {
  mint: string
  totalReceived: number
  totalSent: number
}

export interface SuspiciousEvent {
  signature: string
  mint: string
  amount: number
  direction: "in" | "out"
}

export interface TokenAnalysis {
  groups: TokenGroup[]
  suspicious: SuspiciousEvent[]
}

export class TokenWatchService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed")
  }

  async groupByToken(address: string): Promise<TokenGroup[]> {
    const key = new PublicKey(address)
    const sigs = await this.connection.getSignaturesForAddress(key, { limit: 200 })
    const tally: Record<string, { recv: number; sent: number }> = {}

    for (const info of sigs) {
      const tx = await this.connection.getParsedConfirmedTransaction(info.signature)
      if (!tx) continue
      for (const instr of tx.transaction.message.instructions as any[]) {
        if (instr.program === "spl-token" && instr.parsed.type === "transfer") {
          const mint = instr.parsed.info.mint
          const amt = Number(instr.parsed.info.amount)
          const dir = instr.parsed.info.destination === address ? "recv" : "sent"
          tally[mint] = tally[mint] || { recv: 0, sent: 0 }
          tally[mint][dir] += amt
        }
      }
    }
    return Object.entries(tally).map(([mint, { recv, sent }]) => ({
      mint,
      totalReceived: recv,
      totalSent: sent
    }))
  }

  async detectSuspicious(address: string, threshold: number = 1_000_000): Promise<SuspiciousEvent[]> {
    const key = new PublicKey(address)
    const sigs = await this.connection.getSignaturesForAddress(key, { limit: 200 })
    const events: SuspiciousEvent[] = []

    for (const info of sigs) {
      const tx = await this.connection.getParsedConfirmedTransaction(info.signature)
      if (!tx) continue
      for (const instr of tx.transaction.message.instructions as any[]) {
        if (instr.program === "spl-token" && instr.parsed.type === "transfer") {
          const amt = Number(instr.parsed.info.amount)
          if (amt >= threshold) {
            const mint = instr.parsed.info.mint
            const dir = instr.parsed.info.destination === address ? "in" : "out"
            events.push({ signature: info.signature, mint, amount: amt, direction: dir })
          }
        }
      }
    }
    return events
  }

  async analyzeToken(address: string): Promise<TokenAnalysis> {
    const groups = await this.groupByToken(address)
    const suspicious = await this.detectSuspicious(address)
    return { groups, suspicious }
  }
}
