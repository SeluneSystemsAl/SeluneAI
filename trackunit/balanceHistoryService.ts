import dotenv from "dotenv"
import readline from "readline"
import { BalanceHistoryService } from "./balanceHistoryService"

dotenv.config()

const service = new BalanceHistoryService(process.env.SOLANA_RPC_ENDPOINT!)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question("Wallet to monitor: ", (addr) => {
  const address = addr.trim()
  console.log(`Recording balance for ${address} every 10s`)
  setInterval(async () => {
    try {
      await service.capture(address)
      const history = service.getHistory(address)
      const last = history[history.length - 1]
      console.log(new Date(last.timestamp).toISOString(), `Balance: ${last.totalBalance}`)
    } catch (e: any) {
      console.error("Error:", e.message)
    }
  }, 10000)
  rl.close()
})
