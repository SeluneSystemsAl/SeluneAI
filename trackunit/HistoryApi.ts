// server.ts

import express, { Request, Response, NextFunction } from "express"
import { z } from "zod"
import dotenv from "dotenv"
import { PublicKey } from "@solana/web3.js"
import { BalanceHistoryService } from "./balanceHistoryService"

dotenv.config()

const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT
if (!RPC_ENDPOINT) {
  throw new Error("SOLANA_RPC_ENDPOINT must be set in .env")
}

const PORT = parseInt(process.env.PORT || "3000", 10)

const service = new BalanceHistoryService(RPC_ENDPOINT)

// Zod schemas
const captureSchema = z.object({
  address: z.string().refine(str => {
    try { new PublicKey(str); return true }
    catch { return false }
  }, { message: "Invalid Solana address" }),
})

const addressParamSchema = z.object({
  address: z.string().refine(str => {
    try { new PublicKey(str); return true }
    catch { return false }
  }, { message: "Invalid Solana address" }),
})

const app = express()
app.use(express.json())

// Async handler wrapper
function wrapAsync(fn: (req: Request, res: Response) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next)
  }
}

// POST /capture
app.post(
  "/capture",
  wrapAsync(async (req, res) => {
    const parsed = captureSchema.parse(req.body)
    await service.capture(parsed.address)
    res.json({ success: true })
  })
)

// GET /history/:address
app.get(
  "/history/:address",
  wrapAsync(async (req, res) => {
    const { address } = addressParamSchema.parse(req.params)
    const history = service.getHistory(address)
    res.json({ success: true, history })
  })
)

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() })
})

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ success: false, errors: err.errors })
  }
  console.error(err)
  res.status(500).json({ success: false, error: err.message || "Internal Server Error" })
})

const server = app.listen(PORT, () => {
  console.log(`BalanceHistory API listening on port ${PORT}`)
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server…")
  server.close(() => process.exit(0))
})
