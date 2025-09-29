import dotenv from "dotenv"
import readline from "readline"
import process from "process"
import { TokenWatchService, TokenGroup, SuspiciousEvent } from "./tokenWatchService"

dotenv.config()

const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT

if (!SOLANA_RPC_ENDPOINT || typeof SOLANA_RPC_ENDPOINT !== "string") {
  console.error("Missing SOLANA_RPC_ENDPOINT in environment")
  process.exit(1)
}

const service = new TokenWatchService(SOLANA_RPC_ENDPOINT)

function createInterface() {
  return readline.createInterface({ input: process.stdin, output: process.stdout })
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer)))
}

function isValidSolAddress(addr: string): boolean {
  // basic Solana base58 plausibility: 32–44 chars, excludes 0 O I l
  return typeof addr === "string" &&
    addr.length >= 32 &&
    addr.length <= 44 &&
    /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "0"
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + "T"
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toLocaleString()
}

function printGroups(groups: TokenGroup[]) {
  if (!groups.length) {
    console.log("No token activity found")
    return
  }
  const sorted = [...groups].sort((a, b) => (b.totalReceived + b.totalSent) - (a.totalReceived + a.totalSent))
  console.log("\nToken Groups:")
  for (const g of sorted) {
    console.log(`- ${g.mint}: received ${formatNum(g.totalReceived)}, sent ${formatNum(g.totalSent)}`)
  }
  const totals = sorted.reduce(
    (acc, g) => {
      acc.recv += g.totalReceived
      acc.sent += g.totalSent
      return acc
    },
    { recv: 0, sent: 0 }
  )
  console.log(`\nTotals: received ${formatNum(totals.recv)}, sent ${formatNum(totals.sent)}`)
}

function printSuspicious(suspicious: SuspiciousEvent[]) {
  console.log("\nSuspicious Events:")
  if (!suspicious.length) {
    console.log("None detected")
    return
  }
  for (const e of suspicious) {
    console.log(`${e.signature}: ${e.direction} ${formatNum(e.amount)} of ${e.mint}`)
  }
}

async function main() {
  const rl = createInterface()
  try {
    const cliAddr = (process.argv[2] || "").trim()
    const answer = cliAddr || (await askQuestion(rl, "Enter wallet address: "))
    const address = answer.trim()

    if (!isValidSolAddress(address)) {
      console.error("Invalid wallet address format")
      process.exitCode = 2
      return
    }

    console.log("Analyzing token activity...")
    const { groups, suspicious } = await service.analyzeToken(address)

    printGroups(groups)
    printSuspicious(suspicious)
  } catch (e: any) {
    const msg = e?.message || String(e)
    console.error("Error:", msg)
    process.exitCode = 1
  } finally {
    rl.close()
  }
}

void main()
