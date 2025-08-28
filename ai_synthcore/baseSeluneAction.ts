interface ILogger {
  info(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void
  debug(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void
  warn(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void
  error(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void
  child(context: Record<string, unknown>): ILogger
}

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  time: string
  msg: string
  meta?: Record<string, unknown>
}

class ConsoleLogger implements ILogger {
  private context: Record<string, unknown>

  constructor(context: Record<string, unknown> = {}) {
    this.context = context
  }

  private line(level: LogLevel, message: string, meta?: Record<string, unknown>, ...rest: unknown[]) {
    const entry: LogEntry = {
      level,
      time: new Date().toISOString(),
      msg: message,
      meta: { ...(this.context || {}), ...(meta || {}) }
    }
    const text = JSON.stringify(entry)
    switch (level) {
      case "debug":
        console.debug(text, ...rest)
        break
      case "info":
        console.info(text, ...rest)
        break
      case "warn":
        console.warn(text, ...rest)
        break
      case "error":
        console.error(text, ...rest)
        break
    }
  }

  info(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void {
    this.line("info", message, meta, ...optionalParams)
  }

  debug(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void {
    this.line("debug", message, meta, ...optionalParams)
  }

  warn(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void {
    this.line("warn", message, meta, ...optionalParams)
  }

  error(message: string, meta?: Record<string, unknown>, ...optionalParams: unknown[]): void {
    this.line("error", message, meta, ...optionalParams)
  }

  child(context: Record<string, unknown>): ILogger {
    return new ConsoleLogger({ ...(this.context || {}), ...(context || {}) })
  }
}

export abstract class BaseSeluneAction<Input, Output> {
  protected readonly actionName: string
  protected readonly logger: ILogger

  private static seq = 0

  constructor(actionName: string, logger?: ILogger) {
    this.actionName = actionName
    this.logger = (logger ?? new ConsoleLogger()).child({ action: actionName })
  }

  protected logStart(input: Input, traceId: string): void {
    this.logger.info("start", { traceId, input })
  }

  protected logEnd(output: Output, durationMs: number, traceId: string): void {
    this.logger.info("end", { traceId, durationMs, output })
  }

  protected logError(error: unknown, traceId: string): void {
    const safeError =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) }
    this.logger.error("error", { traceId, error: safeError })
  }

  private nextTraceId(): string {
    BaseSeluneAction.seq += 1
    const part = BaseSeluneAction.seq.toString(36).padStart(4, "0")
    return `${Date.now().toString(36)}-${part}`
  }

  async run(input: Input): Promise<Output> {
    const traceId = this.nextTraceId()
    const startTime = Date.now()
    this.logStart(input, traceId)

    try {
      const result = await this.execute(input, traceId)
      const duration = Date.now() - startTime
      this.logEnd(result, duration, traceId)
      return result
    } catch (err) {
      this.logError(err, traceId)
      throw err
    }
  }

  protected abstract execute(input: Input, traceId: string): Promise<Output>
}

export interface FetchParams {
  url: string
  init?: RequestInit
  timeoutMs?: number
  retries?: number
  retryBackoffMs?: number
}

export interface FetchResult<T = unknown> {
  status: number
  ok: boolean
  data: T
  headers: Record<string, string>
}

export class FetchDataAction<T = unknown> extends BaseSeluneAction<FetchParams, FetchResult<T>> {
  constructor(logger?: ILogger) {
    super("FetchDataAction", logger)
  }

  protected async execute(input: FetchParams, traceId: string): Promise<FetchResult<T>> {
    const {
      url,
      init,
      timeoutMs = 15000,
      retries = 2,
      retryBackoffMs = 500
    } = input

    const attempt = async (tryIndex: number): Promise<FetchResult<T>> => {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const res = await fetch(url, { ...(init || {}), signal: controller.signal })
        const headers: Record<string, string> = {}
        res.headers.forEach((v, k) => (headers[k] = v))

        const contentType = res.headers.get("content-type") || ""
        const data = contentType.includes("application/json")
          ? ((await res.json()) as T)
          : ((await res.text()) as unknown as T)

        if (!res.ok) {
          const err = new Error(`HTTP ${res.status}`)
          ;(err as any).status = res.status
          ;(err as any).data = data
          throw err
        }

        return { status: res.status, ok: res.ok, data, headers }
      } catch (e) {
        if (tryIndex < retries) {
          const next = tryIndex + 1
          this.logger.warn("retrying", {
            traceId,
            attempt: next,
            url,
            reason: e instanceof Error ? `${e.name}: ${e.message}` : String(e)
          })
          await new Promise((r) => setTimeout(r, retryBackoffMs * next))
          return attempt(next)
        }
        throw e
      } finally {
        clearTimeout(t)
      }
    }

    return attempt(0)
  }
}

// usage example
async function exampleUsage() {
  const action = new FetchDataAction<any>()
  try {
    const result = await action.run({ url: "https://api.github.com/rate_limit" })
    console.log("Received result:", result.status, result.ok)
  } catch (error) {
    console.error("Action failed:", error)
  }
}

exampleUsage()
