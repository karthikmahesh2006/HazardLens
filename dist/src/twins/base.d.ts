import { SimEvent, Twin, TwinContext, TwinState, TwinMetadata, BehaviorModel } from "../core/types.js";
export declare abstract class BaseTwin implements Twin {
    readonly state: TwinState;
    readonly metadata: TwinMetadata;
    readonly behavior?: BehaviorModel;
    constructor(state: TwinState, metadata?: TwinMetadata, behavior?: BehaviorModel);
    protected record(event: SimEvent, summary: string): void;
    abstract onEvent(event: SimEvent, context: TwinContext): void;
    tick(dt: number, context: TwinContext): void;
    abstract clone(): Twin;
    protected distanceTo(other: Twin): number;
}
