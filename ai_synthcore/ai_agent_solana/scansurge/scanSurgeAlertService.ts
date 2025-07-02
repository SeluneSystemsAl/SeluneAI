
import { SurgeEvent } from "./scanSurgeAnalyzer"

export type Alert = { time: number; message: string }

export class ScanSurgeAlertService {
  private alerts: Alert[] = []

  push(event: SurgeEvent): void {
    const msg = `Surge of ${event.changePercent}% at ${new Date(event.timestamp).toISOString()}`
    this.alerts.push({ time: event.timestamp, message: msg })
  }

  get(): Alert[] {
    return [...this.alerts]
  }

  clear(): void {
    this.alerts = []
  }
}
