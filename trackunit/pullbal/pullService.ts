import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"

export interface TokenBalance {
  mint: string
  balance: number
  decimals: number
}

export interface BalanceInfo {
  sol: number
  tokens: TokenBalance[]
}

export class PullBalanceService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed")
  }

  /**
   * Fetch SOL and SPL token balances for a wallet
   */
  async fetchBalances(address: string): Promise<BalanceInfo> {
    const key = new PublicKey(address)

    // Fetch SOL balance
    const solLamports = await this.connection.getBalance(key, "confirmed")
    const sol = solLamports / 1e9

    // Fetch SPL token accounts
    const resp = await this.connection.getParsedTokenAccountsByOwner(key, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    })

    const tokens: TokenBalance[] = resp.value.map((acct) => {
      const data = acct.account.data as ParsedAccountData
      const amountInfo = data.parsed.info.tokenAmount
      return {
        mint: data.parsed.info.mint,
        balance: Number(amountInfo.uiAmount),
        decimals: Number(amountInfo.decimals),
      }
    })

    return { sol, tokens }
  }

  /**
   * Prints balances to console in a readable format
   */
  async printBalances(address: string): Promise<void> {
    const { sol, tokens } = await this.fetchBalances(address)
    console.log(`SOL: ${sol.toFixed(4)}`)
    if (tokens.length === 0) {
      console.log("No tokens found")
    } else {
      console.log("Tokens:")
      for (const t of tokens) {
        console.log(`- ${t.mint}: ${t.balance.toFixed(4)} (decimals: ${t.decimals})`)
      }
    }
  }

  /**
   * Filter token balances by minimum amount
   */
  async filterTokensByThreshold(address: string, minAmount: number): Promise<TokenBalance[]> {
    const { tokens } = await this.fetchBalances(address)
    return tokens.filter(t => t.balance >= minAmount)
  }
}
