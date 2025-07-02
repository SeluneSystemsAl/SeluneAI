
export type AlertLevel = 'info' | 'warning' | 'critical'
export type Alert = {
  level: AlertLevel
  message: string
  timestamp: number
}

export class SeluneAlertService {
  private alerts: Alert[] = []
  private thresholds: Record<AlertLevel, (count: number) => boolean> = {
    info:    () => true,
    warning: (c) => c > 5,
    critical:(c) => c > 10
  }

  push(message: string, count: number) {
    const level = Object.entries(this.thresholds)
      .reverse()          // critical first
      .find(([, fn]) => fn(count))![0] as AlertLevel
    this.alerts.push({ level, message, timestamp: Date.now() })
  }

  getAll(): Alert[] {
    return [...this.alerts]
  }

  clear(level?: AlertLevel): void {
    if (level) {
      this.alerts = this.alerts.filter(a => a.level !== level)
    } else {
      this.alerts = []
    }
  }
}
