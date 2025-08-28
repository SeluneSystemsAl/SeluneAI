import express, { NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import helmet from "helmet"
import compression from "compression"
import cors from "cors"
import { z } from "zod"
import { CoreScannerService } from "./coreScannerService"

dotenv.config()

// -------- Env validation --------
const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/).default("3000"),
  SOLANA_RPC_ENDPOINT: z.string().url("SOLANA_RPC_ENDPOINT must be a valid URL"),
  CORS_ORIGIN: z.string().optional(),
})
const env = envSchema.parse(process.env)

// -------- App setup --------
const app = express()
app.set("trust proxy", 1)
app.use(helmet())
app.use(compression())
app.use(
  cors({
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((s) => s.trim()) : true,
    credentials: true,
  })
)
app.use(express.json({ limit: "1mb" }))

// -------- Request logger with deterministic id --------
let reqSeq = 0
app.use((req, _res, next) => {
  reqSeq += 1
  ;(req as any).reqId = `${Date.now().toString(36)}-${reqSeq.toString(36)}`
  console.info(
    JSON.stringify({
      level: "info",
      time: new Date().toISOString(),
      msg: "request",
      meta: { id: (req as any).reqId, method: req.method, url: req.originalUrl },
    })
  )
  next()
})

// -------- Validation schemas --------
const mintParamSchema = z.object({
  mint: z.string().min(32, "invalid mint").max(64, "invalid mint"),
})

const transfersQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || Number.isInteger(v), { message: "limit must be an integer" })
    .refine((v) => v === undefined || (v >= 1 && v <= 500), { message: "limit must be between 1 and 500" }),
})

// -------- Service --------
const service = new CoreScannerService(env.SOLANA_RPC_ENDPOINT)

// Helper: success envelope
function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data })
}

// Helper: async route wrapper
const asyncH =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next)

// -------- Routes --------
app.get(
  "/healthz",
  asyncH(async (_req, res) => ok(res, { status: "ok", time: new Date().toISOString() }))
)

app.get(
  "/holdings/:mint",
  asyncH(async (req, res) => {
    const { mint } = mintParamSchema.parse(req.params)
    const data = await service.scanHoldings(mint)
    return ok(res, data)
  })
)

app.get(
  "/transfers/:mint",
  asyncH(async (req, res) => {
    const { mint } = mintParamSchema.parse(req.params)
    const { limit } = transfersQuerySchema.parse(req.query)
    const data = await service.scanRecentTransfers(mint, limit ?? 50)
    return ok(res, data)
  })
)

app.get(
  "/risk/:mint",
  asyncH(async (req, res) => {
    const { mint } = mintParamSchema.parse(req.params)
    const data = await service.computeRisk(mint)
    return ok(res, data)
  })
)

// -------- 404 --------
app.use((_req, res) => res.status(404).json({ success: false, error: "Route not found" }))

// -------- Error handler --------
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const reqId = (req as any).reqId
  const payload =
    err instanceof z.ZodError
      ? { type: "validation", issues: err.issues }
      : err instanceof Error
      ? { type: "error", name: err.name, message: err.message, stack: err.stack }
      : { type: "unknown", message: String(err) }

  console.error(
    JSON.stringify({
      level: "error",
      time: new Date().toISOString(),
      msg: "unhandled_error",
      meta: { id: reqId, ...payload },
    })
  )

  const status = err instanceof z.ZodError ? 400 : 500
  res.status(status).json({ success: false, error: payload })
})

// -------- Server start and graceful shutdown --------
const port = parseInt(env.PORT, 10)
const server = app.listen(port, () => {
  console.log(JSON.stringify({ level: "info", time: new Date().toISOString(), msg: "listening", meta: { port } }))
})

const shutdown = (signal: string) => {
  console.log(JSON.stringify({ level: "info", time: new Date().toISOString(), msg: "shutdown_start", meta: { signal } }))
  server.close(() => {
    console.log(JSON.stringify({ level: "info", time: new Date().toISOString(), msg: "shutdown_complete" }))
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
