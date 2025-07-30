import { CoreScannerService, TokenRiskMetrics } from "./coreScannerService"

export interface ExecutionEngineOptions {
  /** Number of retry attempts on failure (default: 2) */
  retries?: number
  /** Milliseconds to wait between retries (default: 500) */
  backoffMs?: number
  /** Scan timeout in milliseconds (default: 10_000) */
  timeoutMs?: number
  /** Hooks for instrumentation */
  hooks?: {
    onBeforeScan?: (mint: string) => void
    onAfterScan?: (mint: string, metrics: TokenRiskMetrics) => void
    onError?: (mint: string, error: Error, attempt: number) => void
  }
}

const DEFAULT_OPTS: Required<ExecutionEngineOptions> = {
  retries: 2,
  backoffMs: 500,
  timeoutMs: 10_000,
  hooks: {
    onBeforeScan: () => {},
    onAfterScan: () => {},
    onError: () => {},
  },
}

const logger = {
  info: (msg: string, meta: any = {}) => console.log({ level: "info", msg, ...meta }),
  warn: (msg: string, meta: any = {}) => console.warn({ level: "warn", msg, ...meta }),
  error: (msg: string, meta: any = {}) => console.error({ level: "error", msg, ...meta }),
}

export class ExecutionEngine {
  private scanner: CoreScannerService
  private retries: number
  private backoffMs: number
  private timeoutMs: number
  private hooks: Required<ExecutionEngineOptions>["hooks"]

  constructor(rpcUrl: string, opts: ExecutionEngineOptions = {}) {
    this.scanner = new CoreScannerService(rpcUrl)
    const merged = { ...DEFAULT_OPTS, ...opts }
    this.retries = merged.retries
    this.backoffMs = merged.backoffMs
    this.timeoutMs = merged.timeoutMs
    this.hooks = { ...DEFAULT_OPTS.hooks, ...(opts.hooks ?? {}) }
  }

  /**
   * Runs a full risk scan for the given mint, with retries, timeout, and hooks.
   */
  public async runFullScan(mint: string): Promise<TokenRiskMetrics> {
    if (!/^([A-Za-z0-9]{32,44})$/.test(mint)) {
      throw new Error(`Invalid mint address: ${mint}`)
    }

    for (let attempt = 1; attempt <= this.retries + 1; attempt++) {
      try {
        logger.info(`Starting scan`, { mint, attempt })
        this.hooks.onBeforeScan(mint)

        // enforce timeout
        const scanPromise = this.scanner.computeRisk(mint)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Scan timeout")), this.timeoutMs)
        )
        const metrics = await Promise.race([scanPromise, timeoutPromise]) as TokenRiskMetrics

        logger.info(`Scan succeeded`, { mint, attempt, metrics })
        this.hooks.onAfterScan(mint, metrics)
        return metrics
      } catch (err: any) {
        logger.warn(`Scan attempt failed`, { mint, attempt, error: err.message })
        this.hooks.onError(mint, err, attempt)

        const isLast = attempt === this.retries + 1
        if (isLast) {
          logger.error(`All scan attempts failed`, { mint })
          throw new Error(`runFullScan failed for ${mint}: ${err.message}`)
        }
        await this.delay(this.backoffMs * attempt)
      }
    }
    // unreachable
    throw new Error("runFullScan: unexpected exit")
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
