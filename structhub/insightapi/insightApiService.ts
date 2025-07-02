import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { Connection, PublicKey, ParsedAccountData, ConfirmedSignatureInfo, ParsedConfirmedTransaction, ParsedInstruction } from '@solana/web3.js'

dotenv.config()

type ActivityPoint = { timestamp: number; transfers: number }
type DeepMetrics = { holderCount: number; totalSupply: number; avgBalance: number; activeHolders: number }
type PatternAlert = { signature: string; pattern: string; slot: number }

class TokenActivityAnalyzer {
  constructor(private connection: Connection) {}

  async analyze(mint: string): Promise<ActivityPoint[]> {
    const key = new PublicKey(mint)
    const now = Date.now() / 1000
    const dayAgo = now - 24 * 3600
    const sigs = await this.connection.getSignaturesForAddress(key, { limit: 1000 })
    const buckets: Record<number, number> = {}
    for (const s of sigs) {
      if (!s.blockTime || s.blockTime < dayAgo) continue
      const hour = Math.floor((s.blockTime - dayAgo) / 3600)
      buckets[hour] = (buckets[hour] || 0) + 1
    }
    return Array.from({ length: 24 }, (_, h) => ({ timestamp: (dayAgo + h * 3600) * 1000, transfers: buckets[h] || 0 }))
  }
}

class TokenDeepAnalyzer {
  constructor(private connection: Connection) {}

  async analyze(mint: string): Promise<DeepMetrics> {
    const key = new PublicKey(mint)
    const resp = await this.connection.getParsedTokenAccountsByOwner(key, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    })
    const balances = resp.value.map(acc => {
      const info = (acc.account.data as ParsedAccountData).parsed.info.tokenAmount
      return Number(info.uiAmount)
    })
    const totalSupply = balances.reduce((a, b) => a + b, 0)
    const holderCount = balances.length
    const avgBalance = holderCount ? totalSupply / holderCount : 0
    const activeHolders = balances.filter(b => b > 0).length
    return { holderCount, totalSupply, avgBalance, activeHolders }
  }
}

class TokenPatternDetector {
  constructor(private connection: Connection) {}

  async detect(mint: string, limit = 100): Promise<PatternAlert[]> {
    const key = new PublicKey(mint)
    const sigs = await this.connection.getSignaturesForAddress(key, { limit })
    const alerts: PatternAlert[] = []
    for (const info of sigs) {
      const tx = await this.connection.getParsedConfirmedTransaction(info.signature)
      if (!tx) continue
      const sig = info.signature, slot = tx.slot
      for (const instr of tx.transaction.message.instructions as ParsedInstruction[]) {
        const parsed = (instr as any).parsed
        if (instr.program === 'spl-token' && parsed.type === 'transfer' && Number(parsed.info.amount) > 1_000_000) {
          alerts.push({ signature: sig, pattern: 'large-transfer', slot })
        }
        if (instr.program === 'spl-token-swap') {
          alerts.push({ signature: sig, pattern: 'swap-event', slot })
        }
      }
    }
    return alerts
  }
}

class InsightApiService {
  private activity: TokenActivityAnalyzer
  private deep: TokenDeepAnalyzer
  private patterns: TokenPatternDetector

  constructor(rpcUrl: string) {
    const conn = new Connection(rpcUrl, 'confirmed')
    this.activity = new TokenActivityAnalyzer(conn)
    this.deep = new TokenDeepAnalyzer(conn)
    this.patterns = new TokenPatternDetector(conn)
  }

  analyzeActivity(mint: string) { return this.activity.analyze(mint) }
  analyzeDepth(mint: string) { return this.deep.analyze(mint) }
  detectPatterns(mint: string, limit?: number) { return this.patterns.detect(mint, limit) }
}

const app = express()
app.use(bodyParser.json())

const service = new InsightApiService(process.env.SOLANA_RPC_ENDPOINT!)

app.post('/activity', async (req, res) => {
  const { mint } = req.body
  try {
    const data = await service.analyzeActivity(mint)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.post('/depth', async (req, res) => {
  const { mint } = req.body
  try {
    const data = await service.analyzeDepth(mint)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.post('/patterns', async (req, res) => {
  const { mint, limit } = req.body
  try {
    const data = await service.detectPatterns(mint, limit)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

const port = parseInt(process.env.PORT || '3000')
app.listen(port, () => console.log(`Insight API listening on port ${port}`))
