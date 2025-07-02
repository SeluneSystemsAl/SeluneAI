
import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"

export interface SurgePoint {
  timestamp: number
  volume: number
}

export class ScanSurgeService {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async fetchVolumes(mint: string, limit = 100): Promise<SurgePoint[]> {
    const key = new PublicKey(mint)
    const resp = await this.conn.getParsedTokenAccountsByOwner(key, {
      programId: new PublicKey()
    })
    return resp.value.map((acc) => {
      const info = (acc.account.data as ParsedAccountData).parsed.info.tokenAmount
      return { timestamp: Date.now(), volume: Number(info.uiAmount) }
    }).slice(-limit)
  }
}
