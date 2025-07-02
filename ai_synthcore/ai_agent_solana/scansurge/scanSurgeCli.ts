
import dotenv from "dotenv"
import readline from "readline"
import { ScanSurgeService } from "./scanSurgeService"
import { ScanSurgeAnalyzer } from "./scanSurgeAnalyzer"
import { ScanSurgeAlertService } from "./scanSurgeAlertService"

dotenv.config()
const svc = new ScanSurgeService(process.env.SOLANA_RPC_ENDPOINT!)
const analyzer = new ScanSurgeAnalyzer()
const alerts = new ScanSurgeAlertService()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question("Token mint to monitor: ", async (mint) => {
  console.log("Gathering volumes…")
  const points = await svc.fetchVolumes(mint.trim(), 50)
  const events = analyzer.detect(points)
  events.forEach(e => alerts.push(e))
  console.log("Alerts:")
  alerts.get().forEach(a => console.log(a.message))
  rl.close()
})
