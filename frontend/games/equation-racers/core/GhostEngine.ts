import { ReplayData, Vector2D } from "../types/GameTypes";

export class GhostEngine {
  private data: ReplayData;
  private reconstructedFrames: { time: number; position: Vector2D }[] = [];

  constructor(replayJson: string) {
    this.data = JSON.parse(replayJson);
    this.reconstruct();
  }

  private reconstruct(): void {
    const keyframes = this.data.keyframes;
    const deltas = this.data.deltas;
    if (keyframes.length === 0) return;

    let deltaIdx = 0;
    for (let k = 0; k < keyframes.length; k++) {
      const kf = keyframes[k];
      this.reconstructedFrames.push({
        time: kf.time,
        position: { x: kf.position.x, y: kf.position.y }
      });

      const nextKeyframeIndex = (k + 1 < keyframes.length) ? keyframes[k + 1].frameIndex : Infinity;
      let currentFrameIndex = kf.frameIndex + 1;
      
      let lastPos = { ...kf.position };
      let lastTime = kf.time;

      while (currentFrameIndex < nextKeyframeIndex && deltaIdx < deltas.length) {
        const delta = deltas[deltaIdx++];
        const frameTime = lastTime + delta.dTime;
        const framePos = {
          x: lastPos.x + delta.dPosition.x,
          y: lastPos.y + delta.dPosition.y
        };
        this.reconstructedFrames.push({
          time: frameTime,
          position: framePos
        });
        lastTime = frameTime;
        lastPos = framePos;
        currentFrameIndex++;
      }
    }
  }

  public getPositionAt(time: number): Vector2D | null {
    if (this.reconstructedFrames.length === 0) return null;
    if (time <= this.reconstructedFrames[0].time) {
      return { ...this.reconstructedFrames[0].position };
    }
    const lastFrame = this.reconstructedFrames[this.reconstructedFrames.length - 1];
    if (time >= lastFrame.time) {
      return { ...lastFrame.position };
    }

    let low = 0;
    let high = this.reconstructedFrames.length - 2;
    let idx = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.reconstructedFrames[mid].time <= time && this.reconstructedFrames[mid + 1].time >= time) {
        idx = mid;
        break;
      } else if (this.reconstructedFrames[mid].time < time) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const f0 = this.reconstructedFrames[idx];
    const f1 = this.reconstructedFrames[idx + 1];
    const dt = f1.time - f0.time;
    if (dt === 0) return { ...f0.position };
    const t = (time - f0.time) / dt;
    return {
      x: f0.position.x + (f1.position.x - f0.position.x) * t,
      y: f0.position.y + (f1.position.y - f0.position.y) * t
    };
  }

  public getReconstructedFramesCount(): number {
    return this.reconstructedFrames.length;
  }
}
