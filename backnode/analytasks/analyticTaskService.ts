
import fs from "fs"
import path from "path"

export interface AnalyticTask {
  id: string
  name: string
  params: Record<string, any>
  createdAt: number
}

export class AnalyticTaskService {
  private storeFile: string
  private tasks: AnalyticTask[]

  constructor(storageDir: string = process.cwd()) {
    this.storeFile = path.join(storageDir, "analyticTasks.json")
    this.tasks = this.load()
  }

  private load(): AnalyticTask[] {
    if (!fs.existsSync(this.storeFile)) return []
    try {
      return JSON.parse(fs.readFileSync(this.storeFile, "utf-8"))
    } catch {
      return []
    }
  }

  private save(): void {
    fs.writeFileSync(this.storeFile, JSON.stringify(this.tasks, null, 2))
  }

  list(): AnalyticTask[] {
    return this.tasks
  }

  create(name: string, params: Record<string, any> = {}): AnalyticTask {
    const task: AnalyticTask = {
      id: Date.now().toString(),
      name,
      params,
      createdAt: Date.now()
    }
    this.tasks.push(task)
    this.save()
    return task
  }

  remove(id: string): boolean {
    const before = this.tasks.length
    this.tasks = this.tasks.filter(t => t.id !== id)
    if (this.tasks.length < before) this.save()
    return this.tasks.length < before
  }
}
