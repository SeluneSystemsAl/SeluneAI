import readline from "readline/promises"
import { stdin, stdout } from "process"
import { OutframeService } from "./outframeService"

const service = new OutframeService()
const rl = readline.createInterface({ input: stdin, output: stdout })

async function main() {
  while (true) {
    console.log(`
1) Add frame
2) Get latest
3) Clear frames
4) Exit
`)
    const choice = (await rl.question("Select: ")).trim()
    try {
      switch (choice) {
        case "1": {
          const id = (await rl.question("Frame ID: ")).trim()
          const json = await rl.question("Payload (JSON): ")
          let payload
          try {
            payload = JSON.parse(json)
          } catch {
            console.log("Invalid JSON payload")
            break
          }
          const frame = service.addFrame(id, payload)
          console.log("Added:", frame)
          break
        }
        case "2": {
          const id = (await rl.question("Frame ID: ")).trim()
          const cntInput = await rl.question("Count: ")
          const count = Number.parseInt(cntInput, 10)
          if (Number.isNaN(count) || count < 1) {
            console.log("Invalid count, must be a positive integer")
            break
          }
          const frames = service.getLatest(id, count)
          console.log("Latest frames:", frames)
          break
        }
        case "3": {
          const idInput = (await rl.question("Clear specific ID? (blank = all): ")).trim()
          service.clear(idInput || undefined)
          console.log(idInput ? `Cleared frames for "${idInput}"` : "Cleared all frames")
          break
        }
        case "4":
          console.log("Exiting.")
          await rl.close()
          return
        default:
          console.log(`Unknown option: "${choice}"`)
      }
    } catch (err: any) {
      console.error("Error:", err.message)
    }
  }
}

main().catch(err => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
