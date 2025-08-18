export interface Frame {
  id: string
  payload: Record<string, any>
  timestamp: number
}

export class OutframeService {
  private store: Map<string, Frame[]> = new Map()

  /**
   * Adds a new frame to the internal store
   */
  addFrame(id: string, payload: Record<string, any>): Frame {
    if (!id.trim()) throw new Error("Frame ID must not be empty")

    const frame: Frame = {
      id,
      payload: { ...payload },
      timestamp: Date.now(),
    }

    const existing = this.store.get(id) ?? []
    this.store.set(id, [...existing, frame])
    return { ...frame }
  }

  /**
   * Retrieves the latest N frames for a given ID
   */
  getLatest(id: string, count: number = 1): Frame[] {
    if (!this.store.has(id)) return []
    const frames = this.store.get(id)!
    return [...frames]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
      .map(f => ({ ...f }))
  }

  /**
   * Clears frames by ID or all if no ID provided
   */
  clear(id?: string): void {
    if (id) {
      this.store.delete(id)
    } else {
      this.store.clear()
    }
  }
}
