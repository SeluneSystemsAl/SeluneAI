import dotenv from "dotenv"
import readline from "readline"
import { TokenDataService } from "./tokenDataService"

dotenv.config()

const service = new TokenDataService(process.env.SOLANA_RPC_ENDPOINT!)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question("Enter token mint address: ", async (addr) => {
  try {
    const meta = await service.fetchMintInfo(addr.trim())
    console.log("Mint:", meta.mint)
    console.log("Total Supply:", meta.supply)
    console.log("Decimals:", meta.decimals)
  } catch (e: any) {
    console.error("Error:", e.message)
  } finally {
    rl.close()
  }
})
