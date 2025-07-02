type SourcePrice = { value: number; label: string }

export class DriftEvaluator {
  private readonly threshold: number

  constructor(thresholdPercent = 1.5) {
    this.threshold = thresholdPercent
  }

  evaluate(base: SourcePrice, compare: SourcePrice) {
    const delta = base.value - compare.value
    const average = (base.value + compare.value) / 2
    const deviation = (delta / average) * 100

    const status =
      Math.abs(deviation) > this.threshold ? "alert" : "stable"

    return {
      from: base.label,
      to: compare.label,
      basePrice: base.value,
      comparePrice: compare.value,
      deviation: Number(deviation.toFixed(3)),
      status,
    }
  }
}
