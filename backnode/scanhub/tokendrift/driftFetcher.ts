export class DriftFetcher {
  constructor(private readonly rpcUrl: string) {}

  async getPrice(symbol: string, vendor: string): Promise<number> {
    const endpoint = `${this.rpcUrl}/tickers/${symbol}?source=${vendor}`
    const res = await fetch(endpoint, { method: "GET" })

    if (!res.ok) throw new Error(`Unable to fetch from ${vendor}`)

    const json = await res.json()
    return json?.price ?? 0
  }

  async compare(symbol: string, vendorA: string, vendorB: string) {
    const [priceA, priceB] = await Promise.all([
      this.getPrice(symbol, vendorA),
      this.getPrice(symbol, vendorB),
    ])

    return {
      [vendorA]: priceA,
      [vendorB]: priceB,
    }
  }
}
