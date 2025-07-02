
import express from "express"
import { ScanSurgeService } from "./scanSurgeService"
import { ScanSurgeAnalyzer } from "./scanSurgeAnalyzer"
import { ScanSurgeAlertService } from "./scanSurgeAlertService"

const app = express()
app.use(express.json())

const svc = new ScanSurgeService(process.env.SOLANA_RPC_ENDPOINT!)
const analyzer = new ScanSurgeAnalyzer()
const alerts = new ScanSurgeAlertService()

app.post("/scan", async (req, res) => {
  const { mint } = req.body
  const points = await svc.fetchVolumes(mint, 50)
  const events = analyzer.detect(points)
  events.forEach(e => alerts.push(e))
  res.json({ success: true, alerts: alerts.get() })
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`ScanSurge API on port ${process.env.PORT || 3000}`)
)
