import { Connection, PublicKey, ParsedConfirmedTransaction, ParsedInstruction, ConfirmedSignatureInfo } from "@solana/web3.js"

export interface PatternAlert {
  signature: string
  pattern: string
  slot: number
}

export class TokenPatternDetector {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async detect(mint: string, limit = 100): Promise<PatternAlert[]> {
    const key = new PublicKey(mint)
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(key, { limit })
    const alerts: PatternAlert[] = []
    for (const info of sigs) {
      const tx = await this.conn.getParsedConfirmedTransaction(info.signature)
      if (!tx) continue
      const sig = info.signature, slot = tx.slot
      for (const instr of tx.transaction.message.instructions as ParsedInstruction[]) {
        const parsed = (instr as any).parsed
        if (instr.program === "spl-token" && parsed.type === "transfer" && Number(parsed.info.amount) > 1_000_000) {
          alerts.push({ signature: sig, pattern: "large-transfer", slot })
        }
        if (instr.program === "spl-token-swap") {
          alerts.push({ signature: sig, pattern: "swap-event", slot })
        }
      }
    }
    return alerts
  }
}
