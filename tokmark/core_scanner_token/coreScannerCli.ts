import dotenv from "dotenv"
import readline from "readline"
import { CoreScannerService } from "./coreScannerService"

dotenv.config()

const service = new CoreScannerService(process.env.SOLANA_RPC_ENDPOINT!)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

async function main() {
  rl.question("Enter token mint address: ", async (mint) => {
    const address = mint.trim()
    try {
      console.log("Scanning holdings...")
      const holdings = await service.scanHoldings(address)
      console.log(`Total Supply: ${holdings.totalSupply}`)
      console.log(`Holder Count: ${holdings.holderCount}`)

      console.log("\nFetching recent transfers...")
      const transfers = await service.scanRecentTransfers(address, 20)
      transfers.forEach(t => {
        console.log(`${new Date(t.timestamp).toISOString()}  ${t.amount} tokens — ${t.signature}`)
      })

      console.log("\nComputing risk metrics...")
      const risk = await service.computeRisk(address)
      console.log(`Risk Score: ${risk.riskScore}/100`)
    } catch (e: any) {
      console.error("Error:", e.message)
    } finally {
      rl.close()
    }
  })
}

main()
