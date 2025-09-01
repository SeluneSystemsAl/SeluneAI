import { Connection, PublicKey, Commitment } from "@solana/web3.js"

export interface CellRunMetrics {
  slot: number
  blockHeight: number
  rpcLatencyMs: number
  blockhash: string
}

export interface CellResult {
  cellId: string
  status: "initialized" | "running" | "completed" | "failed"
  startedAt: number
  durationMs?: number
  error?: string
  metrics?: CellRunMetrics
}

export interface StartCellOptions {
  commitment?: Commitment
  timeoutMs?: number
  retries?: number
  backoffBaseMs?: number
  hooks?: {
    onInitialize?: (result: CellResult) => void
    onRunStart?: (cellId: string) => void
    onRunComplete?: (result: CellResult) => void
    onError?: (error: Error, phase: "initialize" | "run") => void
  }
}

/** Simple structured logger */
const logger = {
  info: (msg: string, meta: any = {}) =>
    console.log({ timestamp: new Date().toISOString(), level: "info", msg, ...meta }),
  warn: (msg: string, meta: any = {}) =>
    console.warn({ timestamp: new Date().toISOString(), level: "warn", msg, ...meta }),
  error: (msg: string, meta: any = {}) =>
    console.error({ timestamp: new Date().toISOString(), level: "error", msg, ...meta }),
}

export class StartCellService {
  private connection: Connection
  private timeoutMs: number
  private retries: number
  private backoffBaseMs: number
  private hooks: Required<StartCellOptions>["hooks"]

  constructor(rpcUrl: string, opts: StartCellOptions = {}) {
    const commitment = opts.commitment ?? "confirmed"
    this.connection = new Connection(rpcUrl, commitment)
    this.timeoutMs = opts.timeoutMs ?? 7000
    this.retries = opts.retries ?? 2
    this.backoffBaseMs = opts.backoffBaseMs ?? 600
    this.hooks = {
      onInitialize: opts.hooks?.onInitialize ?? (() => {}),
      onRunStart: opts.hooks?.onRunStart ?? (() => {}),
      onRunComplete: opts.hooks?.onRunComplete ?? (() => {}),
      onError: opts.hooks?.onError ?? (() => {}),
    }
  }

  /** Initializes a new cell for the given owner address, validates address and RPC reachability */
  public async initializeCell(ownerAddress: string): Promise<CellResult> {
    let owner: PublicKey
    try {
      owner = new PublicKey(ownerAddress)
    } catch (err: any) {
      logger.error("Invalid ownerAddress", { ownerAddress })
      throw err
    }

    const timestamp = Date.now()
    const cellId = `${owner.toBase58()}-${timestamp}`
    const result: CellResult = { cellId, status: "initialized", startedAt: timestamp }

    // Probe RPC with a real request so we fail fast if endpoint is unhealthy
    try {
      await this.withTimeout(this.connection.getEpochInfo(), this.timeoutMs)
    } catch (err: any) {
      logger.error("RPC probe failed during initialize", { error: String(err) })
      this.hooks.onError(err, "initialize")
      result.status = "failed"
      result.error = err.message ?? "RPC probe failed"
      this.hooks.onRunComplete(result)
      return result
    }

    logger.info("Cell initialized", result)
    this.hooks.onInitialize(result)
    return result
  }

  /** Runs a cell: performs real RPC calls and captures metrics (no simulations) */
  public async runCell(cellId: string): Promise<CellResult> {
    this.hooks.onRunStart(cellId)
    logger.info("Run started", { cellId })

    for (let attempt = 1; attempt <= this.retries + 1; attempt++) {
      const start = Date.now()
      try {
        const metrics = await this.withTimeout(this.collectRunMetrics(), this.timeoutMs)
        const durationMs = Date.now() - start
        const result: CellResult = {
          cellId,
          status: "completed",
          startedAt: start,
          durationMs,
          metrics,
        }
        logger.info("Run completed", result)
        this.hooks.onRunComplete(result)
        return result
      } catch (err: any) {
        const durationMs = Date.now() - start
        logger.warn("Run attempt failed", {
          cellId,
          attempt,
          error: err?.message ?? String(err),
          durationMs,
        })
        this.hooks.onError(err, "run")

        if (attempt > this.retries) {
          const result: CellResult = {
            cellId,
            status: "failed",
            startedAt: start,
            durationMs,
            error: err?.message ?? "Run failed",
          }
          logger.error("Run failed", result)
          this.hooks.onRunComplete(result)
          return result
        }

        // Deterministic backoff (no randomness)
        await this.delay(this.backoffBaseMs * attempt)
      }
    }

    // Unreachable fallback
    const fallback: CellResult = {
      cellId,
      status: "failed",
      startedAt: Date.now(),
      error: "Unexpected exit",
    }
    logger.error("Run unexpected exit", fallback)
    return fallback
  }

  /** Convenience: initialize and run in one step */
  public async initializeAndRun(ownerAddress: string): Promise<CellResult> {
    const init = await this.initializeCell(ownerAddress)
    if (init.status !== "initialized") return init
    return this.runCell(init.cellId)
  }

  /** Collects real on-chain metrics in one RPC-bound step */
  private async collectRunMetrics(): Promise<CellRunMetrics> {
    const t0 = Date.now()
    const [{ blockhash }, slot, blockHeight] = await Promise.all([
      this.connection.getLatestBlockhash(),
      this.connection.getSlot(),
      this.connection.getBlockHeight(),
    ])
    const rpcLatencyMs = Date.now() - t0
    return { slot, blockHeight, rpcLatencyMs, blockhash }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms))
  }

  /** Adds a timeout to any promise without randomness */
  private withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          reject(new Error("Run timeout"))
        }
      }, timeoutMs)
      p.then((v) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(v)
        }
      }).catch((e) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          reject(e)
        }
      })
    })
  }
}
