import readline from "readline"
import dotenv from "dotenv"
import { AnalyticTaskService } from "./analyticTaskService"

dotenv.config()
const svc = new AnalyticTaskService(process.env.STORAGE_DIR || process.cwd())
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function menu() {
  console.log(`
==============================
   Analytic Task CLI
==============================
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
          let params: Record<string, any> = {}
          try {
            params = json ? JSON.parse(json) : {}
          } catch (err) {
            console.error("Invalid JSON, using empty object.")
          }
          const task = svc.create(name.trim(), params)
          console.log("Created:", task)
          menu()
        })
      })
      return // skip auto-menu

    case "3":
      rl.question("Task ID to remove: ", id => {
        const ok = svc.remove(id.trim())
        console.log(ok ? "Removed" : "Not found")
        menu()
      })
      return // skip auto-menu

    case "4":
      console.log("Goodbye!")
      rl.close()
      process.exit(0)

    default:
      console.log("Invalid choice")
  }
  menu()
}

menu()
