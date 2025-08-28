import express, { NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import helmet from "helmet"
import compression from "compression"
import cors from "cors"
import { z } from "zod"
import { AnalyticTaskService } from "./analyticTaskService"

dotenv.config()

// ----- Config -----
const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/).default("3000"),
  STORAGE_DIR: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
})
const env = envSchema.parse(process.env)

const app = express()
app.set("trust proxy", 1)

// ----- Middleware -----
app.use(helmet())
app.use(compression())
app.use(
  cors({
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((s) => s.trim()) : true,
    credentials: true,
  })
)
app.use(express.json({ limit: "1mb" }))

// Simple request logger with deterministic request id
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

// ----- Validation Schemas -----
const createTaskSchema = z.object({
  name: z.string().min(1, "name required"),
  params: z.record(z.any()).default({}),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

// ----- Service -----
const svc = new AnalyticTaskService(env.STORAGE_DIR || process.cwd())

// Helper for consistent success responses
function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data })
}

// Helper for async route handlers
const asyncH =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next)

// ----- Routes -----
app.get(
  "/healthz",
  asyncH(async (_req, res) => {
    return ok(res, { status: "ok", time: new Date().toISOString() })
  })
)

app.get(
  "/tasks",
  asyncH(async (_req, res) => {
    const data = svc.list()
    return ok(res, data)
  })
)

app.post(
  "/tasks",
  asyncH(async (req, res) => {
    const { name, params } = createTaskSchema.parse(req.body)
    const task = svc.create(name, params)
    return ok(res, task, 201)
  })
)

app.delete(
  "/tasks/:id",
  asyncH(async (req, res) => {
    const { id } = idParamSchema.parse(req.params)
    const removed = svc.remove(id)
    if (!removed) {
      return res.status(404).json({ success: false, error: "Not found" })
    }
    return ok(res, { id })
  })
)

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" })
})

// Error handler
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

// ----- Server start / graceful shutdown -----
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
  // Force-exit safety after 10s
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
