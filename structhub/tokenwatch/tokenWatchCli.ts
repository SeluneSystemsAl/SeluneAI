
import dotenv from "dotenv"
import readline from "readline"
import { TokenWatchService, TokenGroup, SuspiciousEvent } from "./tokenWatchService"

dotenv.config()
const service = new TokenWatchService(process.env.SOLANA_RPC_ENDPOINT!)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question("Enter wallet address: ", addr => {
  const address = addr.trim()
  console.log("Analyzing token activity...")
  service.analyzeToken(address)
    .then(({ groups, suspicious }) => {
      console.log("\nToken Groups:")
      groups.forEach((g: TokenGroup) => {
        console.log(`- ${g.mint}: received ${g.totalReceived}, sent ${g.totalSent}`)
      })
      console.log("\nSuspicious Events:")
      if (suspicious.length === 0) {
        console.log("None detected")
      } else {
        suspicious.forEach((e: SuspiciousEvent) => {
          console.log(`${e.signature}: ${e.direction} ${e.amount} of ${e.mint}`)
        })
      }
    })
    .catch(e => console.error("Error:", e.message))
    .finally(() => rl.close())
})
