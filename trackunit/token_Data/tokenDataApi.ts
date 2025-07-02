import express from "express"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import { TokenDataService } from "./tokenDataService"

dotenv.config()

const app = express()
app.use(bodyParser.json())

const service = new TokenDataService(process.env.SOLANA_RPC_ENDPOINT!)

app.get("/token/:mint", async (req, res) => {
  const { mint } = req.params
  try {
    const meta = await service.fetchMintInfo(mint)
    res.json({ success: true, data: meta })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.get("/token/:mint/supply", async (req, res) => {
  const { mint } = req.params
  try {
    const supply = await service.fetchSupply(mint)
    res.json({ success: true, data: { mint, supply } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

const port = parseInt(process.env.PORT || "3000")
app.listen(port, () => {
  console.log(`TokenData API running on port ${port}`)
})
