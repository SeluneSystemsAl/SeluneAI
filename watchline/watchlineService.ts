import { Connection, PublicKey, ConfirmedSignatureInfo } from "@solana/web3.js"

export type TransactionCallback = (address: string, signature: string) => void

export class WatchlineService {
  private connection: Connection
  private addresses: PublicKey[] = []
  private intervalId: NodeJS.Timer | null = null
  private callbacks: TransactionCallback[] = []
  private lastSeen: Record<string, string> = {}

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed")
  }

  addAddress(address: string): void {
    const key = new PublicKey(address)
    this.addresses.push(key)
    this.lastSeen[address] = ""
  }

  onTransaction(cb: TransactionCallback): void {
    this.callbacks.push(cb)
  }

  private async pollOnce(): Promise<void> {
    for (const key of this.addresses) {
      const address = key.toBase58()
      const sigs: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(key, { limit: 5 })
      for (const sigInfo of sigs) {
        if (sigInfo.signature === this.lastSeen[address]) break
        this.callbacks.forEach(cb => cb(address, sigInfo.signature))
      }
      if (sigs.length > 0) {
        this.lastSeen[address] = sigs[0].signature
      }
    }
  }

  start(intervalMs: number = 10000): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => {
      this.pollOnce().catch(() => null)
    }, intervalMs)
  }

  stop(): void {
    if (!this.intervalId) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }
}
