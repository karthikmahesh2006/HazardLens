# HazardLens

**HazardLens** is an emergent industrial-disaster digital-twin platform for **DER-02: Threat-Zone Estimation & Counterfactual Decision Support for Industrial Fire and Explosion Response**.

The core idea is fundamentally different from a scripted animation: HazardLens models the **fundamental physics of industrial disasters**. Tanks, pipes, valves, pumps, deluge monitors, flare stacks, structures, weather, workers, and dynamic hazard fields are represented as independent digital twins communicating across an event fabric.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             HAZARDLENS PLATFORM                             │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ 1. Event-Driven Twin Bus      │ 2. Process Safety Physics Models            │
│ • Zero hardcoded scripts      │ • API RP 521 Radiant Thermal Radiation      │
│ • Deterministic state delta   │ • Sadovsky Peak Overpressure Blast Waves    │
│ • Event cascade guard limits  │ • BLEVE Boiling Liquid Explosions           │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 3. Counterfactual Engine      │ 4. Cyber-Industrial 3D Visualizer           │
│ • Side-by-side branch forks   │ • Dynamic Point-Light Fire & Shockwaves     │
│ • Loss-Avoided ROI ($M USD)   │ • Swirling Deluge Water Mist FX             │
│ • VCR Time-Scrubber Replay    │ • ERPG/ALOHA Threat Zone Heatmap Rings      │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 5. Emergency Planning Lab     │ 6. Decision Algorithms                      │
│ • Live risk scoring           │ • Dijkstra safest-route search              │
│ • Evacuation route analysis   │ • Hazard-weighted graph costs               │
│ • Intervention ranking        │ • Deterministic branch comparison          │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 🔬 Core Physics & Domino Consequence Equations

1. **Thermal Radiation Field (API RP 521 / SFPE)**:
   $$q(r) = \min\left(80, \frac{I_{\text{fire}} \cdot 120}{r^2}\right) \quad [\text{kW/m}^2]$$
2. **ERPG / ALOHA Threat Zone Perimeters**:
   - **Hot Zone**: $q \ge 10\text{ kW/m}^2$
   - **Warm Zone**: $q \ge 5\text{ kW/m}^2$
   - **Cold Zone**: $q \ge 1.6\text{ kW/m}^2$
3. **Sadovsky Overpressure Formulation (Shockwaves & BLEVE)**:
   $$Z = \frac{r}{\sqrt[3]{W_{\text{TNT}}}}, \quad \Delta P(Z) = \frac{100}{Z} + \frac{400}{Z^2} \quad [\text{kPa}]$$
4. **Threat-Repulsion Worker Evacuation Navigation**:
   $$\vec{V}_{\text{egress}} = \text{normalize}\left(\vec{V}_{\text{muster}} + \sum_{i} \frac{\vec{p}_{\text{worker}} - \vec{p}_{\text{fire}_i}}{\|\vec{p}_{\text{worker}} - \vec{p}_{\text{fire}_i}\|^2} \cdot \kappa\right)$$

---

## ⚡ Key Features

* **Side-by-Side Counterfactual Decision Engine**: Run a 45-second branch simulation comparing *Unmitigated Worst-Case* vs *Active Response* and calculate simulated direct loss avoided, asset damage, fire count and crew dose.
* **Emergency Planning Lab**: A dedicated decision-support dashboard at `/planner.html` with live risk scoring, safest evacuation routes and intervention ranking.
* **Hazard-Weighted Dijkstra Evacuation**: Graph edge costs increase around active fires, releases and failed equipment, so the safest route can differ from the shortest geometric route.
* **Intervention Optimizer**: Deterministically forks the current twin world for multiple candidate actions and ranks them by loss avoided, crew-dose reduction, asset protection and fire reduction.
* **Live Risk Assessment**: Combines active fires, releases, failed assets, worker thermal dose and local hazard intensity into a transparent 0–100 risk score with contributing factors.
* **VCR Time-Travel / Replay Slider**: Scrub backward and forward in time across a circular state buffer to inspect disaster progression frame-by-frame.
* **Animated Cyber-Gauges & Active Deluge Mist**: 3D visualization of equipment state, fire, shockwaves and suppression response.

> **Safety note:** HazardLens is an educational simulation and decision-support prototype. Its outputs are not validated for real-world emergency operations.

---

## 🚀 Quickstart

### 1. Install & Test
```bash
npm install
npm test
```

### 2. Start the 3D Interactive Visualizer
```bash
npm run viewer
```
Open `http://localhost:5173/` for the 3D twin.

### 3. Open the Emergency Planning Lab
With the viewer running, open:
```text
http://localhost:5173/planner.html
```

The lab lets you inject a leak/fire scenario, inspect the live risk score, calculate safest evacuation routes and compare candidate interventions.

### 4. Production Build
```bash
npm run build:all
```
