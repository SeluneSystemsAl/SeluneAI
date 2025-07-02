
import express from "express"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import { TokenWatchService } from "./tokenWatchService"

dotenv.config()
const app = express()
app.use(bodyParser.json())
const service = new TokenWatchService(process.env.SOLANA_RPC_ENDPOINT!)

app.get("/group/:address", async (req, res) => {
  try {
    const data = await service.groupByToken(req.params.address)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.get("/suspicious/:address", async (req, res) => {
  try {
    const data = await service.detectSuspicious(req.params.address, Number(req.query.threshold) || 1000000)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.get("/analyze/:address", async (req, res) => {
  try {
    const data = await service.analyzeToken(req.params.address)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

const port = parseInt(process.env.PORT || "3000")
app.listen(port, () => console.log(`TokenWatch API on port ${port}`))
