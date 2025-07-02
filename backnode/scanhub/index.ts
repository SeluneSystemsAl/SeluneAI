import express from "express"
import dotenv from "dotenv"
import { ExecutionEngine } from "./executionEngine"
import { SigningEngine } from "./signingEngine"

dotenv.config()

const app = express()
app.use(express.json())

const engine = new ExecutionEngine(process.env.SOLANA_RPC_ENDPOINT!)
const signer = new SigningEngine(
  Uint8Array.from(JSON.parse(process.env.SIGNER_SECRET_KEY!))
)

app.post("/scan", async (req, res) => {
  try {
    const result = await engine.runFullScan(req.body.mint)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post("/sign", (req, res) => {
  try {
    const tx = Buffer.from(req.body.transaction, "base64")
    const signed = signer.signTransaction(tx)
    res.json({ success: true, data: signed.toString("base64") })
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message })
  }
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`ScannerHub API listening on port ${process.env.PORT || 3000}`)
)
