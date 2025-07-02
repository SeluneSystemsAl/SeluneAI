import { Connection, PublicKey } from "@solana/web3.js"

export interface TokenMetadata {
  mint: string
  supply: number
  decimals: number
}

export class TokenDataService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed")
  }

  async fetchMintInfo(mintAddress: string): Promise<TokenMetadata> {
    const mintKey = new PublicKey(mintAddress)
    const info = await this.connection.getParsedAccountInfo(mintKey, "confirmed")
    const data = info.value?.data
    if (!data || Array.isArray(data)) {
      throw new Error("Invalid mint account data")
    }
    const parsed = (data as any).parsed.info
    const supply = Number(parsed.supply) / 10 ** parsed.decimals
    return {
      mint: mintAddress,
      supply,
      decimals: parsed.decimals
    }
  }

  async fetchSupply(mintAddress: string): Promise<number> {
    const mintKey = new PublicKey(mintAddress)
    const resp = await this.connection.getTokenSupply(mintKey, "confirmed")
    return Number(resp.value.uiAmount)
  }
}
