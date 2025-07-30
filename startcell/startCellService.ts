import { Connection, PublicKey, Commitment } from "@solana/web3.js"

export interface CellResult {
  cellId: string
  status: "initialized" | "running" | "completed" | "failed"
  startedAt: number
  durationMs?: number
  error?: string
}

export interface StartCellOptions {
  commitment?: Commitment
  timeoutMs?: number
  retries?: number
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
  private hooks: Required<StartCellOptions>["hooks"]

  constructor(rpcUrl: string, opts: StartCellOptions = {}) {
    const commitment = opts.commitment ?? "confirmed"
    this.connection = new Connection(rpcUrl, commitment)
    this.timeoutMs = opts.timeoutMs ?? 5000
    this.retries = opts.retries ?? 1
    this.hooks = {
      onInitialize: opts.hooks?.onInitialize ?? (() => {}),
      onRunStart: opts.hooks?.onRunStart ?? (() => {}),
      onRunComplete: opts.hooks?.onRunComplete ?? (() => {}),
      onError: opts.hooks?.onError ?? (() => {}),
    }
  }

  /** Initializes a new cell for the given owner address */
  public async initializeCell(ownerAddress: string): Promise<CellResult> {
    try {
      new PublicKey(ownerAddress) // validation
    } catch (err: any) {
      logger.error("Invalid ownerAddress", { ownerAddress })
      throw err
    }

    const timestamp = Date.now()
    const cellId = `${ownerAddress}-${timestamp}`
    const result: CellResult = { cellId, status: "initialized", startedAt: timestamp }

    logger.info("Cell initialized", result)
    this.hooks.onInitialize(result)
    return result
  }

  /**
   * Runs the cell's work, with retries and timeout.
   * Simulates async work; replace placeholder with real logic.
   */
  public async runCell(cellId: string): Promise<CellResult> {
    this.hooks.onRunStart(cellId)
    logger.info("Run started", { cellId })

    for (let attempt = 1; attempt <= this.retries + 1; attempt++) {
      const start = Date.now()
      try {
        // enforce timeout
        const work = new Promise<void>((res) => setTimeout(res, 500))
        const timeout = new Promise<void>((_, rej) =>
          setTimeout(() => rej(new Error("Run timeout")), this.timeoutMs)
        )
        await Promise.race([work, timeout])

        const durationMs = Date.now() - start
        const result: CellResult = { cellId, status: "completed", startedAt: start, durationMs }
        logger.info("Run completed", result)
        this.hooks.onRunComplete(result)
        return result
      } catch (err: any) {
        const durationMs = Date.now() - start
        logger.warn("Run attempt failed", { cellId, attempt, error: err.message, durationMs })
        this.hooks.onError(err, "run")
        if (attempt > this.retries || err.message === "Run timeout") {
          const result: CellResult = {
            cellId,
            status: "failed",
            startedAt: start,
            durationMs,
            error: err.message,
          }
          logger.error("Run failed", result)
          this.hooks.onRunComplete(result)
          return result
        }
        await this.delay(500 * attempt)
      }
    }
    // unreachable
    const fallback: CellResult = {
      cellId,
      status: "failed",
      startedAt: Date.now(),
      error: "Unexpected exit",
    }
    logger.error("Run unexpected exit", fallback)
    return fallback
  }

  private delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms))
  }
}
