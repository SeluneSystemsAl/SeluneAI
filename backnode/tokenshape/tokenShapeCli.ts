import dotenv from "dotenv"
import readline from "readline"
import { TokenShapeService } from "./tokenShapeService"

dotenv.config()
const service = new TokenShapeService(process.env.SOLANA_RPC_ENDPOINT!)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question("Enter token mint address: ", async (mint) => {
  try {
    console.log("Analyzing balance distribution shape...")
    const metrics = await service.analyzeDistribution(mint.trim())
    console.log("Mean balance:   ", metrics.meanBalance.toFixed(4))
    console.log("Median balance: ", metrics.medianBalance.toFixed(4))
    console.log("Variance:       ", metrics.variance.toFixed(4))
    console.log("Skewness:       ", metrics.skewness.toFixed(4))
  } catch (e: any) {
    console.error("Error:", e.message)
  } finally {
    rl.close()
  }
})
