import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"

export interface BalanceInfo {
  sol: number
  tokens: { mint: string; balance: number }[]
}

export class PullBalanceService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed")
  }

  async fetchBalances(address: string): Promise<BalanceInfo> {
    const key = new PublicKey(address)

    const solLamports = await this.connection.getBalance(key, "confirmed")
    const sol = solLamports / 1e9

    const resp = await this.connection.getParsedTokenAccountsByOwner(key, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    })

    const tokens = resp.value.map((acct) => {
      const info = (acct.account.data as ParsedAccountData).parsed.info.tokenAmount
      return {
        mint: info.mint,
        balance: Number(info.uiAmount)
      }
    })

    return { sol, tokens }
  }
}
