import { Connection, PublicKey, ConfirmedSignatureInfo, Commitment } from "@solana/web3.js"

export type TransactionCallback = (address: string, signature: string) => void

export interface WatchlineOptions {
  commitment?: Commitment
  fetchLimit?: number
  logger?: {
    info(...args: any[]): void
    warn(...args: any[]): void
    error(...args: any[]): void
  }
}

export class WatchlineService {
  private connection: Connection
  private addresses = new Set<string>()
  private callbacks: Set<TransactionCallback> = new Set()
  private lastSeen: Record<string, string> = {}
  private intervalId: NodeJS.Timer | null = null
  private commitment: Commitment
  private fetchLimit: number
  private logger: WatchlineOptions["logger"]

  constructor(rpcUrl: string, options: WatchlineOptions = {}) {
    this.commitment = options.commitment ?? "confirmed"
    this.fetchLimit = options.fetchLimit ?? 10
    this.logger = options.logger ?? console
    this.connection = new Connection(rpcUrl, this.commitment)
  }

  /** Start polling at the given interval (ms) */
  start(intervalMs: number = 10_000): void {
    if (this.intervalId) return
    this.logger.info(`WatchlineService starting, interval=${intervalMs}ms`)
    this.intervalId = setInterval(() => {
      this.pollOnce().catch(err => {
        this.logger.error("WatchlineService poll error", err)
      })
    }, intervalMs)
  }

  /** Stop polling */
  stop(): void {
    if (!this.intervalId) return
    clearInterval(this.intervalId)
    this.intervalId = null
    this.logger.info("WatchlineService stopped")
  }

  /** Add an address to watch */
  addAddress(address: string): void {
    if (this.addresses.has(address)) return
    this.addresses.add(address)
    this.lastSeen[address] = ""
    this.logger.info(`Added address to watch: ${address}`)
  }

  /** Remove an address from watch */
  removeAddress(address: string): void {
    if (!this.addresses.delete(address)) return
    delete this.lastSeen[address]
    this.logger.info(`Removed address from watch: ${address}`)
  }

  /** Subscribe to transaction events */
  onTransaction(cb: TransactionCallback): void {
    this.callbacks.add(cb)
    this.logger.info("Registered new transaction callback")
  }

  /** Unsubscribe a callback */
  offTransaction(cb: TransactionCallback): void {
    this.callbacks.delete(cb)
    this.logger.info("Unregistered transaction callback")
  }

  /** Clear all watched addresses and callbacks */
  clear(): void {
    this.stop()
    this.addresses.clear()
    this.callbacks.clear()
    this.lastSeen = {}
    this.logger.info("Cleared all addresses and callbacks")
  }

  /** Poll all addresses once for new signatures */
  private async pollOnce(): Promise<void> {
    if (this.addresses.size === 0) return
    const tasks = Array.from(this.addresses).map(addr => this.checkAddress(addr))
    await Promise.all(tasks)
  }

  /** Fetch and emit new signatures for a single address */
  private async checkAddress(address: string): Promise<void> {
    try {
      const key = new PublicKey(address)
      const sigInfos: ConfirmedSignatureInfo[] =
        await this.connection.getSignaturesForAddress(key, {
          limit: this.fetchLimit,
        })

      if (sigInfos.length === 0) return

      const last = this.lastSeen[address]
      // Find new signatures since lastSeen (newest first)
      const newSigs = last
        ? sigInfos.filter(info => info.signature !== last)
        : sigInfos
      // Emit in chronological order (oldest first)
      newSigs.reverse().forEach(info => {
        this.callbacks.forEach(cb => {
          try {
            cb(address, info.signature)
          } catch (cbErr) {
            this.logger.warn("Callback error", cbErr)
          }
        })
      })

      // Update lastSeen to newest signature in this batch
      this.lastSeen[address] = sigInfos[0].signature
    } catch (err) {
      this.logger.error(`Failed to fetch signatures for ${address}`, err)
    }
  }
}
