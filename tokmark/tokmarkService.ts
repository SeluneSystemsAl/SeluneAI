import { promises as fs } from "fs"
import path from "path"

export interface TokenBookmark {
  mint: string
  label: string
  addedAt: string
}

export interface TokMarkInit {
  storageDir?: string
  filename?: string
  validateMint?: boolean
}

export class TokMarkService {
  private readonly filePath: string
  private readonly validateMint: boolean
  private bookmarks: TokenBookmark[] = []
  private loaded = false

  constructor(storageDirOrInit: string | TokMarkInit = process.cwd(), filename = "tokmarks.json") {
    if (typeof storageDirOrInit === "string") {
      this.filePath = path.resolve(storageDirOrInit, filename)
      this.validateMint = true
    } else {
      const { storageDir = process.cwd(), filename: name = "tokmarks.json", validateMint = true } = storageDirOrInit
      this.filePath = path.resolve(storageDir, name)
      this.validateMint = validateMint
    }
  }

  /* ----------------------------------------
     filesystem helpers
  ---------------------------------------- */

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.filePath)
    await fs.mkdir(dir, { recursive: true })
  }

  private async writeFileAtomic(content: string): Promise<void> {
    // simple, deterministic atomic-like write via tmp + rename
    const temp = `${this.filePath}.tmp`
    await this.ensureDirectory()
    await fs.writeFile(temp, content, { encoding: "utf-8", mode: 0o600 })
    await fs.rename(temp, this.filePath)
  }

  private async load(): Promise<void> {
    if (this.loaded) return
    this.loaded = true
    try {
      const raw = await fs.readFile(this.filePath, "utf-8")
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.bookmarks = parsed
          .map(this.coerceBookmark)
          .filter((b): b is TokenBookmark => !!b)
      } else {
        this.bookmarks = []
      }
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        this.bookmarks = []
      } else {
        console.error(`Failed to load bookmarks from ${this.filePath}:`, err)
        this.bookmarks = []
      }
    }
  }

  private async save(): Promise<void> {
    try {
      const data = JSON.stringify(this.bookmarks, null, 2)
      await this.writeFileAtomic(data)
    } catch (err) {
      console.error(`Failed to save bookmarks to ${this.filePath}:`, err)
    }
  }

  /* ----------------------------------------
     validation / normalization
  ---------------------------------------- */

  private isValidMint(mint: string): boolean {
    if (!this.validateMint) return true
    // Solana base58 plausibility check, 32–44 chars, exclude 0 O I l
    return typeof mint === "string" &&
      mint.length >= 32 &&
      mint.length <= 44 &&
      /^[1-9A-HJ-NP-Za-km-z]+$/.test(mint)
  }

  private coerceBookmark = (v: any): TokenBookmark | null => {
    if (!v || typeof v !== "object") return null
    const mint = String(v.mint ?? "")
    const label = String(v.label ?? "")
    const addedAt = String(v.addedAt ?? "")
    if (!mint || !label) return null
    if (this.validateMint && !this.isValidMint(mint)) return null
    const dateOk = !Number.isNaN(Date.parse(addedAt))
    return {
      mint,
      label,
      addedAt: dateOk ? addedAt : new Date().toISOString(),
    }
  }

  /* ----------------------------------------
     public API
  ---------------------------------------- */

  /** Returns all bookmarks as a shallow copy */
  async list(): Promise<TokenBookmark[]> {
    await this.load()
    return [...this.bookmarks]
  }

  /** Returns bookmarks sorted by label (case-insensitive) */
  async listSorted(): Promise<TokenBookmark[]> {
    const all = await this.list()
    return all.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()))
  }

  /** Returns count of bookmarks */
  async count(): Promise<number> {
    await this.load()
    return this.bookmarks.length
  }

  /** Check if a mint exists */
  async exists(mint: string): Promise<boolean> {
    await this.load()
    return this.bookmarks.some(b => b.mint === mint)
  }

  /** Get a bookmark by mint */
  async get(mint: string): Promise<TokenBookmark | undefined> {
    await this.load()
    return this.bookmarks.find(b => b.mint === mint)
  }

  /**
   * Adds a new bookmark if not present, otherwise returns existing
   * Throws on invalid mint when validation is enabled
   */
  async add(mint: string, label: string): Promise<TokenBookmark> {
    await this.load()
    const m = mint.trim()
    const l = label.trim()
    if (!m || !l) throw new Error("mint and label are required")
    if (!this.isValidMint(m)) throw new Error("invalid mint format")

    const existing = this.bookmarks.find(b => b.mint === m)
    if (existing) return existing

    const bookmark: TokenBookmark = {
      mint: m,
      label: l,
      addedAt: new Date().toISOString(),
    }

    this.bookmarks.push(bookmark)
    await this.save()
    return bookmark
  }

  /**
   * Upsert behavior: update label when mint exists, otherwise insert new
   */
  async upsert(mint: string, label: string): Promise<TokenBookmark> {
    await this.load()
    const m = mint.trim()
    const l = label.trim()
    if (!m || !l) throw new Error("mint and label are required")
    if (!this.isValidMint(m)) throw new Error("invalid mint format")

    const idx = this.bookmarks.findIndex(b => b.mint === m)
    if (idx >= 0) {
      const updated: TokenBookmark = { ...this.bookmarks[idx], label: l }
      this.bookmarks[idx] = updated
      await this.save()
      return updated
    }
    return this.add(m, l)
  }

  /**
   * Rename a bookmark label by mint
   * Returns the updated bookmark or undefined if not found
   */
  async rename(mint: string, newLabel: string): Promise<TokenBookmark | undefined> {
    await this.load()
    const idx = this.bookmarks.findIndex(b => b.mint === mint)
    if (idx === -1) return undefined
    const updated: TokenBookmark = { ...this.bookmarks[idx], label: newLabel.trim() }
    this.bookmarks[idx] = updated
    await this.save()
    return updated
  }

  /**
   * Remove a bookmark by mint
   * Returns true if removed, false if not found
   */
  async remove(mint: string): Promise<boolean> {
    await this.load()
    const before = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter(b => b.mint !== mint)
    const removed = this.bookmarks.length < before
    if (removed) await this.save()
    return removed
  }

  /** Clears all bookmarks */
  async clear(): Promise<void> {
    await this.load()
    this.bookmarks = []
    await this.save()
  }

  /**
   * Search by substring on label or mint (case-insensitive)
   */
  async search(query: string): Promise<TokenBookmark[]> {
    await this.load()
    const q = query.trim().toLowerCase()
    if (!q) return []
    return this.bookmarks.filter(
      b =>
        b.mint.toLowerCase().includes(q) ||
        b.label.toLowerCase().includes(q)
    )
  }

  /**
   * Export bookmarks to JSON string
   */
  async exportJson(pretty = true): Promise<string> {
    await this.load()
    return JSON.stringify(this.bookmarks, null, pretty ? 2 : 0)
  }

  /**
   * Import bookmarks from JSON string
   * Merges with existing and deduplicates by mint
   */
  async importJson(json: string): Promise<{ added: number; updated: number; total: number }> {
    await this.load()
    let parsed: any
    try {
      parsed = JSON.parse(json)
    } catch {
      throw new Error("invalid JSON")
    }
    if (!Array.isArray(parsed)) throw new Error("expected array payload")

    let added = 0
    let updated = 0
    for (const item of parsed) {
      const b = this.coerceBookmark(item)
      if (!b) continue
      const idx = this.bookmarks.findIndex(x => x.mint === b.mint)
      if (idx >= 0) {
        // keep earliest addedAt, update label
        const prev = this.bookmarks[idx]
        const keepAt = new Date(prev.addedAt) <= new Date(b.addedAt) ? prev.addedAt : b.addedAt
        this.bookmarks[idx] = { ...prev, label: b.label, addedAt: keepAt }
        updated++
      } else {
        this.bookmarks.push(b)
        added++
      }
    }
    await this.save()
    return { added, updated, total: this.bookmarks.length }
  }
}
