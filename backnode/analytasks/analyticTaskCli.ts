
import readline from "readline"
import dotenv from "dotenv"
import { AnalyticTaskService } from "./analyticTaskService"

dotenv.config()
const svc = new AnalyticTaskService(process.env.STORAGE_DIR || process.cwd())
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function menu() {
  console.log(`
1) List tasks
2) Create task
3) Remove task
4) Exit
`)
  rl.question("Choose: ", handle)
}

async function handle(choice: string) {
  switch (choice.trim()) {
    case "1":
      console.table(svc.list())
      break
    case "2":
      rl.question("Task name: ", name => {
        rl.question("Params (JSON): ", json => {
          const params = JSON.parse(json || "{}")
          const task = svc.create(name.trim(), params)
          console.log("Created:", task)
          menu()
        })
      })
      return
    case "3":
      rl.question("Task ID to remove: ", id => {
        const ok = svc.remove(id.trim())
        console.log(ok ? "Removed" : "Not found")
      })
      break
    case "4":
      rl.close()
      return
    default:
      console.log("Invalid")
  }
  menu()
}

menu()
