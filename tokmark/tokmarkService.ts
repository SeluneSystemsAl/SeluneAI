
import fs from "fs"
import path from "path"

export interface TokenBookmark {
  mint: string
  label: string
  addedAt: string
}

export class TokMarkService {
  private filePath: string
  private bookmarks: TokenBookmark[]

  constructor(storageDir: string = process.cwd()) {
    this.filePath = path.join(storageDir, "tokmarks.json")
    this.bookmarks = this.load()
  }

  private load(): TokenBookmark[] {
    if (!fs.existsSync(this.filePath)) {
      return []
    }
    try {
      const data = fs.readFileSync(this.filePath, "utf-8")
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.bookmarks, null, 2))
  }

  list(): TokenBookmark[] {
    return this.bookmarks
  }

  add(mint: string, label: string): TokenBookmark {
    const exists = this.bookmarks.find(b => b.mint === mint)
    if (exists) {
      return exists
    }
    const bookmark: TokenBookmark = {
      mint,
      label,
      addedAt: new Date().toISOString()
    }
    this.bookmarks.push(bookmark)
    this.save()
    return bookmark
  }

  remove(mint: string): boolean {
    const initial = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter(b => b.mint !== mint)
    const removed = this.bookmarks.length < initial
    if (removed) {
      this.save()
    }
    return removed
  }

  clear(): void {
    this.bookmarks = []
    this.save()
  }
}
