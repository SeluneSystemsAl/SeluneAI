
import { BaseSeluneAction } from './baseSeluneAction'
import { Connection, PublicKey } from '@solana/web3.js'

export interface AgentResult {
  success: boolean
  data?: Record<string, any>
  error?: string
}

export class SeluneAgent extends BaseSeluneAction<string, AgentResult> {
  private conn: Connection

  constructor(rpcUrl: string) {
    super('SeluneAgent')
    this.conn = new Connection(rpcUrl, 'confirmed')
  }

  protected async execute(mint: string): Promise<AgentResult> {
    try {
      const key = new PublicKey(mint)
      const info = await this.conn.getAccountInfo(key)
      if (!info) throw new Error('Account not found')
      return { success: true, data: { lamports: info.lamports, owner: info.owner.toBase58() } }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
