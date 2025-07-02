export interface Frame {
  id: string
  payload: Record<string, any>
  timestamp: number
}

export class OutframeService {
  private frames: Frame[] = []

  addFrame(id: string, payload: Record<string, any>): Frame {
    const frame: Frame = { id, payload, timestamp: Date.now() }
    this.frames.push(frame)
    return frame
  }

  getLatest(id: string, count = 1): Frame[] {
    return this.frames
      .filter(f => f.id === id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
  }

  clear(id?: string): void {
    if (id) {
      this.frames = this.frames.filter(f => f.id !== id)
    } else {
      this.frames = []
    }
  }
}
