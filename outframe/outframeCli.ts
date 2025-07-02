import readline from "readline"
import { OutframeService } from "./outframeService"

const service = new OutframeService()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function menu() {
  console.log(`
1) Add frame
2) Get latest
3) Clear frames
4) Exit
`)
  rl.question("Select: ", handle)
}

async function handle(choice: string) {
  switch (choice.trim()) {
    case "1":
      rl.question("Frame ID: ", id => {
        rl.question("Payload (JSON): ", json => {
          try {
            const payload = JSON.parse(json)
            const frame = service.addFrame(id.trim(), payload)
            console.log("Added:", frame)
          } catch {
            console.log("Invalid JSON")
          }
          menu()
        })
      })
      break
    case "2":
      rl.question("Frame ID: ", id => {
        rl.question("Count: ", cnt => {
          const n = parseInt(cnt) || 1
          const frames = service.getLatest(id.trim(), n)
          console.log("Latest frames:", frames)
          menu()
        })
      })
      break
    case "3":
      rl.question("Clear specific ID? (leave blank to clear all): ", id => {
        service.clear(id.trim() || undefined)
        console.log("Cleared")
        menu()
      })
      break
    case "4":
      rl.close()
      break
    default:
      console.log("Invalid choice")
      menu()
  }
}

menu()
