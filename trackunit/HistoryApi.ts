import express from "express"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import { BalanceHistoryService } from "./balanceHistoryService"

dotenv.config()

const app = express()
app.use(bodyParser.json())

const service = new BalanceHistoryService(process.env.SOLANA_RPC_ENDPOINT!)

app.post("/capture", async (req, res) => {
  const { address } = req.body
  if (!address) return res.status(400).json({ error: "address required" })
  try {
    await service.capture(address)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.get("/history/:address", (req, res) => {
  const data = service.getHistory(req.params.address)
  res.json({ history: data })
})

const port = parseInt(process.env.PORT || "3000")
app.listen(port, () => {
  console.log(`BalanceHistory API listening on port ${port}`)
})
