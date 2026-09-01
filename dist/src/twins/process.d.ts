import { SimEvent, Twin, TwinContext, TwinState, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";
export declare class WeatherTwin extends BaseTwin {
    windX: number;
    windZ: number;
    constructor(id: string, windX?: number, windZ?: number);
    onEvent(): void;
    tick(): void;
    clone(): Twin;
}
export declare class PipeTwin extends BaseTwin {
    chemical: string;
    lengthM: number;
    diameterMm: number;
    leakRateKgS: number;
    failed: boolean;
    connectedValveId?: string;
    constructor(id: string, position: TwinState["position"], chemical?: string, lengthM?: number, diameterMm?: number);
    onEvent(event: SimEvent, context: TwinContext): void;
    private release;
    tick(): void;
    clone(): Twin;
}
export type TankGeometry = "sphere" | "bullet" | "vertical_storage";
export declare class TankTwin extends BaseTwin {
    chemical: string;
    tankGeometry: TankGeometry;
    capacityM3: number;
    heatDose: number;
    failed: boolean;
    pressureBar: number;
    constructor(id: string, position: TwinState["position"], chemical?: string, tankGeometry?: TankGeometry, capacityM3?: number);
    onEvent(event: SimEvent, context: TwinContext): void;
    tick(): void;
    clone(): Twin;
}
export declare class ValveTwin extends BaseTwin {
    valveType: "esdv" | "control" | "manual";
    connectedPipeId?: string | undefined;
    openFraction: number;
    failed: boolean;
    constructor(id: string, position: TwinState["position"], valveType?: "esdv" | "control" | "manual", connectedPipeId?: string | undefined);
    onEvent(event: SimEvent, context: TwinContext): void;
    tick(): void;
    clone(): Twin;
}
export declare class PumpTwin extends BaseTwin {
    pumpType: string;
    flowRateM3H: number;
    rpm: number;
    vibrationMmS: number;
    failed: boolean;
    constructor(id: string, position: TwinState["position"], pumpType?: string, flowRateM3H?: number);
    onEvent(event: SimEvent): void;
    tick(): void;
    clone(): Twin;
}
export declare class SuppressionTwin extends BaseTwin {
    coverageRadiusM: number;
    flowRateKgS: number;
    agent: string;
    isDeluging: boolean;
    constructor(id: string, position: TwinState["position"], coverageRadiusM?: number, flowRateKgS?: number, agent?: string);
    onEvent(event: SimEvent, context: TwinContext): void;
    tick(_dt: number, context: TwinContext): void;
    clone(): Twin;
}
export declare class WorkerTwin extends BaseTwin {
    role: string;
    musterPoint: Vec3;
    thermalDose: number;
    toxicDose: number;
    isEvacuating: boolean;
    targetPos: Vec3;
    evacuated: boolean;
    constructor(id: string, position: TwinState["position"], role?: string, musterPoint?: Vec3);
    onEvent(event: SimEvent): void;
    tick(dt: number, context: TwinContext): void;
    clone(): Twin;
}
export declare class FlareStackTwin extends BaseTwin {
    stackHeightM: number;
    pilotActive: boolean;
    flaringRateKgS: number;
    constructor(id: string, position: TwinState["position"], stackHeightM?: number, pilotActive?: boolean);
    onEvent(event: SimEvent, context: TwinContext): void;
    tick(): void;
    clone(): Twin;
}
export declare class IgnitionSourceTwin extends BaseTwin {
    enabled: boolean;
    constructor(id: string, position: TwinState["position"], enabled?: boolean);
    onEvent(): void;
    tick(): void;
    clone(): Twin;
}
export declare class WallTwin extends BaseTwin {
    widthM: number;
    heightM: number;
    constructor(id: string, position: TwinState["position"], widthM?: number, heightM?: number);
    onEvent(event: SimEvent): void;
    tick(): void;
    clone(): Twin;
}
