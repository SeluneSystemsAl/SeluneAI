// server.ts

import express, { Request, Response, NextFunction } from "express"
import { z } from "zod"
import dotenv from "dotenv"
import { Connection, PublicKey } from "@solana/web3.js"
import pLimit from "p-limit"

dotenv.config()

const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT
if (!RPC_ENDPOINT) {
  throw new Error("SOLANA_RPC_ENDPOINT must be set")
}

const PORT = parseInt(process.env.PORT || "3000", 10)

/** Zod schemas **/
const mintParamSchema = z.object({
  mint: z.string().min(32).refine(s => {
    try { new PublicKey(s); return true }
    catch { return false }
  }, { message: "Invalid Solana mint address" }),
})

const patternsSchema = mintParamSchema.extend({
  limit: z.number().int().positive().optional().default(100),
})

/** Analyzer classes (refactored internals omitted for brevity) **/
class TokenActivityAnalyzer {
  constructor(private conn: Connection) {}
  async analyze(mint: string) { /* ... */ return [] as any }
}

class TokenDeepAnalyzer {
  constructor(private conn: Connection) {}
  async analyze(mint: string) { /* ... */ return {} as any }
}

class TokenPatternDetector {
  constructor(private conn: Connection) {}
  async detect(mint: string, limit: number) { /* ... */ return [] as any }
}

class InsightApiService {
  private conn: Connection
  private activity: TokenActivityAnalyzer
  private deep: TokenDeepAnalyzer
  private patterns: TokenPatternDetector

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
    this.activity = new TokenActivityAnalyzer(this.conn)
    this.deep = new TokenDeepAnalyzer(this.conn)
    this.patterns = new TokenPatternDetector(this.conn)
  }

  analyzeActivity(mint: string) {
    return this.activity.analyze(mint)
  }
  analyzeDepth(mint: string) {
    return this.deep.analyze(mint)
  }
  detectPatterns(mint: string, limit: number) {
    return this.patterns.detect(mint, limit)
  }
}

const service = new InsightApiService(RPC_ENDPOINT)

const app = express()
app.use(express.json())

/** Async wrapper **/
const wrap =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next)

/** Routes **/
app.post(
  "/activity",
  wrap(async (req, res) => {
    const { mint } = mintParamSchema.parse(req.body)
    const data = await service.analyzeActivity(mint)
    res.json({ success: true, data })
  })
)

app.post(
  "/depth",
  wrap(async (req, res) => {
    const { mint } = mintParamSchema.parse(req.body)
    const data = await service.analyzeDepth(mint)
    res.json({ success: true, data })
  })
)

app.post(
  "/patterns",
  wrap(async (req, res) => {
    const { mint, limit } = patternsSchema.parse(req.body)
    const data = await service.detectPatterns(mint, limit)
    res.json({ success: true, data })
  })
)

/** Health-check **/
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() })
})

/** Error handler **/
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ success: false, errors: err.errors })
  }
  console.error(err)
  res.status(500).json({ success: false, error: err.message || "Internal Server Error" })
})

/** Start & graceful shutdown **/
const server = app.listen(PORT, () => {
  console.log(`Insight API listening on port ${PORT}`)
})

process.on("SIGINT", () => {
  console.log("Shutting down…")
  server.close(() => process.exit(0))
})
