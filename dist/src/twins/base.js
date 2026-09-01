export class BaseTwin {
    state;
    metadata;
    behavior;
    constructor(state, metadata = {}, behavior) {
        this.state = state;
        this.metadata = {
            physicalProfile: metadata.physicalProfile,
            relationships: metadata.relationships ?? [],
            history: metadata.history ?? [],
        };
        this.behavior = behavior;
    }
    record(event, summary) {
        this.metadata.history?.push({
            time: event.time,
            eventType: event.type,
            summary,
        });
    }
    tick(dt, context) {
        this.behavior?.update(this.state, dt, context);
    }
    distanceTo(other) {
        const a = this.state.position, b = other.state.position;
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
}
