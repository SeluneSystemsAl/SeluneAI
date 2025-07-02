
import express from "express"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import { AnalyticTaskService } from "./analyticTaskService"

dotenv.config()
const app = express()
app.use(bodyParser.json())

const svc = new AnalyticTaskService(process.env.STORAGE_DIR || process.cwd())

app.get("/tasks", (req, res) => {
  res.json({ success: true, data: svc.list() })
})

app.post("/tasks", (req, res) => {
  const { name, params } = req.body
  if (!name) return res.status(400).json({ success: false, error: "name required" })
  const task = svc.create(name, params || {})
  res.status(201).json({ success: true, data: task })
})

app.delete("/tasks/:id", (req, res) => {
  const ok = svc.remove(req.params.id)
  return ok
    ? res.json({ success: true })
    : res.status(404).json({ success: false, error: "Not found" })
})

const port = parseInt(process.env.PORT || "3000")
app.listen(port, () => console.log(`AnalyticTask API listening on ${port}`))
