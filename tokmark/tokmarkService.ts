import { promises as fs } from "fs"
import path from "path"

export interface TokenBookmark {
  mint: string
  label: string
  addedAt: string
}

export class TokMarkService {
  private readonly filePath: string
  private bookmarks: TokenBookmark[] = []
  private loaded = false

  constructor(storageDir: string = process.cwd(), filename: string = "tokmarks.json") {
    this.filePath = path.resolve(storageDir, filename)
  }

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.filePath)
    await fs.mkdir(dir, { recursive: true })
  }

  private async load(): Promise<void> {
    if (this.loaded) return
    this.loaded = true

    try {
      const raw = await fs.readFile(this.filePath, "utf-8")
      this.bookmarks = JSON.parse(raw) as TokenBookmark[]
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.bookmarks = []
      } else {
        console.error(`Failed to load bookmarks from ${this.filePath}:`, err)
        this.bookmarks = []
      }
    }
  }

  private async save(): Promise<void> {
    try {
      await this.ensureDirectory()
      const data = JSON.stringify(this.bookmarks, null, 2)
      await fs.writeFile(this.filePath, data, "utf-8")
    } catch (err) {
      console.error(`Failed to save bookmarks to ${this.filePath}:`, err)
    }
  }

  /** Returns all bookmarks */
  async list(): Promise<TokenBookmark[]> {
    await this.load()
    return [...this.bookmarks]
  }

  /**
   * Adds a new bookmark (if not exists) and returns it.
   * @returns the existing or newly added bookmark
   */
  async add(mint: string, label: string): Promise<TokenBookmark> {
    await this.load()
    const existing = this.bookmarks.find(b => b.mint === mint)
    if (existing) {
      return existing
    }

    const bookmark: TokenBookmark = {
      mint,
      label,
      addedAt: new Date().toISOString(),
    }

    this.bookmarks.push(bookmark)
    await this.save()
    return bookmark
  }

  /**
   * Removes a bookmark by mint.
   * @returns true if removed, false if not found
   */
  async remove(mint: string): Promise<boolean> {
    await this.load()
    const beforeCount = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter(b => b.mint !== mint)
    const removed = this.bookmarks.length < beforeCount
    if (removed) {
      await this.save()
    }
    return removed
  }

  /** Clears all bookmarks */
  async clear(): Promise<void> {
    this.bookmarks = []
    await this.save()
  }

  /**
   * Finds bookmarks whose label or mint contains the query substring
   */
  async search(query: string): Promise<TokenBookmark[]> {
    await this.load()
    const q = query.trim().toLowerCase()
    return this.bookmarks.filter(
      b =>
        b.mint.toLowerCase().includes(q) ||
        b.label.toLowerCase().includes(q)
    )
  }
}
