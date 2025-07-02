import { CoreScannerService, TokenRiskMetrics } from "./coreScannerService"

export class ExecutionEngine {
  private scanner: CoreScannerService

  constructor(rpcUrl: string) {
    this.scanner = new CoreScannerService(rpcUrl)
  }

  async runFullScan(mint: string): Promise<TokenRiskMetrics> {
    const metrics = await this.scanner.computeRisk(mint)
    return metrics
  }
}
