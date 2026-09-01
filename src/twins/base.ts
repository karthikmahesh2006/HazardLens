import { SimEvent, Twin, TwinContext, TwinState } from "../core/types.js";

export abstract class BaseTwin implements Twin {
  constructor(public readonly state: TwinState) {}
  abstract onEvent(event: SimEvent, context: TwinContext): void;
  abstract tick(dt: number, context: TwinContext): void;
  abstract clone(): Twin;

  protected distanceTo(other: Twin): number {
    const a = this.state.position, b = other.state.position;
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }
}
