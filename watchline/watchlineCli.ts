import dotenv from "dotenv"
import readline from "readline"
import { WatchlineService, TransactionCallback } from "./watchlineService"

dotenv.config()

const service = new WatchlineService(process.env.SOLANA_RPC_ENDPOINT!)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const callback: TransactionCallback = (address, signature) => {
  console.log(`New transaction for ${address}: ${signature}`)
}

service.onTransaction(callback)

rl.question("Enter addresses to watch (comma-separated): ", input => {
  const list = input.split(",").map(a => a.trim()).filter(Boolean)
  list.forEach(addr => service.addAddress(addr))
  service.start(5000)
  console.log("Watching addresses. Press Ctrl+C to exit.")
  rl.close()
})
