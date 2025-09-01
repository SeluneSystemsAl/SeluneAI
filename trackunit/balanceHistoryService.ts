import dotenv from "dotenv"
import readline from "readline"
import { BalanceHistoryService } from "./balanceHistoryService"

dotenv.config()

const service = new BalanceHistoryService(process.env.SOLANA_RPC_ENDPOINT!)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const printLatest = (address: string) => {
  const history = service.getHistory(address)
  if (history.length === 0) {
    console.log("No balance history recorded yet")
    return
  }
  const last = history[history.length - 1]
  console.log(
    `[${new Date(last.timestamp).toISOString()}]`,
    `Balance: ${last.totalBalance}`
  )
}

rl.question("Wallet to monitor: ", (addr) => {
  const address = addr.trim()
  if (!address) {
    console.error("No wallet address provided")
    rl.close()
    return
  }

  console.log(`Recording balance for ${address} every 10s (Ctrl+C to exit)`)

  const captureAndPrint = async () => {
    try {
      await service.capture(address)
      printLatest(address)
    } catch (e: any) {
      console.error("Error during capture:", e.message)
    }
  }

  // first capture immediately
  captureAndPrint()
  // then schedule repeated captures
  const interval = setInterval(captureAndPrint, 10000)

  rl.on("SIGINT", () => {
    clearInterval(interval)
    console.log("\nStopped monitoring")
    rl.close()
  })

  rl.close()
})
