interface ILogger {
  info(message: string, ...optionalParams: any[]): void
  debug(message: string, ...optionalParams: any[]): void
  error(message: string, ...optionalParams: any[]): void
}

class ConsoleLogger implements ILogger {
  info(message: string, ...optionalParams: any[]): void {
    console.info(`[INFO] ${message}`, ...optionalParams)
  }

  debug(message: string, ...optionalParams: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...optionalParams)
  }

  error(message: string, ...optionalParams: any[]): void {
    console.error(`[ERROR] ${message}`, ...optionalParams)
  }
}

export abstract class BaseSeluneAction<Input, Output> {
  protected actionName: string
  protected logger: ILogger

  constructor(actionName: string, logger?: ILogger) {
    this.actionName = actionName
    this.logger = logger ?? new ConsoleLogger()
  }

  protected logStart(input: Input): void {
    this.logger.info(`[${this.actionName}] start`, input)
  }

  protected logEnd(output: Output, durationMs: number): void {
    this.logger.info(`[${this.actionName}] end (took ${durationMs}ms)`, output)
  }

  protected logError(error: unknown): void {
    this.logger.error(`[${this.actionName}] error`, error)
  }

  async run(input: Input): Promise<Output> {
    const startTime = Date.now()
    this.logStart(input)

    try {
      const result = await this.execute(input)
      const duration = Date.now() - startTime
      this.logEnd(result, duration)
      return result
    } catch (err) {
      this.logError(err)
      throw err
    }
  }

  protected abstract execute(input: Input): Promise<Output>
}

// example concrete implementation

interface FetchParams {
  url: string
  init?: RequestInit
}

interface FetchResult {
  status: number
  data: any
}

export class FetchDataAction extends BaseSeluneAction<FetchParams, FetchResult> {
  constructor(logger?: ILogger) {
    super('FetchDataAction', logger)
  }

  protected async execute(input: FetchParams): Promise<FetchResult> {
    const response = await fetch(input.url, input.init)
    const data = await response.json()
    return {
      status: response.status,
      data
    }
  }
}

// usage example

async function exampleUsage() {
  const action = new FetchDataAction()
  try {
    const result = await action.run({ url: 'https://api.example.com/data' })
    console.log('Received result:', result)
  } catch (error) {
    console.error('Action failed:', error)
  }
}

exampleUsage()
