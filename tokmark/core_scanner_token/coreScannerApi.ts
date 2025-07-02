import express from "express"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import { CoreScannerService } from "./coreScannerService"

dotenv.config()

const app = express()
app.use(bodyParser.json())

const service = new CoreScannerService(process.env.SOLANA_RPC_ENDPOINT!)

app.get("/holdings/:mint", async (req, res) => {
  try {
    const data = await service.scanHoldings(req.params.mint)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.get("/transfers/:mint", async (req, res) => {
  try {
    const data = await service.scanRecentTransfers(req.params.mint, Number(req.query.limit) || 50)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.get("/risk/:mint", async (req, res) => {
  try {
    const data = await service.computeRisk(req.params.mint)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

const port = parseInt(process.env.PORT || "3000")
app.listen(port, () => {
  console.log(`CoreScanner API listening on port ${port}`)
})
