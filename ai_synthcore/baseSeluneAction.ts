
export abstract class BaseSeluneAction<Input, Output> {
  protected actionName: string

  constructor(actionName: string) {
    this.actionName = actionName
  }

  logStart(input: Input) {
    console.log(`[${this.actionName}] start`, input)
  }

  logEnd(output: Output) {
    console.log(`[${this.actionName}] end`, output)
  }

  async run(input: Input): Promise<Output> {
    this.logStart(input)
    const result = await this.execute(input)
    this.logEnd(result)
    return result
  }

  protected abstract execute(input: Input): Promise<Output>
}
